/**
 * 그래프 엔진이 쓰는 분류 타입.
 *
 * 실험 레포(graph-visualization)의 NodeKind 일곱 개는 우리 문서 종류와 하나씩
 * 대응한다(Chapter → manuscript, Character → character …). 엔진 코드는 이름만
 * 바꿔 그대로 가져왔으므로 여기서 문서 종류를 NodeKind 로 부른다.
 */

import { DOCUMENT_TYPES, type DocumentType } from "@/domain/document-types";

export type NodeKind = DocumentType;

export const NODE_KINDS: readonly NodeKind[] = DOCUMENT_TYPES;

/**
 * 노드가 많을 때 처음 켜 두는 분류.
 *
 * 일곱을 다 켜면 한꺼번에 너무 많이 뜬다. 이야기의 뼈대인 셋만 켜고 시작한다 —
 * **누가**(인물) **무엇을** 하고(사건) 그것이 **몇 화**인지(원고). 나머지는 필요해진
 * 사람이 필터에서 직접 켠다. 노드 수 기준은 LARGE_GRAPH_NODES 다.
 */
export const DEFAULT_KINDS: readonly NodeKind[] = [
  "manuscript",
  "character",
  "event",
];

/** 이 수를 넘으면 DEFAULT_KINDS 로 시작하고 안내를 띄운다 */
export const LARGE_GRAPH_NODES = 150;

export interface GraphData {
  nodes: { id: string }[];
  edges: { source: string; target: string }[];
}
