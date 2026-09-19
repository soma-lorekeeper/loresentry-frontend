import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import type { RefreshRun } from "@/domain/models";
import { renderWithServices, routerMock } from "@/test/render";
import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";

import { GraphDiffModal } from "./graph-diff-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = { id: "user-1", displayName: "서윤주", email: "seoyunju@lore.kr" };

describe("GraphDiffModal", () => {
  it("enables confirmation only after every document is resolved", async () => {
    const actor = userEvent.setup();
    const draft = (bodyMd: string) => ({
      title: "하린",
      bodyMd,
      properties: [],
    });
    const run: RefreshRun = {
      id: "run-test",
      projectId: GLASS_GARDEN_ID,
      status: "READY",
      startedAt: null,
      sourceFileIds: [],
      proposals: [
        {
          id: "p1",
          kind: "modified",
          fileId: "glass-garden:c-harin",
          title: "하린",
          docType: "character",
          baseRevisionNo: 1,
          current: draft("가"),
          proposed: draft("가\n\n나"),
        },
        {
          id: "p2",
          kind: "added",
          fileId: "new:place",
          title: "잿빛 등대",
          docType: "place",
          baseRevisionNo: null,
          current: null,
          proposed: draft("등대"),
        },
      ],
    };
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphDiffModal run={run} open onClose={() => {}} />
      </WorkspaceProvider>,
    );
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "반영 확정" });
    expect(confirm).toBeDisabled();
    await actor.click(
      within(dialog).getByRole("button", { name: "신규 버전 전체 반영" }),
    );
    await waitFor(() => expect(confirm).toBeEnabled());
  });
});
