import { Editor } from "@tiptap/core";
import { afterEach, describe, expect, it } from "vitest";

import { createDocumentExtensions } from "./extensions";

const editors: Editor[] = [];

function roundTrip(markdown: string) {
  const editor = new Editor({
    extensions: createDocumentExtensions(),
    content: markdown,
    contentType: "markdown",
  });
  editors.push(editor);
  return editor.getMarkdown();
}

afterEach(() => {
  editors.splice(0).forEach((editor) => editor.destroy());
});

const CORPUS: Record<string, string> = {
  "korean paragraphs":
    "정원은 밤이 오면 유리보다 먼저 숨을 죽였다.\n\n오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다.",
  "full-width punctuation":
    "‘균열은 문이 아니라 기억의 방향이다.’ 그는 말했다…　그리고 멈췄다.",
  "inline marks": "**굵게**와 *기울임*, ~~취소선~~과 `코드`를 함께 쓴다.",
  headings: "# 1부\n\n## 균열의 밤\n\n본문",
  "nested lists": "- 서윤\n  - 기록관\n  - 순찰\n- 하린",
  "ordered list": "1. 문을 연다\n2. 등불을 내려놓는다\n3. 이름을 부른다",
  blockquote: "> 기억은 언제나 빛이 지난 자리에 남는다.",
  "code block with backticks": "```\nconst mark = `균열`;\n```",
  link: "[지도](https://loresentry.com)을 본다.",
  "horizontal rule": "첫 장면\n\n---\n\n둘째 장면",
  "underline extension syntax": "가 ++밑줄++ 나",
};

describe("document markdown round trip", () => {
  it.each(Object.entries(CORPUS))("preserves %s", (_, markdown) => {
    expect(roundTrip(markdown)).toBe(markdown);
  });
});
