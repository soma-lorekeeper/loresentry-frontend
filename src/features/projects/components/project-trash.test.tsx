import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectTrash } from "./project-trash";

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe("ProjectTrash", () => {
  it("marks trash navigation current and presents sorted, non-navigable metadata", () => {
    render(<ProjectTrash />);

    expect(
      screen.getByRole("link", { name: "프로젝트 휴지통" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "프로젝트 목록" }),
    ).not.toHaveAttribute("aria-current");
    const rows = screen.getAllByRole("article");
    expect(rows[0]).toHaveTextContent("종이 달 아래의 약속");
    expect(rows[0]).toHaveTextContent("휴지통으로 이동:");
    expect(rows[0]).toHaveTextContent("보관 중");
    expect(rows[0].querySelector("a")).toBeNull();
  });

  it("keeps empty, loading, and error states mutually exclusive", () => {
    const emptyView = render(
      <ProjectTrash initialItems={[]} initialListStatus="empty" />,
    );
    expect(screen.getByText("휴지통이 비어 있어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "프로젝트 목록으로 돌아가기" }),
    ).toHaveAttribute("href", "/projects");

    emptyView.unmount();
    const loadingView = render(<ProjectTrash initialListStatus="loading" />);
    expect(screen.getByText("휴지통을 불러오는 중입니다.")).toBeInTheDocument();
    expect(screen.queryByText("휴지통이 비어 있어요")).not.toBeInTheDocument();

    loadingView.unmount();
    render(<ProjectTrash initialListStatus="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "휴지통을 불러오지 못했어요.다시 시도해 주세요.",
    );
    expect(screen.queryByText("연결")).not.toBeInTheDocument();
  });

  it("retries the backend query without inventing a successful result", async () => {
    const user = userEvent.setup();
    const loadTrashedProjects = vi
      .fn<() => Promise<never[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    render(<ProjectTrash loadTrashedProjects={loadTrashedProjects} />);

    expect(await screen.findByRole("alert")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("휴지통이 비어 있어요")).toBeVisible();
    expect(loadTrashedProjects).toHaveBeenCalledTimes(2);
  });

  it("uses the same semantic structure for the light representative", () => {
    const view = render(<ProjectTrash theme="dark" />);
    const darkRoles = screen
      .getAllByRole("article")
      .map((row) => row.textContent);

    view.rerender(<ProjectTrash theme="light" />);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(
      screen.getAllByRole("article").map((row) => row.textContent),
    ).toEqual(darkRoles);
  });

  it("locks only the target row while restoring and prevents duplicate requests", async () => {
    const user = userEvent.setup();
    let resolveRestore: (() => void) | undefined;
    const restoreProject = vi.fn(
      () => new Promise<void>((resolve) => (resolveRestore = resolve)),
    );
    render(<ProjectTrash restoreProject={restoreProject} />);

    const rows = screen.getAllByRole("article");
    await user.click(within(rows[0]).getByRole("button", { name: "복원" }));
    expect(
      within(rows[0]).getByRole("button", { name: "복원 중…" }),
    ).toBeDisabled();
    expect(
      within(rows[0]).getByRole("button", { name: "영구 삭제" }),
    ).toBeDisabled();
    expect(within(rows[1]).getByRole("button", { name: "복원" })).toBeEnabled();
    await user.click(within(rows[0]).getByRole("button", { name: "복원 중…" }));
    expect(restoreProject).toHaveBeenCalledOnce();

    await user.click(within(rows[1]).getByRole("button", { name: "복원" }));
    expect(restoreProject).toHaveBeenCalledTimes(2);

    resolveRestore?.();
    expect(await screen.findByText("프로젝트를 복원했어요.")).toBeVisible();
  });

  it("retries restore on the same row after a backend failure", async () => {
    const user = userEvent.setup();
    const restoreProject = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(undefined);
    render(<ProjectTrash restoreProject={restoreProject} />);

    const target = screen.getAllByRole("article")[0];
    await user.click(within(target).getByRole("button", { name: "복원" }));
    expect(await within(target).findByRole("alert")).toHaveTextContent(
      "프로젝트를 복원하지 못했어요. 다시 시도해 주세요.",
    );
    const retry = within(target).getByRole("button", { name: "다시 시도" });
    expect(retry).toHaveFocus();
    await user.click(retry);
    expect(await screen.findByText("프로젝트를 복원했어요.")).toBeVisible();
    expect(restoreProject).toHaveBeenCalledTimes(2);
  });

  it("removes a restored project, reports it, and focuses the next row", async () => {
    const user = userEvent.setup();
    const onRestored = vi.fn();
    render(
      <ProjectTrash
        onRestored={onRestored}
        restoreProject={vi.fn().mockResolvedValue(undefined)}
      />,
    );

    await user.click(screen.getAllByRole("button", { name: "복원" })[0]);
    expect(
      screen.queryByRole("article", { name: /종이 달 아래의 약속/ }),
    ).not.toBeInTheDocument();
    expect(onRestored).toHaveBeenCalledWith(
      expect.objectContaining({ id: "paper-moon" }),
    );
    await waitFor(() =>
      expect(screen.getAllByRole("button", { name: "복원" })[0]).toHaveFocus(),
    );
    expect(
      screen.getByRole("link", { name: "프로젝트 목록에서 보기" }),
    ).toHaveAttribute("href", "/projects");
  });
});
