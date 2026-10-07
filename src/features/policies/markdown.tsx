import { Fragment, type ReactNode } from "react";

/**
 * 약관·처리방침 원문을 그리는 작은 마크다운. 원문이 쓰는 것만 다룬다 — `## ` 제목, 빈 줄로 나뉜
 * 문단, `- ` 목록, 표, `**굵게**`, `` `코드` ``, `[글](주소)`. 원문 저장소(loresentry-authentication
 * `docs/privacy/*.md`)와 같은 형식이라 문안을 고칠 때 그대로 옮겨 올 수 있다.
 */
export type Block =
  | { kind: "heading"; id: string; text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "list"; items: string[] }
  | { kind: "table"; header: string[]; rows: string[][] };

function cells(line: string) {
  return line
    .trim()
    .replace(/^\||\|$/g, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** 원문은 줄 끝에서 감싼다. 이어 붙일 때 `·` 로 끝난 줄 뒤에는 띄우지 않는다. */
function joinLines(lines: string[]) {
  return lines.reduce(
    (text, line) =>
      !text ? line : text.endsWith("·") ? text + line : `${text} ${line}`,
    "",
  );
}

export function parseMarkdown(
  source: string,
  headingId: (text: string, index: number) => string,
): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let headings = 0;
  const lines = source.split("\n");

  const flush = () => {
    if (paragraph.length)
      blocks.push({ kind: "paragraph", text: joinLines(paragraph) });
    paragraph = [];
  };

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i].trim();
    if (!line) {
      flush();
    } else if (line.startsWith("## ")) {
      flush();
      const text = line.slice(3).trim();
      blocks.push({ kind: "heading", id: headingId(text, headings), text });
      headings += 1;
    } else if (line.startsWith("- ")) {
      flush();
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2).trim());
        i += 1;
      }
      i -= 1;
      blocks.push({ kind: "list", items });
    } else if (line.startsWith("|")) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const row = lines[i].trim();
        if (!/^\|[\s|:-]+\|$/.test(row)) rows.push(cells(row));
        i += 1;
      }
      i -= 1;
      const [header = [], ...body] = rows;
      blocks.push({ kind: "table", header, rows: body });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

const INLINE = /\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)\s]+)\)/g;

export function renderInline(text: string): ReactNode {
  const parts: ReactNode[] = [];
  let last = 0;
  let key = 0;
  for (const match of text.matchAll(INLINE)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const [whole, bold, code, label, href] = match;
    if (bold !== undefined) {
      parts.push(<strong key={key++}>{bold}</strong>);
    } else if (code !== undefined) {
      parts.push(<code key={key++}>{code}</code>);
    } else if (/^https?:/.test(href)) {
      parts.push(
        <a key={key++} href={href} target="_blank" rel="noopener noreferrer">
          {label}
        </a>,
      );
    } else {
      parts.push(
        <a key={key++} href={href}>
          {label}
        </a>,
      );
    }
    last = at + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.map((part, index) => <Fragment key={index}>{part}</Fragment>);
}
