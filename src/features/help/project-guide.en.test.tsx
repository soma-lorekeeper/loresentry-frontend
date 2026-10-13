import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithServices, setSearchParams } from "@/test/render";

import { ProjectGuidePage } from "./project-guide";

const HANGUL = /[가-힣]/;

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

describe("ProjectGuidePage (English build)", () => {
  it("lists and searches the English topics", async () => {
    const actor = userEvent.setup();
    setSearchParams("");
    renderWithServices(<ProjectGuidePage user={user} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "User guide" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Replay the intro" }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Guide topics" });
    expect(within(list).getAllByRole("link")).toHaveLength(6);
    expect(list.textContent).not.toMatch(HANGUL);
    expect(
      within(list).getByRole("link", { name: /Getting started/ }),
    ).toHaveAttribute("href", "/projects/guide?topic=start");

    const search = screen.getByRole("searchbox");
    expect(search).toHaveAttribute("placeholder", "Search the guide");
    await actor.type(search, "find and replace");
    expect(
      within(screen.getByRole("list", { name: "Guide topics" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(1);

    await actor.clear(search);
    await actor.type(search, "nothing like this");
    expect(screen.getByText("No results")).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "Clear search" }));
    expect(screen.getByRole("list", { name: "Guide topics" })).toBeVisible();
  });

  it("shows a topic in English", () => {
    setSearchParams("topic=writing");
    renderWithServices(<ProjectGuidePage user={user} />);

    expect(
      screen.getByRole("heading", { level: 1, name: "Writing chapters" }),
    ).toBeInTheDocument();
    const breadcrumb = screen.getByRole("navigation", { name: "Breadcrumb" });
    expect(
      within(breadcrumb).getByRole("link", { name: "User guide" }),
    ).toHaveAttribute("href", "/projects/guide");
    const article = screen.getByRole("article");
    // 절마다 번호 붙은 소제목이다. 작업공간의 도움말 탭과 같은 글이다.
    expect(within(article).getAllByRole("heading", { level: 2 })).toHaveLength(
      5,
    );
    expect(article.textContent).toContain("Find and replace");
    // 가져오기도 이 글에서 설명한다.
    expect(article.textContent).toContain(
      "nothing is created until you press Import",
    );
    expect(article.textContent).not.toMatch(HANGUL);
  });
});
