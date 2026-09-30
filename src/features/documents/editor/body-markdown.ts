import { Editor } from "@tiptap/core";

import {
  bodyOf,
  bodyToPlainText,
  type DocumentBody,
} from "@/domain/document-body";

import { createDocumentExtensions } from "./extensions";

/**
 * Markdown 과 본문 사이 변환. **입출력에서만** 쓴다.
 *
 * <p>저장 형식은 에디터 JSON 이다. Markdown 은 가져올 때 한 번 들어오고 내보낼 때 한 번 나가는
 * 형식일 뿐이며, 둘 사이를 왕복시키지 않는다 — 왕복이 사용자가 쓴 문단을 다른 것으로 바꿨다.
 *
 * <p>화면에 붙지 않는 에디터를 잠깐 만들어 쓴다. 변환 규칙을 따로 구현하면 화면의 에디터와
 * 어긋나므로, 같은 확장 구성을 그대로 쓴다.
 */
function withEditor<T>(
  read: (editor: Editor) => T,
  content?: unknown,
  markdown = false,
): T {
  const editor = new Editor(
    markdown
      ? {
          extensions: createDocumentExtensions(),
          content: content as string,
          contentType: "markdown",
        }
      : { extensions: createDocumentExtensions(), content: content as object },
  );
  try {
    return read(editor);
  } finally {
    editor.destroy();
  }
}

/** 레거시 본문·옛 버전 스냅샷과 `.md` 가져오기가 쓴다. */
export function markdownToBody(markdown: string): DocumentBody {
  return withEditor((editor) => bodyOf(editor.getJSON()), markdown, true);
}

/** `.md` 내보내기만 쓴다. */
export function bodyToMarkdown(body: DocumentBody): string {
  return withEditor((editor) => editor.getMarkdown(), body.doc);
}

/** `.txt` 내보내기. 서버의 추출 규칙과 같다. */
export function bodyToText(body: DocumentBody): string {
  return bodyToPlainText(body);
}
