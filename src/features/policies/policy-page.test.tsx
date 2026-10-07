import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithServices } from "@/test/render";

import { PolicyPage } from "./policy-page";

describe("PolicyPage", () => {
  it("shows the published terms with every article in the contents", () => {
    renderWithServices(<PolicyPage kind="terms" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "서비스 이용약관" }),
    ).toBeInTheDocument();
    expect(screen.getByText("2026년 9월 30일 시행")).toBeInTheDocument();
    const contents = screen.getByRole("navigation", { name: "목차" });
    expect(within(contents).getAllByRole("link")).toHaveLength(10);
    expect(
      screen.getByRole("heading", { level: 2, name: "제7조 원고 삭제와 탈퇴" }),
    ).toHaveAttribute("id", "article-7");
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("draws the privacy tables as tables and marks the draft", () => {
    renderWithServices(<PolicyPage kind="privacy" />);
    expect(
      screen.getByText(
        "게시 전 초안입니다. 최초 공개·시행일은 운영 원문 등록 시 확정합니다.",
      ),
    ).toBeInTheDocument();
    const tables = screen.getAllByRole("table");
    expect(tables.length).toBe(5);
    expect(
      within(tables[0]).getByRole("columnheader", { name: "처리 목적" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("rowheader", { name: "_ga" })).toBeInTheDocument();
    expect(screen.queryByText(/\|---/)).toBeNull();
    expect(
      screen.getByRole("link", { name: "서비스 이용약관 제7조" }),
    ).toHaveAttribute("href", "/policies/terms/#article-7");
  });
});
