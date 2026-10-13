import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import type { DocumentProperty, FileNode } from "@/domain/models";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { DocumentView } from "./document-view";
import { printRows } from "./print-sheet";

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

afterEach(() => {
  vi.restoreAllMocks();
  document.body.classList.remove("lk-printing");
});

describe("printRows", () => {
  const node = (id: string, title: string) =>
    ({ id, title, kind: "file" }) as unknown as FileNode;
  const index = new Map([
    ["p-1", node("p-1", "유리 산맥")],
    ["p-2", node("p-2", "북쪽 온실")],
  ]);
  const properties: DocumentProperty[] = [
    { id: "a", kind: "text", key: "alias", label: "별칭", value: "항해사" },
    {
      id: "d",
      kind: "text",
      key: "description",
      label: "설명",
      value: "기억 항로를 읽는다",
    },
    {
      id: "r",
      kind: "relation",
      key: "places",
      label: "관련 장소",
      targetType: "place",
      targetIds: ["p-1", "gone", "p-2"],
      descriptions: { "p-1": "처음 각성한 곳" },
    },
    { id: "e", kind: "text", key: "alias", label: "별칭", value: "  " },
  ];

  it("lists what the property table shows, in the same order", () => {
    expect(printRows("character", properties, index, null)).toEqual([
      { label: "분류", value: "캐릭터" },
      // 설명은 화면에서도 분류 바로 아래다.
      { label: "설명", value: "기억 항로를 읽는다" },
      { label: "별칭", value: "항해사" },
      // 관계의 설명은 괄호로 곁들이고, 휴지통으로 간 문서(gone)는 뺀다.
      { label: "관련 장소", value: "유리 산맥 (처음 각성한 곳), 북쪽 온실" },
      // 비어 있는 속성(공백뿐인 별칭)은 적지 않는다.
    ]);
  });

  it("adds the episode for a manuscript", () => {
    const episode = { id: "ep-1", title: "Episode 1" } as never;

    expect(printRows("manuscript", [], index, episode)).toEqual([
      { label: "분류", value: "원고" },
      { label: "에피소드", value: "Episode 1" },
    ]);
  });
});

describe("exporting a document as PDF", () => {
  function renderDocument(fileId: string) {
    return renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout({ kind: "file", fileId })}
      >
        <DocumentView fileId={fileId} paneId="pane-1" active />
      </WorkspaceProvider>,
    );
  }

  /**
   * 예전에는 인쇄 지면이 편집 화면 안쪽에 있었다. 인쇄할 때 `body` 의 자식을 지면만 빼고 모두
   * 감추는데, 지면이 그 자식의 안에 있으니 함께 감춰져 빈 종이가 나왔다.
   */
  it("prints a sheet that sits directly under body, with the title, properties and body", async () => {
    const actor = userEvent.setup();
    const pageTitle = document.title;
    // 인쇄 대화상자가 떠 있는 순간의 화면을 적어 둔다.
    const printed: {
      sheet?: HTMLElement;
      title?: string;
      printing?: boolean;
    } = {};
    window.print = vi.fn(() => {
      printed.sheet =
        document.querySelector<HTMLElement>("body > .lk-print-sheet") ??
        undefined;
      printed.title = document.title;
      printed.printing = document.body.classList.contains("lk-printing");
    });
    renderDocument("glass-garden:c-lena");

    await actor.click(await screen.findByRole("button", { name: "내보내기" }));
    await actor.click(
      await screen.findByRole("menuitem", { name: /PDF로 내보내기/ }),
    );

    await waitFor(() => expect(window.print).toHaveBeenCalledTimes(1));
    const sheet = within(printed.sheet!);
    expect(sheet.getByRole("heading", { level: 1 })).toHaveTextContent(
      "레나 아르벨",
    );
    expect(sheet.getByRole("rowheader", { name: "분류" })).toBeInTheDocument();
    expect(sheet.getByRole("cell", { name: "캐릭터" })).toBeInTheDocument();
    // 관계는 이어진 문서의 이름과 그 연결의 설명으로 적힌다.
    expect(
      sheet.getByRole("cell", { name: /유리 산맥 \(처음 각성한 곳\)/ }),
    ).toBeInTheDocument();
    expect(printed.sheet!.querySelector(".lk-print-body")).toHaveTextContent(
      "레나는 타인의 기억이 남긴 방향을 감각으로 읽는다.",
    );
    // PDF 파일 이름이 되도록 페이지 제목을 문서 제목으로 바꿔 둔다.
    expect(printed.title).toBe("레나 아르벨");
    expect(printed.printing).toBe(true);

    // 대화상자가 닫히면 원래대로 돌아온다.
    window.dispatchEvent(new Event("afterprint"));
    await waitFor(() =>
      expect(document.querySelector(".lk-print-sheet")).toBeNull(),
    );
    expect(document.title).toBe(pageTitle);
    expect(document.body).not.toHaveClass("lk-printing");
  });
});
