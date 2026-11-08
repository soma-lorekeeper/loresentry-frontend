import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithServices, routerMock, setSearchParams } from "@/test/render";

import { ProjectGuidePage } from "./project-guide";

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

describe("ProjectGuidePage", () => {
  it("lists topics and replays the welcome tour from the header", async () => {
    const actor = userEvent.setup();
    setSearchParams("");
    renderWithServices(<ProjectGuidePage user={user} />);

    const list = screen.getByRole("list", { name: "가이드 주제" });
    expect(within(list).getAllByRole("link")).toHaveLength(11);
    expect(
      within(list).getByRole("link", { name: /작업공간 시작하기/ }),
    ).toHaveAttribute("href", "/projects/guide?topic=start");
    expect(within(list).queryByText("처음 안내 다시 보기")).toBeNull();

    await actor.click(
      screen.getByRole("button", { name: "처음 안내 다시 보기" }),
    );
    expect(routerMock.push).toHaveBeenCalledWith("/welcome/?replay=1");
  });

  /**
   * 프로젝트 목록의 가이드와 작업공간의 도움말 탭은 같은 글을 같은 모양으로 보인다. 전에는 이쪽에
   * 읽는 시간도, 한눈에 보는 표도, 관련 글도, 목차도 없었다.
   */
  it("shows a topic with everything the workspace help shows", () => {
    setSearchParams("topic=writing");
    renderWithServices(<ProjectGuidePage user={user} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "원고 작성" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/마지막 업데이트 .+ · 읽는 데 \d+분/),
    ).toBeVisible();
    const article = screen.getByRole("article");
    // 한눈에 보는 표.
    expect(within(article).getAllByRole("term").length).toBeGreaterThan(0);
    // 관련 글은 주소가 있는 링크다. 눌러도 이 화면 안에서 주소만 바뀐다.
    const related = within(article).getByRole("navigation", {
      name: "관련 문서",
    });
    for (const link of within(related).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/^\/projects\/guide\?topic=/);
    }
    // 목차는 절의 수만큼이다.
    const toc = screen.getByRole("navigation", { name: "이 문서에서" });
    expect(within(toc).getAllByRole("link")).toHaveLength(
      within(article).getAllByRole("heading", { level: 2 }).length,
    );
  });

  it("explains the AI chat and says when it is not open yet", () => {
    setSearchParams("topic=chat");
    renderWithServices(<ProjectGuidePage user={user} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "AI 챗" }),
    ).toBeInTheDocument();
    const article = screen.getByRole("article");
    expect(
      within(article)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "1. 챗 열기",
      "2. 질문하기",
      "3. 본문에서 바로 묻기",
      "4. 답과 근거 보기",
      "5. 멈추기와 다시 묻기",
      "6. 대화 찾기와 정리",
      "7. 작품이 길 때",
    ]);
    expect(article.textContent).toContain("원고는 고치지 않습니다");
  });

  it("clears a search that finds nothing", async () => {
    const actor = userEvent.setup();
    setSearchParams("");
    renderWithServices(<ProjectGuidePage user={user} />);

    await actor.type(screen.getByRole("searchbox"), "존재하지 않는 주제");
    expect(screen.getByText("검색 결과가 없어요")).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "검색어 지우기" }));
    expect(
      screen.getByRole("list", { name: "가이드 주제" }),
    ).toBeInTheDocument();
  });
});
