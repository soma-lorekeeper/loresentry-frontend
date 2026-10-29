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
  /** 어긋남 → 원고 자리. 고친 원고에서 문장을 찾지 못한 어긋남은 없다 */
  anchorOf: Map<string, Anchor>;
  /** 원고 순서. 자리를 찾지 못한 어긋남이 맨 앞에 온다 */
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

/** 문장 안에서 어긋나는 표현의 자리. 표현이 없거나 문장에서 찾지 못하면 null 이다 */
export function focusIn(text: string, focus: string | null): Span | null {
  if (!focus) return null;
  return locate(text, focus);
}

/** 같은 근거 문장이 원고 여러 곳과 어긋나면 그 다른 곳들 */
export function sameSource(
  finding: SettingCheckFinding,
  findings: readonly SettingCheckFinding[],
): SettingCheckFinding[] {
  const quote = folded(finding.source.quote.replace(EDGE, "")).text;
  return findings.filter(
    (other) =>
      other.id !== finding.id &&
      other.source.documentId === finding.source.documentId &&
      folded(other.source.quote.replace(EDGE, "")).text === quote,
  );
}

export interface Fold {
  start: number;
  end: number;
}

/**
 * 긴 원고에서 접을 문단 구간. 어긋난 문장이 있는 문단과 그 앞뒤 `context` 문단은 남기고,
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
