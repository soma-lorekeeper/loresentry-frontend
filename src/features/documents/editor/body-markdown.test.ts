import { afterEach, describe, expect, it, vi } from "vitest";

import {
  bodyFromParagraphs,
  bodyToPlainText,
  type DocumentBody,
} from "@/domain/document-body";

import { bodyToMarkdown, markdownToBody } from "./body-markdown";

afterEach(() => vi.restoreAllMocks());

/**
 * Markdown 은 이제 **입출력 형식**이다. 왕복시키지 않으므로 왕복 보존을 검증하지 않고, 들여올 때와
 * 내보낼 때 각각 무엇이 되는지만 본다.
 */
describe("markdownToBody", () => {
  it("reads formatting into blocks and marks", () => {
    const body = markdownToBody("# 1부\n\n**굵게**와 *기울임*.");
    const blocks = body.doc.content ?? [];

    expect(blocks[0]).toMatchObject({ type: "heading" });
    expect(blocks[1]).toMatchObject({ type: "paragraph" });
    expect(JSON.stringify(blocks[1])).toContain("bold");
  });

  it("reads a list as one block", () => {
    const body = markdownToBody("- 서윤\n- 하린");
    expect((body.doc.content ?? [])[0]).toMatchObject({ type: "bulletList" });
    expect(bodyToPlainText(body)).toBe("서윤\n하린");
  });
});

describe("bodyToMarkdown", () => {
  it("writes the marks back out", () => {
    const body: DocumentBody = {
      schemaVersion: 1,
      doc: {
        type: "doc",
        content: [
          {
            type: "paragraph",
            content: [
              { type: "text", marks: [{ type: "bold" }], text: "굵게" },
              { type: "text", text: "와 보통" },
            ],
          },
        ],
      },
    };

    expect(bodyToMarkdown(body)).toBe("**굵게**와 보통");
  });

  /**
   * **왕복은 여전히 손실이 있다.** 이것이 저장 형식을 바꾼 이유다 — Markdown 은 글자와 서식 기호를
   * 한 문자열에 섞으므로, 일반 문단으로 쓴 `# …` 을 내보낸 뒤 다시 읽으면 제목이 된다.
   *
   * <p>그래서 저장은 JSON 이고 Markdown 은 내보내기 전용이다. 이 테스트는 그 손실이 **내보내기
   * 경로에만** 남아 있음을 못 박는다. 저장 경로에서 같은 글이 그대로 남는 것은
   * `api-services.test.ts`·`mock-services.test.ts` 가 확인한다.
   */
  it("still loses plain text that looks like formatting, which is why storage is json", () => {
    const body = bodyFromParagraphs("# 해시로 시작하는 문장");

    // 본문 자체는 문단이고 글자도 그대로다.
    expect((body.doc.content ?? [])[0]).toMatchObject({ type: "paragraph" });
    expect(bodyToPlainText(body)).toBe("# 해시로 시작하는 문장");

    // 그것을 Markdown 으로 내보내 다시 읽으면 제목이 된다. 내보내기는 한 방향이다.
    const again = markdownToBody(bodyToMarkdown(body));
    expect((again.doc.content ?? [])[0]).toMatchObject({ type: "heading" });
  });
});
