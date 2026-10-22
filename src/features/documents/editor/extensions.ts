import type { Extensions } from "@tiptap/core";
import { Markdown } from "@tiptap/markdown";
import { Placeholder } from "@tiptap/extensions";
import StarterKit from "@tiptap/starter-kit";

import { FindReplace } from "./find-replace";
import { FormattedDocument } from "./formatted-document";
import { DocumentTextAlign } from "./text-align";

// DOCUMENT_EDITING_PROPOSAL §3.2: 편집기 스키마를 Markdown으로 표현 가능한 범위로 잠근다.
// 밑줄은 와이어프레임에 있어 포함하며, Tiptap Markdown의 확장 문법으로 직렬화된다(미결 사항).
// 문단 정렬은 노드를 늘리지 않고 문단·제목의 속성으로 담는다(text-align.ts). Markdown 에는
// 정렬을 적을 자리가 없어 `.md`·`.txt` 내보내기에는 실리지 않는다.
export function createDocumentExtensions(
  options: { placeholder?: string } = {},
): Extensions {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      link: { openOnClick: false, autolink: true },
    }),
    Markdown,
    FormattedDocument,
    DocumentTextAlign,
    Placeholder.configure({ placeholder: options.placeholder ?? "" }),
    FindReplace,
  ];
}
