import { act, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { bodyFromPlainText } from "@/domain/document-body";
import type { RefreshRun } from "@/domain/models";
import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { setMockLatency } from "@/services/mock/control";
import { setMockRule } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { announceTourEnd } from "@/features/tour/tour-state";
import { renderWithServices, routerMock } from "@/test/render";

import { GraphRefreshItem } from "./graph-refresh-item";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

const draft = (text: string) => ({
  title: "하린",
  body: bodyFromPlainText(text),
  properties: [],
});

describe("GraphRefreshItem", () => {
  it("distinguishes a failed status read from an idle run and retries", async () => {
    const actor = userEvent.setup();
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphRefreshItem />
      </WorkspaceProvider>,
      { before: () => setMockRule("refresh.current", "once") },
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("최신화 상태를 불러오지 못했어요");
    expect(screen.queryByRole("button", { name: "그래프 최신화" })).toBeNull();
    await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("button", { name: "그래프 최신화" }),
    ).toBeEnabled();
  });
  it("confirms the apply with a toast and does not reopen for the next run", async () => {
    const actor = userEvent.setup();
    let run: RefreshRun = {
      id: "run-1",
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
          proposed: draft("나"),
        },
      ],
    };
    const proposals = run.proposals;
    const refresh = {
      current: vi.fn(async () => run),
      apply: vi.fn(
        async () => (run = { ...run, status: "APPLIED", proposals: [] }),
      ),
      start: vi.fn(
        async () => (run = { ...run, id: "run-2", status: "READY", proposals }),
      ),
    };

    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphRefreshItem />
      </WorkspaceProvider>,
      { refresh, before: () => setMockLatency(200) },
    );

    await actor.click(
      await screen.findByRole("button", { name: "변경 사항 반영" }),
    );
    const dialog = await screen.findByRole("dialog");
    await actor.click(
      within(dialog).getByRole("button", { name: "신규 버전 전체 반영" }),
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );

    expect(await screen.findByText("변경 사항을 반영했어요.")).toBeVisible();
    await actor.click(
      await screen.findByRole("button", { name: "그래프 최신화" }),
    );
    expect(
      await screen.findByRole("button", { name: "변경 사항 반영" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the review when the tour ends, and opens it again on request", async () => {
    const actor = userEvent.setup();
    const run: RefreshRun = {
      id: "run-1",
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
          proposed: draft("나"),
        },
      ],
    };
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphRefreshItem />
      </WorkspaceProvider>,
      { refresh: { current: async () => run } },
    );

    const review = await screen.findByRole("button", {
      name: "변경 사항 반영",
    });
    await actor.click(review);
    await screen.findByRole("dialog");
    act(() => announceTourEnd());
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    await actor.click(review);
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
  });
});
