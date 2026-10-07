import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { parseMarkdown, renderInline } from "./markdown";

const id = (_: string, index: number) => `s-${index + 1}`;

describe("policy markdown", () => {
  it("splits headings, paragraphs, lists and tables", () => {
    const blocks = parseMarkdown(
      [
        "## 1. 처리 목적",
        "",
        "첫 줄이",
        "이어집니다.",
        "",
        "| 목적 | 항목 |",
        "|---|---|",
        "| 회원 식별 | 계정 식별자 |",
        "",
        "- 운영자: 팀",
        "- 이메일: `a@b.c`",
      ].join("\n"),
      id,
    );
    expect(blocks).toEqual([
      { kind: "heading", id: "s-1", text: "1. 처리 목적" },
      { kind: "paragraph", text: "첫 줄이 이어집니다." },
      {
        kind: "table",
        header: ["목적", "항목"],
        rows: [["회원 식별", "계정 식별자"]],
      },
      { kind: "list", items: ["운영자: 팀", "이메일: `a@b.c`"] },
    ]);
  });

  it("does not add a space after a wrapped middle dot", () => {
    const [block] = parseMarkdown("저장·복제·\n가공합니다.", id);
    expect(block).toEqual({ kind: "paragraph", text: "저장·복제·가공합니다." });
  });

  it("renders links, code and bold, opening outside links in a new tab", () => {
    render(
      <p>
        {renderInline(
          "**굵게** `코드` [처리방침](/policies/privacy/) [법령](https://law.go.kr)",
        )}
      </p>,
    );
    expect(screen.getByText("굵게").tagName).toBe("STRONG");
    expect(screen.getByText("코드").tagName).toBe("CODE");
    expect(screen.getByRole("link", { name: "처리방침" })).toHaveAttribute(
      "href",
      "/policies/privacy/",
    );
    expect(screen.getByRole("link", { name: "법령" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});
