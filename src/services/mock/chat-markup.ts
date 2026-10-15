import type { ChatCitation, DocumentNode, Memo } from "@/domain/models";

const MARK = /\[\[(doc|memo):([^|\]]+)(?:\|([^\]]+))?\]\]/g;

export function compileChatMarkup(
  markup: string,
  docs: DocumentNode[],
  memos: Memo[],
): { content: string; citations: ChatCitation[] } {
  const citations: ChatCitation[] = [];
  const indexOf = (citation: ChatCitation) => {
    const found = citations.findIndex(
      (existing) =>
        existing.kind === citation.kind &&
        existing.title === citation.title &&
        existing.quote === citation.quote,
    );
    if (found >= 0) return found + 1;
    citations.push(citation);
    return citations.length;
  };
  const content = markup.replace(MARK, (_, kind, title, quote) => {
    if (kind === "doc") {
      const doc = docs.find((node) => node.title === title);
      if (!doc) return "";
      return `[[${indexOf({
        kind: "document",
        fileId: doc.id,
        title: doc.title,
        docType: doc.docType,
        quote: quote ?? null,
      })}]]`;
    }
    const memo = memos.find((note) => note.title === title);
    if (!memo) return "";
    return `[[${indexOf({
      kind: "memo",
      memoId: memo.id,
      title: memo.title,
      quote: quote ?? null,
    })}]]`;
  });
  return { content, citations };
}

export function chatPreview(content: string, citations: ChatCitation[]) {
  const flat = content
    .replace(
      /\[\[(\d+)\]\]/g,
      (marker: string, index: string, offset: number) => {
        const next = content[offset + marker.length];
        const inline = next !== undefined && !/\s/.test(next);
        return inline ? (citations[Number(index) - 1]?.title ?? "") : "";
      },
    )
    .replace(/\*\*/g, "")
    .replace(/^- /gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return flat.length > 80 ? `${flat.slice(0, 80)}…` : flat;
}

export function chatTitle(text: string) {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > 24 ? `${flat.slice(0, 23)}…` : flat;
}
