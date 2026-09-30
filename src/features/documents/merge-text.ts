import type { JSONContent } from "@tiptap/core";

import {
  bodyBlocks,
  bodyFromBlocks,
  sameBlock,
  sameBody,
  type DocumentBody,
} from "@/domain/document-body";

export type MergeResult = { ok: true; body: DocumentBody } | { ok: false };

/**
 * DOCUMENT_EDITING_PROPOSAL §5.2: 409 를 받으면 공통 조상과 비교해 **서로 다른 블록**을 고쳤을 때만
 * 자동 병합한다.
 *
 * <p>전에는 본문이 문자열이어서 빈 줄로 문단을 나눴다. 이제 본문이 블록 배열이므로 그 경계가 곧
 * 문단 경계다 — 빈 줄을 세는 것보다 정확하고, 목록·인용 같은 블록도 한 덩어리로 다룬다.
 *
 * <p>블록 수가 달라지면(추가·삭제) 어느 블록이 어느 블록에 대응하는지 단정할 수 없으므로 충돌로
 * 본다. 조용히 한쪽을 버리는 것보다 사용자가 고르는 편이 낫다.
 */
export function mergeParagraphs(
  base: DocumentBody,
  mine: DocumentBody,
  theirs: DocumentBody,
): MergeResult {
  if (sameBody(mine, theirs)) return { ok: true, body: mine };
  if (sameBody(base, theirs)) return { ok: true, body: mine };
  if (sameBody(base, mine)) return { ok: true, body: theirs };

  const b = bodyBlocks(base);
  const m = bodyBlocks(mine);
  const t = bodyBlocks(theirs);
  if (b.length !== m.length || b.length !== t.length) return { ok: false };

  const merged: JSONContent[] = [];
  for (let i = 0; i < b.length; i += 1) {
    const mineChanged = !sameBlock(m[i], b[i]);
    const theirsChanged = !sameBlock(t[i], b[i]);
    if (mineChanged && theirsChanged && !sameBlock(m[i], t[i])) {
      return { ok: false };
    }
    merged.push(mineChanged ? m[i] : t[i]);
  }
  return { ok: true, body: bodyFromBlocks(merged) };
}
