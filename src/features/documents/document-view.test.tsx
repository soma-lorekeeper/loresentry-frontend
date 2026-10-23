import { act, cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";
import { setMockLatency, setMockRule } from "@/services/mock/control";
import { mockDocuments } from "@/services/mock/documents";
import type { RefreshService } from "@/services/ports";

import { createLayout } from "../workspace/model/layout";
import {
  useWorkspace,
  WorkspaceProvider,
} from "../workspace/workspace-context";
import { DocumentView } from "./document-view";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Tiptap은 unmount 다음 tick에 에디터를 해제한다. jsdom이 사라지기 전에 마치게 한다.
afterAll(() => new Promise((resolve) => setTimeout(resolve, 5)));

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

function OpenMemo() {
  const { dispatch } = useWorkspace();
  return (
    <button
      onClick={() =>
        dispatch({ type: "setPanels", panels: { memoOpen: true } })
      }
    >
      메모 패널 열기
    </button>
  );
}

function renderDocument(fileId: string) {
  return renderWithServices(
    <WorkspaceProvider
      project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={user}
      initialLayout={createLayout({ kind: "file", fileId })}
    >
      <OpenMemo />
      <DocumentView fileId={fileId} paneId="pane-1" active />
    </WorkspaceProvider>,
  );
}

describe("DocumentView format", () => {
  it("serializes export attempts, shows progress, and allows retry after failure", async () => {
    const actor = userEvent.setup();
    let reject!: (error: Error) => void;
    const request = new Promise<{ fileName: string; url: string }>((_, no) => {
      reject = no;
    });
    const exportFile = vi
      .spyOn(mockDocuments, "export")
      .mockReturnValueOnce(request)
      .mockResolvedValueOnce({ fileName: "qa.md", url: "" });
    try {
      renderDocument("glass-garden:ch-12");
      await screen.findByRole("toolbar", { name: "편집 도구" });
      await actor.click(screen.getByRole("button", { name: "내보내기" }));
      await actor.click(
        screen.getByRole("menuitem", { name: "마크다운 (.md)" }),
      );
      await waitFor(() => expect(exportFile).toHaveBeenCalledTimes(1));
      const busy = screen.getByRole("button", { name: "내보내기 중…" });
      expect(busy).toBeDisabled();
      await actor.click(busy);
      expect(exportFile).toHaveBeenCalledTimes(1);
      await act(async () => reject(new Error("QA export failure")));
      expect(await screen.findByText("내보내지 못했어요.")).toBeInTheDocument();
      await actor.click(screen.getByRole("button", { name: "내보내기" }));
      await actor.click(
        screen.getByRole("menuitem", { name: "마크다운 (.md)" }),
      );
      await waitFor(() => expect(exportFile).toHaveBeenCalledTimes(2));
      await waitFor(() =>
        expect(screen.getByRole("button", { name: "내보내기" })).toBeEnabled(),
      );
    } finally {
      exportFile.mockRestore();
    }
  });
  it("blocks another favorite change while pending, keeps the previous state on failure, and retries", async () => {
    const actor = userEvent.setup();
    const fileId = "glass-garden:ch-12";
    renderDocument(fileId);
    await screen.findByRole("toolbar", { name: "편집 도구" });
    const button = screen.getByRole("button", {
      name: /^즐겨찾기(에 추가|에서 제거)$/,
    });
    const before = button.getAttribute("aria-pressed");
    setMockLatency(80);
    setMockRule("files.setFavorite", "once");
    await actor.click(button);
    await actor.click(button);
    expect(button).toBeDisabled();
    await screen.findByText(
      "즐겨찾기를 변경하지 못했어요. 다시 시도해 주세요.",
    );
    expect(button).toHaveAttribute("aria-pressed", before);
    await actor.click(button);
    await waitFor(() =>
      expect(button).toHaveAttribute(
        "aria-pressed",
        before === "true" ? "false" : "true",
      ),
    );
  });
  it("restores an unsaved memo after explicitly closing and reopening its panel", async () => {
    const actor = userEvent.setup();
    renderDocument("glass-garden:ch-12");
    await screen.findByRole("toolbar", { name: "편집 도구" });
    await actor.click(screen.getByRole("button", { name: "메모 패널 열기" }));
    await actor.click(
      await screen.findByRole("button", { name: /메모 추가$/ }),
    );
    await actor.type(
      await screen.findByRole("textbox", { name: "메모 내용" }),
      "아직 저장하지 않은 메모",
    );
    await actor.click(screen.getByRole("button", { name: "메모 닫기" }));
    expect(
      screen.queryByRole("textbox", { name: "메모 내용" }),
    ).not.toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "메모 패널 열기" }));
    expect(
      await screen.findByRole("textbox", { name: "메모 내용" }),
    ).toHaveValue("아직 저장하지 않은 메모");
    expect(
      getDb().memos.some((memo) => memo.body === "아직 저장하지 않은 메모"),
    ).toBe(false);
  });

  it("changes the font of the open document only", async () => {
    const actor = userEvent.setup();
    renderDocument("glass-garden:ch-12");
    const toolbar = await screen.findByRole("toolbar", { name: "편집 도구" });
    await waitFor(() =>
      expect(
        within(toolbar).getByRole("button", { name: "되돌리기" }),
      ).toBeInTheDocument(),
    );

    await actor.click(
      within(toolbar).getByRole("button", { name: "글꼴: Pretendard" }),
    );
    await actor.click(
      await screen.findByRole("menuitemradio", { name: "나눔명조" }),
    );

    expect(
      within(toolbar).getByRole("button", { name: "글꼴: 나눔명조" }),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(getDb().documents["glass-garden:ch-12"].body.doc.attrs).toEqual({
          font: "nanum-myeongjo",
          fontSize: 10.5,
          lineHeight: 1.5,
        }),
      { timeout: 4000 },
    );
    cleanup();

    renderDocument("glass-garden:c-lena");
    const other = await screen.findByRole("toolbar", { name: "편집 도구" });
    expect(
      within(other).getByRole("button", { name: "글꼴: Pretendard" }),
    ).toBeInTheDocument();
    expect(getDb().documents["glass-garden:c-lena"].body.doc.attrs).toBe(
      undefined,
    );
  });
});

describe("DocumentView graph refresh lock", () => {
  const LOCKED = "glass-garden:ch-12";

  function renderRefreshLocked(refresh: Partial<RefreshService> = {}) {
    return renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout({ kind: "file", fileId: LOCKED })}
      >
        <DocumentView fileId={LOCKED} paneId="pane-1" active />
      </WorkspaceProvider>,
      {
        refresh,
        // 그래프 최신화가 이 원고를 읽는 중이다.
        before: () => {
          const node = getDb().files.find((f) => f.id === LOCKED);
          if (node?.kind === "document") node.refreshLocked = true;
        },
      },
    );
  }

  it("explains instead of unlocking a document a refresh holds", async () => {
    const actor = userEvent.setup();
    const setLocked = vi.spyOn(mockDocuments, "setLocked");
    try {
      renderRefreshLocked();

      expect(
        await screen.findByText(
          "그래프 최신화 결과 기다리는 중 · 확정 전까지 잠김",
        ),
      ).toBeInTheDocument();
      await actor.click(
        screen.getByRole("button", { name: "그래프 최신화로 잠김" }),
      );

      expect(
        await screen.findByText("그래프 최신화가 잠근 문서예요."),
      ).toBeVisible();
      // 결과가 와도 확정 전까지는 잠겨 있으므로, "끝나면 풀린다"고 말하지 않는다.
      expect(
        screen.getByText("결과가 오면 검토해 확정할 때 풀려요."),
      ).toBeVisible();
      expect(setLocked).not.toHaveBeenCalled();
      expect(screen.getByRole("textbox", { name: "제목" })).toHaveAttribute(
        "readonly",
      );
    } finally {
      setLocked.mockRestore();
    }
  });

  it("points to the review while the refresh result waits for it", async () => {
    const actor = userEvent.setup();
    renderRefreshLocked({
      latest: async () => ({
        id: "run-1",
        projectId: GLASS_GARDEN_ID,
        status: "READY",
        startedAt: null,
        readyAt: null,
        completedAt: null,
        error: null,
        counts: { total: 1, matched: 0, created: 0 },
      }),
    });

    const notice = (
      await screen.findByText("그래프 최신화 결과 확정 전까지 잠김")
    ).parentElement!;
    expect(
      await within(notice).findByRole("button", { name: "검토하기" }),
    ).toBeInTheDocument();
    await actor.click(
      screen.getByRole("button", { name: "그래프 최신화로 잠김" }),
    );
    expect(
      await screen.findByText("검토에서 ‘반영 확정’을 누르면 풀려요."),
    ).toBeVisible();
  });
});
