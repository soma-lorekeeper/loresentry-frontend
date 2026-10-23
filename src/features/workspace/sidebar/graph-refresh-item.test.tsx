import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { bodyFromPlainText } from "@/domain/document-body";
import type { RefreshRun, RefreshRunDetail } from "@/domain/models";
import { RefreshWatcher } from "@/features/graph-refresh/refresh-watcher";
import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { setMockRule } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import type { RefreshService } from "@/services/ports";
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

const run = (status: RefreshRun["status"]): RefreshRun => ({
  id: "run-1",
  projectId: GLASS_GARDEN_ID,
  status,
  startedAt: "2026-10-24T00:00:00Z",
  readyAt: null,
  completedAt: null,
  error: null,
  counts: { total: 0, matched: 0, created: 0 },
});

const draft = (text: string) => ({
  title: "하린",
  body: bodyFromPlainText(text),
  properties: [],
});

const detail: RefreshRunDetail = {
  ...run("READY"),
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
      current: draft("가"),
      proposed: draft("나"),
    },
  ],
};

/** 사이드바 단추와 작업공간의 감시자(폴링·알림·검토 창)를 함께 그린다 */
function renderRefresh(options: Parameters<typeof renderWithServices>[1] = {}) {
  return renderWithServices(
    <WorkspaceProvider
      project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={user}
      initialLayout={createLayout()}
    >
      <GraphRefreshItem />
      <RefreshWatcher />
    </WorkspaceProvider>,
    options,
  );
}

afterEach(() => {
  vi.useRealTimers();
});

describe("GraphRefreshItem", () => {
  it("distinguishes a failed status read from an idle run and retries", async () => {
    const actor = userEvent.setup();
    renderRefresh({ before: () => setMockRule("refresh.latest", "once") });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("최신화 상태를 불러오지 못했어요");
    expect(screen.queryByRole("button", { name: "그래프 최신화" })).toBeNull();
    await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("button", { name: "그래프 최신화" }),
    ).toBeEnabled();
  });

  it("asks before locking, then tells how many documents it locked", async () => {
    const actor = userEvent.setup();
    const start = vi.fn<RefreshService["start"]>();
    renderRefresh({ refresh: { start } });

    await actor.click(
      await screen.findByRole("button", { name: "그래프 최신화" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "그래프 최신화를 시작할까요?",
    });
    await actor.click(within(dialog).getByRole("button", { name: "취소" }));
    expect(start).not.toHaveBeenCalled();
  });

  it("tells how many documents a new refresh locked", async () => {
    const actor = userEvent.setup();
    renderRefresh();

    await actor.click(
      await screen.findByRole("button", { name: "그래프 최신화" }),
    );
    await actor.click(
      await screen.findByRole("button", { name: "최신화 시작" }),
    );

    expect(await screen.findByText("문서 3개를 잠갔어요.")).toBeVisible();
    expect(
      await screen.findByRole("button", { name: /^그래프 최신화 중…/ }),
    ).toBeDisabled();
  });

  it("shows how long a running refresh has waited", async () => {
    renderRefresh({
      refresh: {
        latest: async () => ({
          ...run("RUNNING"),
          startedAt: new Date(Date.now() - 3 * 60_000).toISOString(),
        }),
      },
    });

    expect(
      await screen.findByRole("button", { name: "그래프 최신화 중… 3분" }),
    ).toBeDisabled();
  });

  it("keeps polling a refresh that was already running on entry and announces its result", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const latest = vi
      .fn<RefreshService["latest"]>()
      .mockResolvedValueOnce(run("RUNNING"))
      .mockResolvedValue(run("READY"));
    renderRefresh({ refresh: { latest } });

    expect(
      await screen.findByRole("button", { name: /^그래프 최신화 중…/ }),
    ).toBeInTheDocument();
    await act(() => vi.advanceTimersByTimeAsync(5000));

    expect(await screen.findByText("최신화 결과가 도착했어요.")).toBeVisible();
    expect(
      await screen.findByRole("button", { name: "변경 사항 반영" }),
    ).toBeInTheDocument();
    expect(latest).toHaveBeenCalledTimes(2);
  });

  it("does not announce a refresh that had already ended before entry", async () => {
    renderRefresh({ refresh: { latest: async () => run("FAILED") } });

    expect(
      await screen.findByRole("button", { name: "그래프 최신화" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("그래프 최신화를 마치지 못했어요.")).toBeNull();
  });

  it("opens the review from the sidebar", async () => {
    const actor = userEvent.setup();
    renderRefresh({
      refresh: {
        latest: async () => run("READY"),
        review: async () => detail,
      },
    });

    await actor.click(
      await screen.findByRole("button", { name: "변경 사항 반영" }),
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("button", { name: "반영 확정" }),
    ).toBeInTheDocument();
  });
});
