import { act, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ProjectSettings } from "./project-settings";

type SaveSettings = NonNullable<
  React.ComponentProps<typeof ProjectSettings>["saveSettings"]
>;

function deferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
}

function renderSettings(saveSettings?: SaveSettings) {
  return render(
    <ProjectSettings
      projectId="glass-garden"
      projectName="유리 정원의 기록"
      saveSettings={saveSettings}
    />,
  );
}

describe("ProjectSettings", () => {
  it("edits, saves once, and announces the saving and saved states", async () => {
    const user = userEvent.setup();
    const request = deferred<void>();
    const saveSettings = vi.fn(() => request.promise);
    renderSettings(saveSettings);

    const description = screen.getByLabelText("프로젝트 설명");
    await user.clear(description);
    await user.type(description, "새 프로젝트 설명");
    expect(screen.getByRole("status")).toHaveTextContent(
      "저장되지 않은 변경사항",
    );

    const saveButton = screen.getByRole("button", { name: "변경사항 저장" });
    await user.click(saveButton);
    await user.click(saveButton);

    expect(saveSettings).toHaveBeenCalledTimes(1);
    expect(saveSettings).toHaveBeenCalledWith({
      description: "새 프로젝트 설명",
      name: "유리 정원의 기록",
      projectId: "glass-garden",
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "설정을 저장하고 있습니다",
    );
    expect(description).toBeDisabled();

    await act(async () => request.resolve());
    expect(screen.getByRole("status")).toHaveTextContent("저장됨");
    expect(
      screen.getByRole("button", { name: "변경사항 저장" }),
    ).toBeDisabled();
  });

  it("preserves failed values and retries through the backend adapter", async () => {
    const user = userEvent.setup();
    const saveSettings = vi
      .fn<SaveSettings>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce(undefined);
    renderSettings(saveSettings);

    const name = screen.getByLabelText("프로젝트 이름");
    await user.clear(name);
    await user.type(name, "바뀐 프로젝트");
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "설정을 저장하지 못했습니다",
    );
    expect(name).toHaveValue("바뀐 프로젝트");

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(saveSettings).toHaveBeenCalledTimes(2);
    expect(await screen.findByRole("status")).toHaveTextContent("저장됨");
  });

  it("shows a textual validation error for an empty required name", async () => {
    const user = userEvent.setup();
    const saveSettings = vi.fn().mockResolvedValue(undefined);
    renderSettings(saveSettings);

    const name = screen.getByLabelText("프로젝트 이름");
    await user.clear(name);
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));

    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(
      screen.getByText("프로젝트 이름을 입력해 주세요."),
    ).toBeInTheDocument();
    expect(saveSettings).not.toHaveBeenCalled();
  });

  it("does not pretend to save when no backend adapter is connected", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.type(screen.getByLabelText("프로젝트 설명"), " 추가");
    await user.click(screen.getByRole("button", { name: "변경사항 저장" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "설정을 저장하지 못했습니다",
    );
    expect(screen.queryByText("저장됨")).not.toBeInTheDocument();
  });

  it("keeps edits on cancel and discards them only after confirmation", async () => {
    const user = userEvent.setup();
    renderSettings();

    const description = screen.getByLabelText("프로젝트 설명");
    await user.clear(description);
    await user.type(description, "버리지 않은 설명");
    await user.click(screen.getByRole("button", { name: "취소" }));

    const dialog = screen.getByRole("dialog", {
      name: "변경사항을 저장하지 않고 나갈까요?",
    });
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "계속 편집" })).toHaveFocus(),
    );
    await user.click(screen.getByRole("button", { name: "계속 편집" }));
    expect(dialog).not.toBeVisible();
    expect(description).toHaveValue("버리지 않은 설명");

    await user.click(screen.getByRole("button", { name: "취소" }));
    await user.click(screen.getByRole("button", { name: "변경사항 버리기" }));
    expect(description).toHaveValue(
      "유리 정원을 둘러싼 인물과 사건을 기록합니다.",
    );
  });

  it("blocks duplicate trash moves and closes only after backend success", async () => {
    const user = userEvent.setup();
    const request = deferred<void>();
    const moveProjectToTrash = vi.fn(() => request.promise);
    const onProjectMovedToTrash = vi.fn();
    render(
      <ProjectSettings
        moveProjectToTrash={moveProjectToTrash}
        onProjectMovedToTrash={onProjectMovedToTrash}
        projectId="glass-garden"
        projectName="유리 정원의 기록"
      />,
    );

    const moveTrigger = screen.getByRole("button", { name: "이동" });
    await user.click(moveTrigger);
    const dialog = screen.getByRole("dialog", {
      name: "프로젝트를 휴지통으로 이동할까요?",
    });
    await waitFor(() =>
      expect(
        within(dialog).getByRole("button", { name: "취소" }),
      ).toHaveFocus(),
    );
    await user.click(
      within(dialog).getByRole("button", { name: "휴지통으로 이동" }),
    );
    await user.keyboard("{Escape}");

    expect(moveProjectToTrash).toHaveBeenCalledTimes(1);
    expect(
      screen.getByRole("dialog", {
        name: "프로젝트를 휴지통으로 이동할까요?",
      }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "이동 중…" })).toBeDisabled();

    await act(async () => request.resolve());
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", {
          name: "프로젝트를 휴지통으로 이동할까요?",
        }),
      ).not.toBeInTheDocument(),
    );
    expect(onProjectMovedToTrash).toHaveBeenCalledWith("glass-garden");
  });

  it("keeps the project when the trash backend adapter is unavailable", async () => {
    const user = userEvent.setup();
    renderSettings();

    await user.click(screen.getByRole("button", { name: "이동" }));
    await user.click(screen.getByRole("button", { name: "휴지통으로 이동" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "프로젝트를 이동하지 못했습니다",
    );
    expect(
      screen.getByRole("dialog", {
        name: "프로젝트를 휴지통으로 이동할까요?",
      }),
    ).toBeVisible();
  });
});
