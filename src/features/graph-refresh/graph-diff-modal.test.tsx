import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { ToastProvider } from "@/design-system/primitives";
import { bodyFromPlainText } from "@/domain/document-body";
import type { RefreshRunDetail } from "@/domain/models";
import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { ServiceError } from "@/services/errors";
import { createMockServices } from "@/services/mock";
import { clearMockRules, setMockLatency } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb, resetDb } from "@/services/mock/db";
import { mockRefresh } from "@/services/mock/refresh";
import {
  RefreshConfirmError,
  RefreshDraftConflict,
  type Services,
} from "@/services/ports";
import { ServicesProvider } from "@/services/services-context";
import { routerMock } from "@/test/render";

import { GraphDiffModal } from "./graph-diff-modal";

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

/** 예시 작품에서 최신화를 시작하고 결과가 도착한 상태로 만든다 */
async function readyReview(): Promise<RefreshRunDetail> {
  resetDb();
  clearMockRules();
  setMockLatency(0);
  await mockRefresh.start(GLASS_GARDEN_ID);
  getDb().refreshRuns[GLASS_GARDEN_ID].readyAt = 0;
  const run = await mockRefresh.latest(GLASS_GARDEN_ID);
  return mockRefresh.review(GLASS_GARDEN_ID, run.id);
}

function renderModal(runId: string, services: Services = createMockServices()) {
  const onClose = vi.fn();
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: {
            queries: { retry: false },
            mutations: { retry: false },
          },
        })
      }
    >
      <ServicesProvider services={services}>
        <ToastProvider>
          <WorkspaceProvider
            project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
            user={user}
            initialLayout={createLayout()}
          >
            <GraphDiffModal runId={runId} open onClose={onClose} />
          </WorkspaceProvider>
        </ToastProvider>
      </ServicesProvider>
    </QueryClientProvider>,
  );
  return { onClose };
}

describe("GraphDiffModal", () => {
  it("enables confirmation only after every document is resolved", async () => {
    const actor = userEvent.setup();
    const review = await readyReview();
    renderModal(review.id);

    const dialog = await screen.findByRole("dialog");
    const confirm = await within(dialog).findByRole("button", {
      name: "반영 확정",
    });
    expect(confirm).toBeDisabled();
    await actor.click(
      within(dialog).getByRole("button", { name: "신규 버전 전체 반영" }),
    );
    await waitFor(() => expect(confirm).toBeEnabled());
  });

  it("saves the resolved drafts, applies them on confirmation and unlocks", async () => {
    const actor = userEvent.setup();
    const review = await readyReview();
    const harin = review.proposals.find((p) => p.kind === "modified")!;
    const { onClose } = renderModal(review.id);

    const dialog = await screen.findByRole("dialog");
    await actor.click(
      await within(dialog).findByRole("button", {
        name: "신규 버전 전체 반영",
      }),
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(getDb().documents[harin.fileId].body).toEqual(harin.proposed!.body);
    expect(await mockRefresh.latest(GLASS_GARDEN_ID)).toMatchObject({
      status: "APPLIED",
    });
    const node = getDb().files.find((f) => f.id === harin.fileId);
    expect(node?.kind === "document" && node.refreshLocked).toBe(false);
  });

  it("resolves a document by editing either side in place", async () => {
    const actor = userEvent.setup();
    resetDb();
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
    const detail: RefreshRunDetail = {
      id: "run-edit",
      projectId: GLASS_GARDEN_ID,
      status: "READY",
      startedAt: null,
      readyAt: null,
      completedAt: null,
      error: null,
      counts: { total: 1, matched: 0, created: 0 },
      proposals: [
        {
          id: "p1",
          kind: "modified",
          fileId: "glass-garden:c-harin",
          title: "하린",
          docType: "character",
          draftRevision: 1,
          matched: false,
          baseMismatch: false,
          current: draft("정원사"),
          proposed: draft("기록단의 정원사"),
        },
      ],
    };
    const services = createMockServices();
    services.refresh = {
      ...services.refresh,
      review: async () => detail,
      saveDraft: async (_project, _run, _draft, input) => ({
        ...input,
        draftRevision: input.draftRevision + 1,
        matched:
          JSON.stringify(input.current) === JSON.stringify(input.proposed),
      }),
    };
    renderModal(detail.id, services);

    const dialog = await screen.findByRole("dialog");
    await actor.click(
      await within(dialog).findByRole("button", { name: /하린/ }),
    );
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

  it("reloads the drafts when another tab saved first", async () => {
    const actor = userEvent.setup();
    const review = await readyReview();
    const services = createMockServices();
    const reviewSpy = vi.fn(services.refresh.review);
    services.refresh = {
      ...services.refresh,
      review: reviewSpy,
      saveDraft: vi.fn().mockRejectedValueOnce(
        new RefreshDraftConflict({
          draftRevision: 9,
          matched: false,
          current: null,
          proposed: null,
        }),
      ),
    };
    renderModal(review.id, services);

    const dialog = await screen.findByRole("dialog");
    await actor.click(
      await within(dialog).findByRole("button", {
        name: "현재 버전 전체 반영",
      }),
    );

    expect(
      await screen.findByText(
        "다른 곳에서 먼저 고친 내용으로 바꿨어요.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    await waitFor(() => expect(reviewSpy).toHaveBeenCalledTimes(2));
  });

  it("lists why a confirmation was refused by document name", async () => {
    const actor = userEvent.setup();
    const review = await readyReview();
    const created = review.proposals.find((p) => p.kind === "added")!;
    const services = createMockServices();
    services.refresh = {
      ...services.refresh,
      confirm: () =>
        Promise.reject(
          new RefreshConfirmError(
            "REFRESH_DRAFTS_INVALID",
            [],
            [{ code: "REJECTED_CANDIDATE", target: created.fileId }],
          ),
        ),
    };
    renderModal(review.id, services);

    const dialog = await screen.findByRole("dialog");
    await actor.click(
      await within(dialog).findByRole("button", {
        name: "신규 버전 전체 반영",
      }),
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );

    expect(
      await within(dialog).findByText(
        `만들지 않기로 한 ‘${created.title}’에 이어진 관계가 남아 있어요.`,
      ),
    ).toBeInTheDocument();
  });

  it("closes when the review already ended elsewhere", async () => {
    const actor = userEvent.setup();
    const review = await readyReview();
    const services = createMockServices();
    services.refresh = {
      ...services.refresh,
      confirm: () =>
        Promise.reject(new ServiceError("not-found", "이미 끝난 최신화예요.")),
    };
    const { onClose } = renderModal(review.id, services);

    const dialog = await screen.findByRole("dialog");
    await actor.click(
      await within(dialog).findByRole("button", {
        name: "신규 버전 전체 반영",
      }),
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "반영 확정" }),
    );

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(
      await screen.findByText("이미 끝난 최신화예요."),
    ).toBeInTheDocument();
  });
});
