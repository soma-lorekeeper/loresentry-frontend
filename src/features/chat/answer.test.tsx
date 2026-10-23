import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ChatCitation } from "@/domain/models";

import { Answer, answerPlainText, parseAnswer } from "./answer";

const citations: ChatCitation[] = [
  {
    kind: "document",
    fileId: "f-1",
    title: "12화 · 균열의 밤",
    docType: "manuscript",
    quote: "문을 밀었다.",
  },
  { kind: "memo", memoId: "m-1", title: "균열의 방향", quote: null },
];

describe("parseAnswer", () => {
  it("reads paragraphs, list items, bold text and citation markers", () => {
    const blocks = parseAnswer("첫 문단 **굵게** [[1]]\n- 항목 [[2]]");
    expect(blocks.map((b) => b.kind)).toEqual(["p", "li"]);
    expect(blocks[0].parts.map((p) => p.type)).toEqual([
      "text",
      "strong",
      "text",
      "cite",
    ]);
  });
});

describe("Answer", () => {
  it("uses a readable quote or fallback for blank citation titles in the UI and copied text", () => {
    const notes: ChatCitation[] = [
      {
        kind: "memo",
        memoId: "one",
        title: " ",
        quote: "균열은 기억의 방향이다",
      },
      { kind: "memo", memoId: "two", title: "", quote: null },
    ];
    render(
      <Answer
        content="메모 [[1]] 빈 메모 [[2]]"
        citations={notes}
        onOpen={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", {
        name: "메모 ‘균열은 기억의 방향이다’ 열기",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "메모 ‘빈 메모’ 열기" }),
    ).toBeInTheDocument();
    expect(answerPlainText("메모 [[1]] 빈 메모 [[2]]", notes)).toBe(
      "메모 (균열은 기억의 방향이다) 빈 메모 (빈 메모)",
    );
  });
  it("shows document and note citations as different chips", () => {
    render(
      <Answer
        content="문이 열려요. [[1]] 메모에도 있어요. [[2]]"
        citations={citations}
        onOpen={() => {}}
      />,
    );
    expect(
      screen.getByRole("button", { name: "근거 문서 ‘12화 · 균열의 밤’ 열기" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "메모 ‘균열의 방향’ 열기" }),
    ).toBeInTheDocument();
  });

  it("hides a marker or bold mark that has only half arrived", () => {
    const { container } = render(
      <Answer
        content="문이 **열려요 [["
        citations={citations}
        onOpen={() => {}}
        streaming
      />,
    );
    expect(container.textContent).toBe("문이 열려요 ");
  });
});

describe("answerPlainText", () => {
  it("writes citation titles in place of markers", () => {
    expect(answerPlainText("문이 **열려요**. [[1]]", citations)).toBe(
      "문이 열려요. (12화 · 균열의 밤)",
    );
  });
});
