import type { Extensions } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

import { FindReplace } from "./find-replace";

// DOCUMENT_EDITING_PROPOSAL §3.2: 편집기 스키마를 Markdown으로 표현 가능한 범위로 잠근다.
// 밑줄은 와이어프레임에 있어 포함하며, Tiptap Markdown의 확장 문법으로 직렬화된다(미결 사항).
export function createDocumentExtensions(
  options: { placeholder?: string } = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    Markdown,
    Placeholder.configure({ placeholder: options.placeholder ?? "" }),
    FindReplace,
  ];
}
