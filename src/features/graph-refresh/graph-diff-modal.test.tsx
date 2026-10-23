import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb, resetDb } from "@/services/mock/db";
import { clearMockRules, setMockLatency } from "@/services/mock/control";
import { createMockServices } from "@/services/mock";
import { mockRefresh } from "@/services/mock/refresh";
import { ServicesProvider } from "@/services/services-context";
import { ToastProvider } from "@/design-system/primitives";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render } from "@testing-library/react";
import type { RefreshRun } from "@/domain/models";
import { renderWithServices, routerMock } from "@/test/render";
import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";

import { GraphDiffModal } from "./graph-diff-modal";
import { useRefreshRun } from "./queries";
import { bodyFromPlainText } from "@/domain/document-body";

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

describe("GraphDiffModal", () => {
  it("enables confirmation only after every document is resolved", async () => {
    const actor = userEvent.setup();
    const draft = (text: string) => ({
      title: "하린",
      body: bodyFromPlainText(text),
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

  it("applies the resolved drafts to the documents", async () => {
    resetDb();
    clearMockRules();
    setMockLatency(0);
    await mockRefresh.start(GLASS_GARDEN_ID);
    (
      getDb().refreshRuns[GLASS_GARDEN_ID] as unknown as { readyAt: number }
    ).readyAt = 0;
    const run = await mockRefresh.current(GLASS_GARDEN_ID);
    expect(run.status).toBe("READY");
    const harin = run.proposals.find((p) => p.kind === "modified")!;
    const onClose = vi.fn();
    const actor = userEvent.setup();
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ServicesProvider services={createMockServices()}>
          <ToastProvider>
            <WorkspaceProvider
              project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
              user={user}
              initialLayout={createLayout()}
            >
              <GraphDiffModal run={run} open onClose={onClose} />
            </WorkspaceProvider>
          </ToastProvider>
        </ServicesProvider>
      </QueryClientProvider>,
    );
    const dialog = await screen.findByRole("dialog");
    await actor.click(
      within(dialog).getByRole("button", { name: "신규 버전 전체 반영" }),
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getDb().documents[harin.fileId].body).toEqual(harin.proposed!.body);
    expect(getDb().refreshRuns[GLASS_GARDEN_ID].status).toBe("APPLIED");
  });

  it("resolves a document by editing either side in place", async () => {
    const actor = userEvent.setup();
    const draft = (value: string) => ({
      title: "하린",
      body: bodyFromPlainText("가"),
      properties: [
        {
          id: "d",
          kind: "text" as const,
          key: "description",
          label: "설명",
          value,
        },
      ],
    });
    const run: RefreshRun = {
      id: "run-edit",
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
          current: draft("정원사"),
          proposed: draft("기록단의 정원사"),
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
    await actor.click(within(dialog).getByRole("button", { name: /하린/ }));
    expect(within(dialog).getByRole("status")).toHaveTextContent("1군데");

    const right = within(dialog).getByRole("textbox", {
      name: "신규 버전 설명",
    });
    await actor.clear(right);
    await actor.type(right, "정원사");
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "두 버전이 같아져서",
    );
    expect(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    ).toBeEnabled();
  });

  it("labels preview proposals as such", async () => {
    const run: RefreshRun = {
      id: "run-preview",
      projectId: GLASS_GARDEN_ID,
      status: "READY",
      startedAt: null,
      sourceFileIds: [],
      preview: true,
      proposals: [
        {
          id: "p1",
          kind: "modified",
          fileId: "glass-garden:c-harin",
          title: "하린",
          docType: "character",
          baseRevisionNo: 1,
          current: {
            title: "하린",
            body: bodyFromPlainText("가"),
            properties: [],
          },
          proposed: {
            title: "하린",
            body: bodyFromPlainText("나"),
            properties: [],
          },
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
    expect(dialog).toHaveTextContent("미리보기 제안이에요.");
  });

  it("says there is nothing to apply and clears the run on confirmation", async () => {
    const discard = vi.fn().mockResolvedValue({
      id: "run-idle",
      projectId: GLASS_GARDEN_ID,
      status: "IDLE",
      startedAt: null,
      sourceFileIds: [],
      proposals: [],
    });
    const onClose = vi.fn();
    const actor = userEvent.setup();
    const run: RefreshRun = {
      id: "run-empty",
      projectId: GLASS_GARDEN_ID,
      status: "READY",
      startedAt: null,
      sourceFileIds: [],
      proposals: [],
    };
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphDiffModal run={run} open onClose={onClose} />
      </WorkspaceProvider>,
      { refresh: { discard } },
    );
    const dialog = await screen.findByRole("dialog", {
      name: "새로 반영할 내용이 없어요",
    });
    expect(
      within(dialog).queryByRole("button", { name: "반영 확정" }),
    ).not.toBeInTheDocument();
    await actor.click(within(dialog).getByRole("button", { name: "확인" }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(discard).toHaveBeenCalledWith(GLASS_GARDEN_ID, "run-empty");
  });

  it("keeps an empty result open after failed confirmation and lets the user retry", async () => {
    let reject!: (reason: Error) => void;
    const discard = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise((_, fail) => {
            reject = fail;
          }),
      )
      .mockResolvedValue({
        id: "idle",
        projectId: GLASS_GARDEN_ID,
        status: "IDLE",
        proposals: [],
      });
    const onClose = vi.fn();
    const actor = userEvent.setup();
    const run: RefreshRun = {
      id: "empty",
      projectId: GLASS_GARDEN_ID,
      status: "READY",
      startedAt: null,
      sourceFileIds: [],
      proposals: [],
    };
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphDiffModal run={run} open onClose={onClose} />
      </WorkspaceProvider>,
      { refresh: { discard } },
    );
    const dialog = await screen.findByRole("dialog");
    const confirm = within(dialog).getByRole("button", { name: "확인" });
    await actor.click(confirm);
    await waitFor(() => expect(confirm).toBeDisabled());
    await actor.keyboard("{Escape}");
    expect(onClose).not.toHaveBeenCalled();
    reject(new Error("offline"));
    await within(dialog).findByText(/결과를 확인 처리하지 못했어요/);
    expect(onClose).not.toHaveBeenCalled();
    await actor.click(confirm);
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(discard).toHaveBeenCalledTimes(2);
  });

  it("refreshes unfinished proposals after partial failure while keeping the reviewed draft", async () => {
    const actor = userEvent.setup();
    const draft = {
      title: "새 사건",
      body: bodyFromPlainText("내가 검토한 글"),
      properties: [],
    };
    let run: RefreshRun = {
      id: "partial",
      projectId: GLASS_GARDEN_ID,
      status: "READY",
      startedAt: null,
      sourceFileIds: [],
      proposals: [
        {
          id: "new",
          fileId: "new:events:1",
          kind: "added",
          title: draft.title,
          docType: "event",
          baseRevisionNo: null,
          current: null,
          proposed: draft,
        },
      ],
    };
    const apply = vi
      .fn()
      .mockImplementationOnce(async () => {
        run = {
          ...run,
          partiallyApplied: true,
          proposals: [
            {
              ...run.proposals[0],
              kind: "modified",
              fileId: "created-event",
              baseRevisionNo: 0,
              current: { ...draft, body: bodyFromPlainText("") },
            },
          ],
        };
        throw new Error("offline");
      })
      .mockResolvedValue({ ...run, status: "APPLIED", proposals: [] });
    const current = vi.fn(async () => run);
    const onClose = vi.fn();
    function Review() {
      const query = useRefreshRun(GLASS_GARDEN_ID);
      return query.data ? (
        <GraphDiffModal run={query.data} open onClose={onClose} />
      ) : null;
    }
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <Review />
      </WorkspaceProvider>,
      { refresh: { current, apply } },
    );
    const dialog = await screen.findByRole("dialog");
    await actor.click(
      within(dialog).getByRole("button", { name: "신규 버전 전체 반영" }),
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );
    await within(dialog).findByText(/일부 문서는 이미 저장됐어요/);
    expect(onClose).not.toHaveBeenCalled();
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    expect(apply).toHaveBeenLastCalledWith(GLASS_GARDEN_ID, "partial", {
      new: draft,
    });
  });
});
