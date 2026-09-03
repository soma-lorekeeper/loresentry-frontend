import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { ProjectGuide } from "./project-guide";

describe("ProjectGuide", () => {
  it("marks the global guide location and exposes stable topic URLs", async () => {
    const user = userEvent.setup();
    render(<ProjectGuide />);

    expect(screen.getByRole("link", { name: "사용 가이드" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    const first = screen.getByRole("link", { name: /작업공간 시작하기/ });
    const last = screen.getByRole("link", { name: /휴지통과 복원/ });
    expect(first).toHaveAttribute(
      "href",
      "/projects/guide?topic=workspace-start",
    );

    first.focus();
    await user.keyboard("{End}");
    expect(last).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(first).toHaveFocus();
  });

  it("renders the selected article with a single title and linked contents", () => {
    render(<ProjectGuide topicId="manuscript" />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "원고 작성",
    );
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(3);
    expect(
      screen.getByRole("navigation", { name: "이 문서의 목차" }),
    ).toHaveTextContent("저장 상태 확인하기");
    expect(
      screen.getByRole("link", { name: /가이드 목록으로/ }),
    ).toHaveAttribute("href", "/projects/guide");
  });

  it("returns from the topic list to the project navigation focus target", () => {
    render(<ProjectGuide />);

    expect(
      screen.getByRole("link", { name: /프로젝트 목록으로 돌아가기/ }),
    ).toHaveAttribute("href", "/projects#project-navigation-list");
  });
});
