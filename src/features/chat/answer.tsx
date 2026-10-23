"use client";

import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { ChatCitation } from "@/domain/models";
import { t } from "@/i18n";

import styles from "./chat.module.css";

type Part =
  | { type: "text" | "strong"; text: string; start: number }
  | { type: "cite"; index: number; start: number };

interface Block {
  kind: "p" | "li";
  parts: Part[];
}

const INLINE = /\*\*(.+?)\*\*|\[\[(\d+)\]\]/g;

function settle(content: string, streaming: boolean) {
  if (!streaming) return content;
  let text = content.replace(/\[\[?\d*\]?$/, "");
  const bold = text.match(/\*\*/g)?.length ?? 0;
  if (bold % 2 === 1) {
    const at = text.lastIndexOf("**");
    text = text.slice(0, at) + text.slice(at + 2);
  }
  return text.replace(/\*$/, "");
}

export function parseAnswer(content: string): Block[] {
  const blocks: Block[] = [];
  let offset = 0;
  for (const line of content.split("\n")) {
    const lineStart = offset;
    offset += line.length + 1;
    if (!line.trim()) continue;
    const list = line.startsWith("- ");
    const body = list ? line.slice(2) : line;
    const base = lineStart + (list ? 2 : 0);
    const parts: Part[] = [];
    let last = 0;
    for (const match of body.matchAll(INLINE)) {
      if (match.index > last)
        parts.push({
          type: "text",
          text: body.slice(last, match.index),
          start: base + last,
        });
      if (match[1] !== undefined)
        parts.push({
          type: "strong",
          text: match[1],
          start: base + match.index + 2,
        });
      else
        parts.push({
          type: "cite",
          index: Number(match[2]),
          start: base + match.index,
        });
      last = match.index + match[0].length;
    }
    if (last < body.length)
      parts.push({ type: "text", text: body.slice(last), start: base + last });
    blocks.push({ kind: list ? "li" : "p", parts });
  }
  return blocks;
}

export function citationTitle(citation: ChatCitation) {
  return (
    citation.title.trim() ||
    citation.quote?.trim().slice(0, 60) ||
    (citation.kind === "memo" ? t("빈 메모") : t("제목 없음"))
  );
}

export function answerPlainText(content: string, citations: ChatCitation[]) {
  return content
    .replace(/\s*\[\[(\d+)\]\]/g, (_, index) => {
      const citation = citations[Number(index) - 1];
      return citation ? ` (${citationTitle(citation)})` : "";
    })
    .replace(/\*\*/g, "")
    .replace(/ +\n/g, "\n")
    .trim();
}

export function highlight(text: string, term: string | undefined) {
  const needle = term?.trim();
  if (!needle) return text;
  const lower = text.toLocaleLowerCase();
  const target = needle.toLocaleLowerCase();
  const out: ReactNode[] = [];
  let from = 0;
  let at = lower.indexOf(target);
  while (at >= 0) {
    if (at > from) out.push(text.slice(from, at));
    out.push(
      <mark key={at} className={styles.hit}>
        {text.slice(at, at + target.length)}
      </mark>,
    );
    from = at + target.length;
    at = lower.indexOf(target, from);
  }
  if (from < text.length) out.push(text.slice(from));
  return out;
}

function CiteChip({
  citation,
  onOpen,
  fresh,
}: {
  citation: ChatCitation | undefined;
  onOpen: (citation: ChatCitation) => void;
  fresh: boolean;
}) {
  const [rect, setRect] = useState<DOMRect | null>(null);
  if (!citation) return null;
  const title = citationTitle(citation);
  const memo = citation.kind === "memo";
  const show = (el: HTMLElement) =>
    citation.quote && setRect(el.getBoundingClientRect());
  const sentence = citation.quote ? /[다요.?!”"]$/.test(citation.quote) : false;
  return (
    <>
      <button
        type="button"
        className={styles.cite}
        data-memo={memo || undefined}
        data-kind={memo ? undefined : citation.docType}
        data-fresh={fresh || undefined}
        aria-label={
          memo
            ? t("메모 ‘{title}’ 열기", { title })
            : t("근거 문서 ‘{title}’ 열기", { title })
        }
        onClick={() => onOpen(citation)}
        onMouseEnter={(event) => show(event.currentTarget)}
        onMouseLeave={() => setRect(null)}
        onFocus={(event) => show(event.currentTarget)}
        onBlur={() => setRect(null)}
      >
        <Icon
          name={
            memo
              ? "sticky-note"
              : DOCUMENT_TYPE_META[citation.docType].entityIcon
          }
          size={12}
        />
        <span className={styles.citeLabel}>
          {memo ? t("메모 · {title}", { title }) : title}
        </span>
      </button>
      {rect &&
        citation.quote &&
        createPortal(
          <div
            role="tooltip"
            className={styles.quoteCard}
            style={{
              left: Math.min(rect.left, window.innerWidth - 300),
              top: rect.top - 8,
            }}
          >
            {memo && <p className={styles.quoteSource}>{t("작가 메모")}</p>}
            <p className={sentence ? styles.quoteSentence : styles.quoteNote}>
              {citation.quote}
            </p>
            <span className={styles.quoteHint}>
              <Icon name="corner-down-left" size={11} />
              {memo ? t("눌러서 메모 보기") : t("눌러서 문서 열기")}
            </span>
          </div>,
          document.body,
        )}
    </>
  );
}

export function Answer({
  content,
  citations,
  onOpen,
  streaming = false,
  freshFrom = Number.POSITIVE_INFINITY,
  tick = 0,
  term,
}: {
  content: string;
  citations: ChatCitation[];
  onOpen: (citation: ChatCitation) => void;
  streaming?: boolean;
  freshFrom?: number;
  tick?: number;
  term?: string;
}) {
  const blocks = parseAnswer(settle(content, streaming));
  const rendered = blocks.map((block, b) => {
    const nodes = block.parts.map((part, p) => {
      if (part.type === "cite")
        return (
          <CiteChip
            key={`c${p}`}
            citation={citations[part.index - 1]}
            onOpen={onOpen}
            fresh={part.start >= freshFrom}
          />
        );
      const cut = Math.max(
        0,
        Math.min(part.text.length, freshFrom - part.start),
      );
      const head = part.text.slice(0, cut);
      const tail = part.text.slice(cut);
      const Tag = part.type === "strong" ? "strong" : "span";
      return (
        <Tag key={`t${p}`}>
          {highlight(head, term)}
          {tail && (
            <span key={tick} className={styles.fresh}>
              {tail}
            </span>
          )}
        </Tag>
      );
    });
    if (streaming && b === blocks.length - 1)
      nodes.push(<span key="caret" className={styles.caret} />);
    return { kind: block.kind, nodes };
  });

  const out: ReactNode[] = [];
  for (let i = 0; i < rendered.length; i += 1) {
    if (rendered[i].kind === "li") {
      const items: ReactNode[] = [];
      const first = i;
      while (i < rendered.length && rendered[i].kind === "li") {
        items.push(<li key={i}>{rendered[i].nodes}</li>);
        i += 1;
      }
      i -= 1;
      out.push(
        <ul key={`ul${first}`} className={styles.list}>
          {items}
        </ul>,
      );
    } else out.push(<p key={i}>{rendered[i].nodes}</p>);
  }
  if (streaming && rendered.length === 0)
    out.push(
      <p key="caret">
        <span className={styles.caret} />
      </p>,
    );
  return <div className={styles.answer}>{out}</div>;
}
