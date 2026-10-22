import { Extension, type Editor, type JSONContent } from "@tiptap/core";
import type { Transaction } from "@tiptap/pm/state";

import { DOCUMENT_FORMAT_KEYS, type DocumentFormat } from "../document-format";

export const FormattedDocument = Extension.create({
  name: "formattedDocument",

  addGlobalAttributes() {
    return [
      {
        types: ["doc"],
        attributes: Object.fromEntries(
          DOCUMENT_FORMAT_KEYS.map((key) => [
            key,
            { default: null, rendered: false },
          ]),
        ),
      },
    ];
  },
});

function writeFormat(
  tr: Transaction,
  format: Partial<Record<keyof DocumentFormat, unknown>>,
) {
  for (const key of DOCUMENT_FORMAT_KEYS) {
    const value = format[key] ?? null;
    if (tr.doc.attrs[key] !== value) tr.setDocAttribute(key, value);
  }
}

export function setDocumentFormat(editor: Editor, format: DocumentFormat) {
  return editor
    .chain()
    .focus(null, { scrollIntoView: false })
    .command(({ tr, dispatch }) => {
      if (dispatch) writeFormat(tr, format);
      return true;
    })
    .run();
}

export function replaceDocument(editor: Editor, doc: JSONContent) {
  return editor
    .chain()
    .setContent(doc, { emitUpdate: false })
    .command(({ tr, dispatch }) => {
      if (dispatch) writeFormat(tr, doc.attrs ?? {});
      return true;
    })
    .run();
}

export function withoutEmptyFormat(doc: JSONContent): JSONContent {
  if (!doc.attrs) return doc;
  const attrs = Object.fromEntries(
    Object.entries(doc.attrs).filter(([, value]) => value != null),
  );
  const next = { ...doc };
  if (Object.keys(attrs).length > 0) next.attrs = attrs;
  else delete next.attrs;
  return next;
}
