import { describe, expect, it } from "vitest";

import {
  bodyFromPlainText,
  bodyToPlainText,
  emptyBody,
} from "@/domain/document-body";

import { mergeParagraphs } from "./merge-text";

function merged(
  base: string,
  mine: string,
  theirs: string,
): string | "conflict" {
  const result = mergeParagraphs(
    bodyFromPlainText(base),
    bodyFromPlainText(mine),
    bodyFromPlainText(theirs),
  );
  return result.ok ? bodyToPlainText(result.body) : "conflict";
}

describe("mergeParagraphs", () => {
  const base = "첫 문단\n둘째 문단\n셋째 문단";

  it("merges edits to different blocks", () => {
    expect(
      merged(
        base,
        "첫 문단 고침\n둘째 문단\n셋째 문단",
        "첫 문단\n둘째 문단\n셋째 문단 고침",
      ),
    ).toBe("첫 문단 고침\n둘째 문단\n셋째 문단 고침");
  });

  it("refuses to guess when both sides edit the same block", () => {
    expect(
      merged(
        base,
        "첫 문단 A\n둘째 문단\n셋째 문단",
        "첫 문단 B\n둘째 문단\n셋째 문단",
      ),
    ).toBe("conflict");
  });

  it("takes the only changed side", () => {
    expect(merged(base, base, "바뀜")).toBe("바뀜");
    expect(merged(base, "내 것만 바뀜", base)).toBe("내 것만 바뀜");
  });

  /**
   * 블록이 추가·삭제되면 어느 블록이 어느 블록에 대응하는지 단정할 수 없다. 조용히 한쪽을 버리는
   * 것보다 사용자가 고르는 편이 낫다.
   */
  it("treats an added or removed block as a conflict", () => {
    expect(
      merged(base, `${base}\n넷째 문단`, "첫 문단 고침\n둘째 문단\n셋째 문단"),
    ).toBe("conflict");
    expect(
      merged(base, "첫 문단\n셋째 문단", "첫 문단\n둘째 문단\n셋째 문단 고침"),
    ).toBe("conflict");
  });

  it("keeps a block's formatting, not just its text", () => {
    // 같은 글자라도 마크가 다르면 다른 블록이다. 문자열 비교로는 알 수 없었다.
    const plain = bodyFromPlainText("문단");
    const bold = {
      schemaVersion: 1 as const,
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "문단" },
            ],
          },
        ],
      },
    };

    const result = mergeParagraphs(plain, bold, plain);
    expect(result.ok && result.body.doc).toEqual(bold.doc);
  });

  it("merges an empty body without inventing blocks", () => {
    const result = mergeParagraphs(emptyBody(), emptyBody(), emptyBody());
    expect(result.ok && bodyToPlainText(result.body)).toBe("");
  });
});
