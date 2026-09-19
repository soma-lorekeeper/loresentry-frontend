export type MergeResult = { ok: true; text: string } | { ok: false };

function splitParagraphs(text: string) {
  return text.split(/\n{2,}/);
}

// DOCUMENT_EDITING_PROPOSAL §5.2: 409를 받으면 공통 조상과 비교해 서로 다른 문단을 고쳤을 때만 자동 병합한다.
export function mergeParagraphs(
  base: string,
  mine: string,
  theirs: string,
): MergeResult {
  if (mine === theirs) return { ok: true, text: mine };
  if (base === theirs) return { ok: true, text: mine };
  if (base === mine) return { ok: true, text: theirs };
  const b = splitParagraphs(base);
  const m = splitParagraphs(mine);
  const t = splitParagraphs(theirs);
  if (b.length !== m.length || b.length !== t.length) return { ok: false };
  const merged: string[] = [];
  for (let i = 0; i < b.length; i += 1) {
    const mineChanged = m[i] !== b[i];
    const theirsChanged = t[i] !== b[i];
    if (mineChanged && theirsChanged && m[i] !== t[i]) return { ok: false };
    merged.push(mineChanged ? m[i] : t[i]);
  }
  return { ok: true, text: merged.join("\n\n") };
}
