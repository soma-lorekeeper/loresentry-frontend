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
    expect(within(list).getAllByRole("link")).toHaveLength(6);
    expect(
      within(list).getByRole("link", { name: /작업공간 시작하기/ }),
    ).toHaveAttribute("href", "/projects/guide?topic=start");
    expect(within(list).queryByText("처음 안내 다시 보기")).toBeNull();

    await actor.click(
      screen.getByRole("button", { name: "처음 안내 다시 보기" }),
    );
    expect(routerMock.push).toHaveBeenCalledWith("/welcome/?replay=1");
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
