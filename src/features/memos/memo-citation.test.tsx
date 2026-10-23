import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { expect, it } from "vitest";

import { createLayout } from "@/features/workspace/model/layout";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/features/workspace/workspace-context";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { MemoView } from "./memo-view";

function Targets() {
  const { openMemo } = useWorkspace();
  return (
    <>
      {["project", "file"].map((scope) => {
        const m = getDb().memos.find(
          (m) => m.projectId === GLASS_GARDEN_ID && m.scope === scope,
        )!;
        return (
          <button key={scope} onClick={() => openMemo(m.id)}>
            {scope} 인용 열기
          </button>
        );
      })}
      <MemoView paneId="pane-1" />
    </>
  );
}
function Harness() {
  const db = getDb();
  return (
    <WorkspaceProvider
      project={db.projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={db.user}
      initialLayout={createLayout({ kind: "memo" })}
    >
      <Targets />
    </WorkspaceProvider>
  );
}

it("opens the cited note's scope and focuses that exact card on repeated citation navigation", async () => {
  const actor = userEvent.setup();
  const rendered = renderWithServices(<Harness />);
  for (const scope of ["project", "file", "project"]) {
    const memo = getDb().memos.find(
      (m) => m.projectId === GLASS_GARDEN_ID && m.scope === scope,
    )!;
    await actor.click(
      screen.getByRole("button", { name: scope + " 인용 열기" }),
    );
    await waitFor(() =>
      expect(
        rendered.container.querySelector(`[data-memo-id="${memo.id}"]`),
      ).toHaveFocus(),
    );
    expect(
      screen.getByRole("radio", {
        name: scope === "project" ? "작품 메모" : "문서 메모",
      }),
    ).toBeChecked();
  }
});
