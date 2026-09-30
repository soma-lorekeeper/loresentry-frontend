import type { JSONContent } from "@tiptap/core";

/**
 * 문서 본문. 에디터 문서 구조를 그대로 담는다.
 *
 * <p>전에는 Markdown 문자열 하나였다. 그 형식은 글자와 서식 기호를 한 곳에 섞으므로, 사용자가 쓴
 * 일반 문단이 다시 열 때 다른 것으로 바뀌었다 — `# 로 시작하는 문장`은 제목이 되고, `1. 로 시작하는
 * 문장`은 번호 목록이 되고, `++감싼 문장++`은 밑줄이 됐다. 문단별 정렬·들여쓰기를 담을 자리도 없었다.
 *
 * <p>Markdown 은 이제 **입출력 형식**일 뿐이다. 가져오기·내보내기에서만 변환한다.
 */
export interface DocumentBody {
  schemaVersion: 1;
  doc: JSONContent;
}

/** 에디터 스키마의 판. 노드·마크 구성이 바뀌면 서버와 함께 올린다. */
export const BODY_SCHEMA_VERSION = 1;

/** 빈 문서는 문단 하나다. 에디터가 빈 문서를 그렇게 만든다. */
export function emptyBody(): DocumentBody {
  return {
    schemaVersion: BODY_SCHEMA_VERSION,
    doc: { type: "doc", content: [{ type: "paragraph" }] },
  };
}

export function bodyOf(doc: JSONContent): DocumentBody {
  return { schemaVersion: BODY_SCHEMA_VERSION, doc };
}

/** 최상위 블록 배열. 문단 단위 비교·병합·차이 보기가 이 단위로 돌아간다. */
export function bodyBlocks(body: DocumentBody): JSONContent[] {
  return body.doc.content ?? [];
}

export function bodyFromBlocks(blocks: JSONContent[]): DocumentBody {
  return bodyOf({
    type: "doc",
    content: blocks.length > 0 ? blocks : [{ type: "paragraph" }],
  });
}

/** 줄마다 문단 하나. `.txt` 가져오기가 쓴다. */
export function bodyFromPlainText(text: string): DocumentBody {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  return bodyFromBlocks(
    lines.map((line) =>
      line.length === 0
        ? { type: "paragraph" }
        : { type: "paragraph", content: [{ type: "text", text: line }] },
    ),
  );
}

/**
 * 빈 줄로 나뉜 덩어리마다 문단 하나. 시드와 예시 본문이 쓴다 — 사람이 쓴 글은 빈 줄로 문단을
 * 나누지만, 저장된 본문에서는 그 빈 줄이 블록 경계 자체다.
 */
export function bodyFromParagraphs(text: string): DocumentBody {
  return bodyFromBlocks(
    text
      .replace(/\r\n?/g, "\n")
      .split(/\n{2,}/)
      .map((paragraph) =>
        paragraph.length === 0
          ? { type: "paragraph" }
          : { type: "paragraph", content: [{ type: "text", text: paragraph }] },
      ),
  );
}

/**
 * 순수 텍스트. 블록 사이는 줄바꿈, 블록 안은 이어 붙인다.
 *
 * <p>서버의 `BodyText.extract` 와 **같은 규칙**이어야 한다. 다르면 같은 문서의 글자 수가 화면과
 * 서버에서 다르게 보인다.
 */
export function bodyToPlainText(body: DocumentBody): string {
  return bodyBlocks(body).map(blockToPlainText).join("\n");
}

export function blockToPlainText(node: JSONContent): string {
  if (node.type === "text") return node.text ?? "";
  if (node.type === "hardBreak") return "\n";
  const children = node.content ?? [];
  const nested =
    node.type === "bulletList" ||
    node.type === "orderedList" ||
    node.type === "blockquote" ||
    node.type === "listItem";
  return children.map(blockToPlainText).join(nested ? "\n" : "");
}

/**
 * 같은 본문인가. 저장할 것이 있는지 판단한다.
 *
 * <p>직렬화 비교다. 키 순서가 다르면 다른 것으로 보지만, 같은 에디터가 만든 값끼리는 순서가 같다.
 */
export function sameBody(a: DocumentBody, b: DocumentBody): boolean {
  return JSON.stringify(a.doc) === JSON.stringify(b.doc);
}

export function sameBlock(a: JSONContent, b: JSONContent): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}
