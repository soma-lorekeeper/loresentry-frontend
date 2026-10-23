import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useEffect } from "react";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { createLayout } from "./model/layout";
import { useWorkspace, WorkspaceProvider } from "./workspace-context";

const fileId = "glass-garden:ch-12";
const tabId = `file:${fileId}`;

function Probe({ save }: { save: () => Promise<boolean> }) {
  const { registerTabActions, closeTab, layout } = useWorkspace();
  useEffect(
    () => registerTabActions("pane-1", tabId, { save }),
    [registerTabActions, save],
  );
  return (
    <>
      <button onClick={() => closeTab("pane-1", tabId)}>문서 닫기</button>
      <output aria-label="문서 열림">
        {String(
          layout.panes.some((pane) =>
            pane.tabs.some((tab) => tab.id === tabId),
          ),
        )}
      </output>
    </>
  );
}

function renderClosing(save: () => Promise<boolean>) {
  renderWithServices(
    <WorkspaceProvider
      project={getDb().projects.find(
        (project) => project.id === GLASS_GARDEN_ID,
      )!}
      user={{
        id: "user-1",
        displayName: "작가",
        email: "qa@example.test",
        onboardingCompleted: true,
      }}
      initialLayout={createLayout({ kind: "file", fileId })}
    >
      <Probe save={save} />
    </WorkspaceProvider>,
  );
}

describe("closing document tabs", () => {
  it("keeps the document mounted until saving succeeds and ignores repeated closes", async () => {
    const actor = userEvent.setup();
    let finish!: (saved: boolean) => void;
    const save = vi.fn(
      () =>
        new Promise<boolean>((resolve) => {
          finish = resolve;
        }),
    );
    renderClosing(save);
    await actor.click(screen.getByRole("button", { name: "문서 닫기" }));
    await actor.click(screen.getByRole("button", { name: "문서 닫기" }));
    expect(screen.getByLabelText("문서 열림")).toHaveTextContent("true");
    expect(save).toHaveBeenCalledOnce();
    await act(async () => finish(true));
    await waitFor(() =>
      expect(screen.getByLabelText("문서 열림")).toHaveTextContent("false"),
    );
  });

  it("keeps a failed draft open and allows closing after a successful retry", async () => {
    const actor = userEvent.setup();
    const save = vi
      .fn()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    renderClosing(save);
    await actor.click(screen.getByRole("button", { name: "문서 닫기" }));
    expect(screen.getByLabelText("문서 열림")).toHaveTextContent("true");
    expect(
      await screen.findByText(
        "쓰던 글이 아직 저장되지 않아 탭을 닫지 않았어요.",
      ),
    ).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "문서 닫기" }));
    await waitFor(() =>
      expect(screen.getByLabelText("문서 열림")).toHaveTextContent("false"),
    );
  });
});
