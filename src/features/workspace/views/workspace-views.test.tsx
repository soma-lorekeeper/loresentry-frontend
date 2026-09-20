import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ChatPanel } from "@/features/chat/chat-panel";
import { MemoView } from "@/features/memos/memo-view";
import { FileTrashView } from "@/features/file-trash/file-trash-view";
import { ProjectSettingsView } from "@/features/project-settings/project-settings-view";
import { SearchView } from "@/features/search/search-view";
import { setMockRule } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout, type WorkspaceViewKind } from "../model/layout";
import { useWorkspace, WorkspaceProvider } from "../workspace-context";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = { id: "user-1", displayName: "서윤주", email: "seoyunju@lore.kr" };

function TabCount() {
  const { layout } = useWorkspace();
  return <output aria-label="탭 수">{layout.panes[0].tabs.length}</output>;
}

function CloseButton({ tabId }: { tabId: string }) {
  const { closeTab } = useWorkspace();
  return (
    <button type="button" onClick={() => closeTab("pane-1", tabId)}>
      탭 닫기
    </button>
  );
}

function renderInWorkspace(
  kind: WorkspaceViewKind,
  view: ReactNode,
  before?: () => void,
) {
  return renderWithServices(<Harness kind={kind}>{view}</Harness>, { before });
}

function Harness({
  kind,
  children,
}: {
  kind: WorkspaceViewKind;
  children: ReactNode;
}) {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  const layout = createLayout({ kind: "new" });
  layout.panes[0].tabs.push({ id: kind, target: { kind } });
  layout.panes[0].activeTabId = kind;
  return (
    <WorkspaceProvider project={project} user={user} initialLayout={layout}>
      {children}
      <TabCount />
      <CloseButton tabId={kind} />
    </WorkspaceProvider>
  );
}

describe("workspace views", () => {
  it("searches the project and lists matching files", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("search", <SearchView />);
    expect(screen.getByText("검색어를 기다리는 중")).toBeInTheDocument();
    await actor.type(
      screen.getByRole("searchbox", { name: "현재 프로젝트에서 검색" }),
      "유리",
    );
    const results = await screen.findByRole("list", { name: "검색 결과" });
    expect(within(results).getAllByRole("button").length).toBeGreaterThan(0);
    expect(screen.getByText(/개 결과$/)).toBeInTheDocument();
  });

  it("keeps the query and offers a retry when search fails", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("search", <SearchView />, () =>
      setMockRule("search.query", "fail"),
    );
    const input = screen.getByRole("searchbox", {
      name: "현재 프로젝트에서 검색",
    });
    await actor.type(input, "유리");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("검색 결과를 불러오지 못했어요");
    expect(input).toHaveValue("유리");
  });

  it("restores and permanently deletes trashed files", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("trash", <FileTrashView />);
    expect(await screen.findByText("3개 항목")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "삭제한 항목" });
    await actor.click(within(list).getAllByRole("button", { name: "복원" })[0]);
    expect(await screen.findByText("2개 항목")).toBeInTheDocument();

    await actor.click(
      within(list).getAllByRole("button", { name: "영구 삭제" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await actor.click(
      within(dialog).getByRole("button", { name: "영구 삭제" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("2개 항목")).not.toBeInTheDocument(),
    );
  });

  it("asks before closing project settings with unsaved changes", async () => {
    const actor = userEvent.setup();
    renderInWorkspace(
      "settings",
      <ProjectSettingsView
        paneId="pane-1"
        tab={{ id: "settings", target: { kind: "settings" } }}
        active
      />,
    );
    const name = await screen.findByRole("textbox", { name: /프로젝트 이름/ });
    await actor.clear(name);
    await actor.type(name, "유리 정원의 연대기");
    await actor.click(screen.getByRole("button", { name: "탭 닫기" }));

    const dialog = await screen.findByRole("dialog", {
      name: /변경사항을 저장하지 않고 나갈까요/,
    });
    expect(screen.getByLabelText("탭 수")).toHaveTextContent("2");
    await actor.click(
      within(dialog).getByRole("button", { name: "변경사항 버리기" }),
    );
    expect(screen.getByLabelText("탭 수")).toHaveTextContent("1");
  });

  it("saves project settings and reflects the new title", async () => {
    const actor = userEvent.setup();
    renderInWorkspace(
      "settings",
      <ProjectSettingsView
        paneId="pane-1"
        tab={{ id: "settings", target: { kind: "settings" } }}
        active
      />,
    );
    const name = await screen.findByRole("textbox", { name: /프로젝트 이름/ });
    await actor.clear(name);
    await actor.type(name, "유리 정원의 연대기");
    await actor.click(screen.getByRole("button", { name: "변경사항 저장" }));
    expect(
      await screen.findByText("설정이 저장되었습니다"),
    ).toBeInTheDocument();
    expect(getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)?.title).toBe(
      "유리 정원의 연대기",
    );
  });

  it("saves an edited project memo when the save button is pressed", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    const editors = await screen.findAllByRole("textbox", {
      name: "프로젝트 메모",
    });
    await actor.type(editors[0], " 추가");
    expect(getDb().memos.some((memo) => memo.body.endsWith(" 추가"))).toBe(
      false,
    );
    await actor.click(
      screen.getAllByRole("button", { name: "프로젝트 메모 저장" })[0],
    );
    await waitFor(
      () =>
        expect(getDb().memos.some((memo) => memo.body.endsWith(" 추가"))).toBe(
          true,
        ),
      { timeout: 3000 },
    );
  });

  it("deletes a memo after confirmation", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    const before = getDb().memos.filter((m) => m.scope === "project").length;
    await actor.click(
      (await screen.findAllByRole("button", { name: "메모 메뉴" }))[0],
    );
    await actor.click(await screen.findByRole("menuitem", { name: "삭제" }));
    const dialog = await screen.findByRole("dialog");
    await actor.click(
      within(dialog).getByRole("button", { name: "메모 삭제" }),
    );
    await waitFor(() =>
      expect(getDb().memos.filter((m) => m.scope === "project")).toHaveLength(
        before - 1,
      ),
    );
  });

  it("streams an AI reply and can stop it without keeping the partial", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("new", <ChatPanel />);
    const input = await screen.findByRole("textbox", { name: "메시지" });
    await waitFor(() => expect(input).toBeEnabled());
    await actor.type(input, "장면을 다듬어 줘{Enter}");
    const stop = await screen.findByRole("button", { name: "응답 중단" });
    await actor.click(stop);
    expect(
      await screen.findByText(/미완성 답변은 기록에 남기지 않았어요/),
    ).toBeInTheDocument();
    const stored = getDb().chatMessages.filter((m) => m.role === "assistant");
    expect(stored.every((m) => m.content.length > 0)).toBe(true);
    expect(
      getDb().chatMessages.some((m) => m.content === "장면을 다듬어 줘"),
    ).toBe(true);
  });

  it("deletes a chat session after confirming in the panel", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("new", <ChatPanel />);
    const before = getDb().chatSessions.length;
    await actor.click(
      await screen.findByRole("button", { name: "채팅 세션 메뉴" }),
    );
    await actor.click(await screen.findByRole("menuitem", { name: "삭제" }));
    const dialog = await screen.findByRole("alertdialog");
    await actor.click(within(dialog).getByRole("button", { name: "삭제" }));
    await waitFor(() => expect(getDb().chatSessions).toHaveLength(before - 1));
  });
});
