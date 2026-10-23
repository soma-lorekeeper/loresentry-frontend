import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkspaceHelpView } from "@/features/help/workspace-help-view";
import { MemoView } from "@/features/memos/memo-view";
import { FileTrashView } from "@/features/file-trash/file-trash-view";
import { ProjectSettingsView } from "@/features/project-settings/project-settings-view";
import { searchTermOf } from "@/features/search/queries";
import { SearchView } from "@/features/search/search-view";
import {
  clearMockRules,
  setMockLatency,
  setMockRule,
} from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout, type WorkspaceViewKind } from "../model/layout";
import { useWorkspace, WorkspaceProvider } from "../workspace-context";

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

function renderSearch(before?: () => void) {
  return renderInWorkspace(
    "search",
    <SearchView
      paneId="pane-1"
      tab={{ id: "search", target: { kind: "search" } }}
      active
    />,
    before,
  );
}

describe("project search", () => {
  afterEach(() => {
    delete window.gtag;
  });

  it("measures completed searches once with result presence and without the original text", async () => {
    const tag = vi.fn();
    window.gtag = tag;
    const actor = userEvent.setup();
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    await actor.type(input, "균열");
    await screen.findByRole("list", { name: "검색 결과" });
    await waitFor(() =>
      expect(tag).toHaveBeenCalledWith("event", "project_search", {
        has_results: true,
      }),
    );
    await actor.click(screen.getByRole("radio", { name: "이름순" }));
    expect(tag).toHaveBeenCalledTimes(1);
    await actor.clear(input);
    await actor.type(input, "QA_PRIVATE_SEARCH_NO_MATCH");
    await screen.findByText("일치하는 문서가 없어요");
    await waitFor(() =>
      expect(tag).toHaveBeenLastCalledWith("event", "project_search", {
        has_results: false,
      }),
    );
    expect(tag).toHaveBeenCalledTimes(2);
    expect(JSON.stringify(tag.mock.calls)).not.toMatch(
      /균열|QA_PRIVATE_SEARCH_NO_MATCH/,
    );
  });

  it("does not count an error as empty results and counts a successful retry once", async () => {
    const tag = vi.fn();
    window.gtag = tag;
    const actor = userEvent.setup();
    renderSearch(() => setMockRule("search.query", "fail"));
    await actor.type(
      screen.getByRole("searchbox", { name: "프로젝트에서 검색" }),
      "균열",
    );
    const alert = await screen.findByRole("alert");
    expect(tag).not.toHaveBeenCalled();
    clearMockRules();
    await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
    await screen.findByRole("list", { name: "검색 결과" });
    await waitFor(() => expect(tag).toHaveBeenCalledTimes(1));
    expect(tag).toHaveBeenLastCalledWith("event", "project_search", {
      has_results: true,
    });
  });

  it("counts a new search after clearing, including a cached result for the same text", async () => {
    const tag = vi.fn();
    window.gtag = tag;
    const actor = userEvent.setup();
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    await actor.type(input, "균열");
    await waitFor(() => expect(tag).toHaveBeenCalledTimes(1));
    await actor.click(screen.getByRole("button", { name: "검색어 지우기" }));
    await new Promise((resolve) => setTimeout(resolve, 300));
    await actor.type(input, "균열");
    await waitFor(() => expect(tag).toHaveBeenCalledTimes(2));
  });
  it("lists documents that match the title or the body", async () => {
    const actor = userEvent.setup();
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    expect(input).toHaveFocus();

    await actor.type(input, "레나");
    const results = await screen.findByRole("list", { name: "검색 결과" });
    const rows = within(results).getAllByRole("button");
    expect(rows.length).toBeGreaterThan(1);
    expect(rows[0]).toHaveTextContent("레나");
    expect(
      within(rows[0]).getAllByText("레나", { selector: "mark" }).length,
    ).toBeGreaterThan(0);
    expect(screen.getByText(`${rows.length}개 결과`)).toBeInTheDocument();
  });

  it("opens the first result with Enter and walks the list with the arrow keys", async () => {
    const actor = userEvent.setup();
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    await actor.type(input, "레나 아르벨");
    const results = await screen.findByRole("list", { name: "검색 결과" });
    const rows = within(results).getAllByRole("button");

    await actor.keyboard("{ArrowDown}");
    expect(rows[0]).toHaveFocus();
    await actor.keyboard("{ArrowUp}");
    expect(input).toHaveFocus();

    await actor.keyboard("{Enter}");
    expect(screen.getByLabelText("탭 수")).toHaveTextContent("3");
  });

  it("says when nothing matches and clears the query from the field", async () => {
    const actor = userEvent.setup();
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    await actor.type(input, "없는말없는말");
    expect(
      await screen.findByText("일치하는 문서가 없어요"),
    ).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "검색어 지우기" }));
    expect(input).toHaveValue("");
    expect(
      screen.getByText("원고와 설정 문서의 제목과 본문에서 찾아요"),
    ).toBeInTheDocument();
  });

  it("keeps the query and offers a retry when search fails", async () => {
    const actor = userEvent.setup();
    renderSearch(() => setMockRule("search.query", "fail"));
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    await actor.type(input, "레나");
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("검색하지 못했어요");
    expect(input).toHaveValue("레나");

    clearMockRules();
    await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
    expect(
      await screen.findByRole("list", { name: "검색 결과" }),
    ).toBeInTheDocument();
  });

  it("sorts results by relevance, recent edit or title in either direction and shows each document's details", async () => {
    const actor = userEvent.setup();
    renderSearch();
    const input = screen.getByRole("searchbox", { name: "프로젝트에서 검색" });
    await actor.type(input, "균열");
    const results = await screen.findByRole("list", { name: "검색 결과" });
    const rows = () => within(results).getAllByRole("button");

    await actor.click(screen.getByRole("radio", { name: "최근 수정순" }));
    const times = rows().map((row) =>
      Date.parse(row.querySelector("time")!.dateTime),
    );
    expect(times).toEqual([...times].sort((a, b) => b - a));

    await actor.click(screen.getByRole("radio", { name: "이름순" }));
    const names = rows().map(
      (row) => row.querySelector("time")!.previousElementSibling!.textContent,
    );
    expect(names).toEqual(
      [...names].sort((a, b) =>
        a.localeCompare(b, "ko", { numeric: true, sensitivity: "base" }),
      ),
    );

    await actor.click(
      screen.getByRole("button", { name: "정렬 방향: 오름차순" }),
    );
    const reversed = rows().map(
      (row) => row.querySelector("time")!.previousElementSibling!.textContent,
    );
    expect(reversed).toEqual([...names].reverse());

    await actor.click(screen.getByRole("radio", { name: "관련도순" }));
    const relevance = rows().map((row) => row.textContent);
    await actor.click(
      screen.getByRole("button", { name: "정렬 방향: 내림차순" }),
    );
    expect(rows().map((row) => row.textContent)).toEqual(
      [...relevance].reverse(),
    );

    const favorite = rows().find((row) => row.textContent?.includes("12화"));
    expect(favorite).toHaveTextContent("즐겨찾기");
    expect(favorite).toHaveTextContent("원고");
  });

  it("does not send a consonant or vowel still being typed", () => {
    expect(searchTermOf("유ㄹ")).toBe("유");
    expect(searchTermOf(" ㄹ ")).toBe("");
    expect(searchTermOf("레나 ")).toBe("레나");
  });
});

describe("workspace views", () => {
  it("opens the guide on its topic list and comes back from a topic", async () => {
    const actor = userEvent.setup();
    const scroll = Element.prototype.scrollIntoView;
    Element.prototype.scrollIntoView = vi.fn();
    renderInWorkspace("help", <WorkspaceHelpView />);
    expect(
      screen.getByRole("heading", { level: 1, name: "사용 가이드" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "도움말로 돌아가기" }),
    ).not.toBeInTheDocument();

    const list = await screen.findByRole("list", { name: "가이드 주제" });
    await actor.click(
      within(list).getByRole("button", { name: /작업공간 시작하기/ }),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "작업공간 시작하기",
      }),
    ).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "주제 목록" }));
    expect(
      await screen.findByRole("list", { name: "가이드 주제" }),
    ).toBeInTheDocument();
    Element.prototype.scrollIntoView = scroll;
  });

  it("restores and permanently deletes trashed files", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("trash", <FileTrashView />);
    expect(await screen.findByText("3개")).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "삭제한 항목" });
    await actor.click(within(list).getAllByRole("button", { name: "복원" })[0]);
    expect(await screen.findByText("2개")).toBeInTheDocument();

    await actor.click(
      within(list).getAllByRole("button", { name: "영구 삭제" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    await actor.click(
      within(dialog).getByRole("button", { name: "영구 삭제" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("2개")).not.toBeInTheDocument(),
    );
  });

  it("reports the actual category destination when a restored manuscript's parent is gone", async () => {
    const actor = userEvent.setup();
    let title = "",
      id = "";
    renderInWorkspace("trash", <FileTrashView />, () => {
      const node = getDb().files.find(
        (n) =>
          n.projectId === GLASS_GARDEN_ID &&
          n.kind === "document" &&
          n.docType === "manuscript" &&
          n.trashedAt,
      )!;
      node.parentId = "qa-deleted-episode";
      title = node.title;
      id = node.id;
    });
    const row = (await screen.findByText(title)).closest("li")!;
    await actor.click(within(row).getByRole("button", { name: "복원" }));
    expect(
      await screen.findByText("휴지통에서 복원했어요."),
    ).toBeInTheDocument();
    expect(
      screen.getByText(`‘${title}’을 ‘원고’에 복원했어요.`),
    ).toBeInTheDocument();
    expect(screen.queryByText("원래 위치로 복원했어요.")).toBeNull();
    const node = getDb().files.find((n) => n.id === id)!;
    expect(getDb().files.find((n) => n.id === node.parentId)).toMatchObject({
      kind: "folder",
      role: "category",
      category: "manuscript",
    });
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
    await waitFor(() =>
      expect(
        screen.queryByRole("button", { name: "변경사항 저장" }),
      ).not.toBeInTheDocument(),
    );
    expect(getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)?.title).toBe(
      "유리 정원의 연대기",
    );
  });

  it("saves a project memo only when the check is pressed", async () => {
    // 메모는 적다 지우는 곳이다. 자동 저장은 "쓰는 중"과 "남기기로 한 것"을 구분하지 못한다.
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const cards = await screen.findAllByRole("button", { name: /눌러서|./ });
    await actor.click(cards[0]);
    const editor = await screen.findByRole("textbox", { name: "메모 내용" });
    await actor.type(editor, " 추가");

    // 아직 저장하지 않았다.
    expect(getDb().memos.some((memo) => memo.body.endsWith(" 추가"))).toBe(
      false,
    );

    await actor.click(screen.getByRole("button", { name: "저장" }));
    await waitFor(() =>
      expect(getDb().memos.some((memo) => memo.body.endsWith(" 추가"))).toBe(
        true,
      ),
    );
  });

  it("drops an edit when the cancel is pressed", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const cards = await screen.findAllByRole("button", { name: /눌러서|./ });
    await actor.click(cards[0]);
    const editor = await screen.findByRole("textbox", { name: "메모 내용" });
    await actor.type(editor, " 버릴 것");
    await actor.click(screen.getByRole("button", { name: "취소" }));

    expect(getDb().memos.some((memo) => memo.body.endsWith(" 버릴 것"))).toBe(
      false,
    );
  });

  it("deletes a memo after confirmation", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const before = getDb().memos.filter((m) => m.scope === "project").length;
    // 삭제는 카드 오른쪽 위의 × 에 있다. 메뉴를 거치지 않고 바로 누른다.
    await actor.click(
      (await screen.findAllByRole("button", { name: "메모 삭제" }))[0],
    );
    // 눌러도 곧바로 지워지지 않는다. 되돌릴 수 없는 일이라 확인을 거친다.
    const dialog = await screen.findByRole("dialog");
    expect(getDb().memos.filter((m) => m.scope === "project")).toHaveLength(
      before,
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "메모 삭제" }),
    );
    await waitFor(() =>
      expect(getDb().memos.filter((m) => m.scope === "project")).toHaveLength(
        before - 1,
      ),
    );
  });

  it("closes an untouched memo when somewhere else is pressed", async () => {
    // 긴 메모는 눌러야 끝까지 읽힌다. 읽으려고 연 칸은 취소를 찾지 않고 다른 곳을 눌러 닫는다.
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const card = (await screen.findAllByRole("listitem"))[0];
    // 카드 안의 단추는 삭제, 카드 본문 순서다. 본문을 누르면 고치는 칸이 열린다.
    await actor.click(within(card).getAllByRole("button").at(-1)!);
    expect(
      await screen.findByRole("textbox", { name: "메모 내용" }),
    ).toBeInTheDocument();

    await actor.click(screen.getByRole("heading", { name: "메모" }));

    expect(screen.queryByRole("textbox", { name: "메모 내용" })).toBeNull();
  });

  it("keeps an edited memo open when somewhere else is pressed", async () => {
    // 고친 것이 있으면 남길지 버릴지는 작가가 정한다. 잘못 누른 한 번에 적던 글이 사라지면 안 된다.
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const card = (await screen.findAllByRole("listitem"))[0];
    await actor.click(within(card).getAllByRole("button").at(-1)!);
    await actor.type(
      await screen.findByRole("textbox", { name: "메모 내용" }),
      " 적던 글",
    );

    await actor.click(screen.getByRole("heading", { name: "메모" }));

    // 닫히지도, 저장되지도 않았다. 적던 글이 그대로 있다.
    expect(
      screen.getByRole("textbox", { name: "메모 내용" }),
    ).toHaveDisplayValue(/ 적던 글$/);
    expect(getDb().memos.some((memo) => memo.body.endsWith(" 적던 글"))).toBe(
      false,
    );
  });

  it("closes an empty new memo when somewhere else is pressed", async () => {
    // 새 메모를 적는 칸도 같은 칸이다. 아무것도 적지 않았으면 바깥을 눌러 닫는다.
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const before = getDb().memos.length;
    await actor.click(await screen.findByRole("button", { name: "메모 추가" }));
    expect(
      await screen.findByRole("listitem", { name: "새 메모" }),
    ).toBeInTheDocument();

    await actor.click(screen.getByRole("heading", { name: "메모" }));

    expect(screen.queryByRole("listitem", { name: "새 메모" })).toBeNull();
    expect(getDb().memos).toHaveLength(before);
  });

  it("goes to the file from a file memo's card", async () => {
    // 전에는 더보기 메뉴 안에 있었다. 메뉴를 없애면서 카드 머리의 문서 이름이 그 단추가 됐다.
    const actor = userEvent.setup();
    // 메모 화면은 문서 메모부터 보여 준다. 열려 있는 탭은 새 탭과 메모, 둘이다.
    renderInWorkspace("memo", <MemoView />);
    const memo = getDb().memos.find((m) => m.scope === "file")!;
    const file = getDb().files.find((f) => f.id === memo.fileId)!;
    // 단추의 이름은 문서 이름이고, 누르면 무슨 일이 생기는지는 설명(title)으로 붙는다.
    const link = await screen.findByRole("button", { name: file.title });
    expect(link).toHaveAttribute("title", "파일로 이동");
    await actor.click(link);

    expect(screen.getByLabelText("탭 수")).toHaveTextContent("3");
  });

  /**
   * 전에는 추가를 누르는 순간 빈 메모가 서버에 생겼다. 적다 그만두면 그 빈 메모가 목록에 남았다.
   * 이제 추가는 적는 칸만 열고, 저장해야 메모가 생긴다.
   */
  it("creates a memo only when the new one is saved", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const count = () =>
      getDb().memos.filter((memo) => memo.scope === "project").length;
    const before = count();

    await actor.click(await screen.findByRole("button", { name: "메모 추가" }));
    const composer = await screen.findByRole("listitem", { name: "새 메모" });
    const editor = within(composer).getByRole("textbox", { name: "메모 내용" });
    // 적는 칸이 열렸을 뿐, 아직 아무것도 만들어지지 않았다. 빈 채로는 남길 수 없다.
    expect(count()).toBe(before);
    expect(
      within(composer).getByRole("button", { name: "저장" }),
    ).toBeDisabled();

    await actor.type(editor, "북쪽 온실의 열쇠는 누가 갖고 있나");
    await actor.click(within(composer).getByRole("button", { name: "저장" }));

    await waitFor(() => expect(count()).toBe(before + 1));
    expect(
      getDb().memos.some(
        (memo) => memo.body === "북쪽 온실의 열쇠는 누가 갖고 있나",
      ),
    ).toBe(true);
    // 저장하면 적는 칸은 닫히고 그 메모가 목록의 카드로 남는다.
    await waitFor(() =>
      expect(screen.queryByRole("listitem", { name: "새 메모" })).toBeNull(),
    );
  });

  it("leaves nothing behind when a new memo is abandoned", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    const before = getDb().memos.length;

    await actor.click(await screen.findByRole("button", { name: "메모 추가" }));
    await actor.type(
      await screen.findByRole("textbox", { name: "메모 내용" }),
      "지울 생각",
    );
    await actor.keyboard("{Escape}");

    expect(screen.queryByRole("textbox", { name: "메모 내용" })).toBeNull();
    expect(getDb().memos).toHaveLength(before);
  });

  it("saves with Ctrl+Enter", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    await actor.click(await screen.findByRole("button", { name: "메모 추가" }));
    await actor.type(
      await screen.findByRole("textbox", { name: "메모 내용" }),
      "단축키로 남긴 메모{Control>}{Enter}{/Control}",
    );

    await waitFor(() =>
      expect(
        getDb().memos.some((memo) => memo.body === "단축키로 남긴 메모"),
      ).toBe(true),
    );
  });

  it("creates one memo when Ctrl+Enter is pressed again while it saves", async () => {
    const actor = userEvent.setup();
    renderInWorkspace("memo", <MemoView />);
    await actor.click(await screen.findByRole("radio", { name: "작품 메모" }));
    await actor.click(await screen.findByRole("button", { name: "메모 추가" }));
    const editor = await screen.findByRole("textbox", { name: "메모 내용" });
    await actor.type(editor, "한 번만 남을 메모");
    // 느린 연결. 첫 저장이 가는 동안 같은 키를 한 번 더 누른다.
    setMockLatency(150);

    await actor.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() =>
      expect(screen.getByRole("button", { name: "저장" })).toBeDisabled(),
    );
    await actor.keyboard("{Control>}{Enter}{/Control}");

    await waitFor(() =>
      expect(screen.queryByRole("listitem", { name: "새 메모" })).toBeNull(),
    );
    expect(
      getDb().memos.filter((memo) => memo.body === "한 번만 남을 메모"),
    ).toHaveLength(1);
  });
});
