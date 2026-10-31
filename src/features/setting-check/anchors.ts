import type { SettingCheckFinding } from "@/domain/setting-check";

export interface Span {
  start: number;
  end: number;
}

export interface Anchor extends Span {
  key: string;
  paragraph: number;
  findingIds: string[];
}

export interface ManuscriptAnchors {
  anchors: Anchor[];
  /** 설정 충돌 → 원고 자리. 고친 원고에서 문장을 찾지 못한 설정 충돌은 없다 */
  anchorOf: Map<string, Anchor>;
  /** 원고 순서. 자리를 찾지 못한 설정 충돌이 맨 앞에 온다 */
  ordered: SettingCheckFinding[];
}

const EDGE = /^["'“”‘’「」『』\s]+|["'“”‘’「」『』.,!?…\s]+$/g;

function folded(text: string) {
  const chars: string[] = [];
  const index: number[] = [];
  let space = false;
  for (let i = 0; i < text.length; i += 1) {
    if (/\s/.test(text[i])) {
      space = chars.length > 0;
      continue;
    }
    if (space) {
      chars.push(" ");
      index.push(i);
      space = false;
    }
    chars.push(text[i]);
    index.push(i);
  }
  return { text: chars.join(""), index };
}

/** 글 안에서 문장의 자리. 띄어쓰기 차이와 문장 앞뒤의 따옴표·마침표는 따지지 않는다 */
export function locate(haystack: string, needle: string): Span | null {
  const target = folded(needle.replace(EDGE, "")).text;
  if (!target) return null;
  const source = folded(haystack);
  const at = source.text.indexOf(target);
  if (at < 0) return null;
  const last = at + target.length - 1;
  return { start: source.index[at], end: source.index[last] + 1 };
}

export function anchorFindings(
  paragraphs: readonly string[],
  findings: readonly SettingCheckFinding[],
): ManuscriptAnchors {
  const found: Array<{ finding: SettingCheckFinding; at: Anchor }> = [];
  const loose: SettingCheckFinding[] = [];
  for (const finding of findings) {
    let hit: Anchor | null = null;
    for (let p = 0; p < paragraphs.length && !hit; p += 1) {
      const span = locate(paragraphs[p], finding.quote);
      if (span)
        hit = { ...span, paragraph: p, key: "", findingIds: [finding.id] };
    }
    if (hit) found.push({ finding, at: hit });
    else loose.push(finding);
  }
  found.sort(
    (a, b) =>
      a.at.paragraph - b.at.paragraph ||
      a.at.start - b.at.start ||
      a.at.end - b.at.end,
  );

  const anchors: Anchor[] = [];
  const anchorOf = new Map<string, Anchor>();
  for (const { finding, at } of found) {
    const last = anchors[anchors.length - 1];
    if (last && last.paragraph === at.paragraph && at.start < last.end) {
      last.end = Math.max(last.end, at.end);
      last.findingIds.push(finding.id);
      anchorOf.set(finding.id, last);
      continue;
    }
    const anchor = { ...at, key: `${at.paragraph}:${at.start}` };
    anchors.push(anchor);
    anchorOf.set(finding.id, anchor);
  }
  return {
    anchors,
    anchorOf,
    ordered: [...loose, ...found.map(({ finding }) => finding)],
  };
}

/** 문장 안에서 충돌하는 표현의 자리. 표현이 없거나 문장에서 찾지 못하면 null 이다 */
export function focusIn(text: string, focus: string | null): Span | null {
  if (!focus) return null;
  return locate(text, focus);
}

export interface ExcerptLine {
  text: string;
  /** 근거 문장의 자리. 근거가 걸린 문단의 줄에만 있다 */
  mark: Span | null;
}

const SENTENCE = /[^.!?…。]+(?:[.!?…。]+["'”’」』)]*|$)/g;

/** 근거 앞뒤로 붙이는 문맥. 한쪽에 문장을 둘까지, 이만큼 차면 더 붙이지 않는다 */
const CONTEXT_SENTENCES = 2;
const CONTEXT_CHARS = 60;

function sentencesOf(text: string): Span[] {
  const spans: Span[] = [];
  for (const match of text.matchAll(SENTENCE)) {
    const body = match[0].trim();
    if (!body) continue;
    const start = match.index + match[0].indexOf(body);
    spans.push({ start, end: start + body.length });
  }
  return spans;
}

/**
 * 근거 문서에서 근거 문장과 그 앞뒤 문장. 문단이 바뀌면 줄을 나눈다.
 * 문서에서 근거 문장을 찾지 못하면(문서를 고쳤거나 속성 값에서 온 근거) null 이다.
 */
export function excerptOf(
  paragraphs: readonly string[],
  quote: string,
): ExcerptLine[] | null {
  let at = -1;
  let hit: Span | null = null;
  for (let p = 0; p < paragraphs.length && !hit; p += 1) {
    hit = locate(paragraphs[p], quote);
    if (hit) at = p;
  }
  if (!hit) return null;
  const span = hit;
  const all = paragraphs.flatMap((text, paragraph) =>
    sentencesOf(text).map((sentence) => ({ ...sentence, paragraph })),
  );
  const first = all.findIndex(
    (sentence) => sentence.paragraph === at && sentence.end > span.start,
  );
  if (first < 0) return null;
  let last = first;
  while (all[last + 1]?.paragraph === at && all[last + 1].start < span.end)
    last += 1;
  let from = first;
  for (
    let count = 0, chars = 0;
    from > 0 && count < CONTEXT_SENTENCES && chars < CONTEXT_CHARS;
    count += 1
  ) {
    from -= 1;
    chars += all[from].end - all[from].start;
  }
  let to = last;
  for (
    let count = 0, chars = 0;
    to < all.length - 1 && count < CONTEXT_SENTENCES && chars < CONTEXT_CHARS;
    count += 1
  ) {
    to += 1;
    chars += all[to].end - all[to].start;
  }
  const lines: Array<Span & { paragraph: number }> = [];
  for (const sentence of all.slice(from, to + 1)) {
    const line = lines[lines.length - 1];
    if (line?.paragraph === sentence.paragraph) line.end = sentence.end;
    else lines.push({ ...sentence });
  }
  return lines.map(({ paragraph, start, end }) => ({
    text: paragraphs[paragraph].slice(start, end),
    mark:
      paragraph === at
        ? {
            start: Math.max(span.start, start) - start,
            end: Math.min(span.end, end) - start,
          }
        : null,
  }));
}

export interface Fold {
  start: number;
  end: number;
}

/**
 * 긴 원고에서 접을 문단 구간. 충돌하는 문장이 있는 문단과 그 앞뒤 `context` 문단은 남기고,
 * `least` 문단보다 짧은 구간은 접지 않는다 — 한두 문단을 접으면 펼치는 손이 더 든다.
 */
export function foldsOf(
  count: number,
  anchors: readonly Anchor[],
  context = 1,
  least = 3,
): Fold[] {
  if (anchors.length === 0) return [];
  const keep = new Array<boolean>(count).fill(false);
  for (const anchor of anchors)
    for (
      let i = anchor.paragraph - context;
      i <= anchor.paragraph + context;
      i += 1
    )
      if (i >= 0 && i < count) keep[i] = true;
  const folds: Fold[] = [];
  let start = -1;
  for (let i = 0; i <= count; i += 1) {
    if (i < count && !keep[i]) {
      if (start < 0) start = i;
      continue;
    }
    if (start >= 0 && i - start >= least) folds.push({ start, end: i });
    start = -1;
  }
  return folds;
}
