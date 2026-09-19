/**
 * 테마별 실제 색 문자열.
 *
 * force-graph 는 색을 접근자 함수로 읽어 캔버스에 직접 그리므로 CSS 변수를 그대로
 * 넘길 수 없다. 테마가 바뀔 때마다 디자인 토큰(--lk-*)에서 계산된 값을 뽑아 쓴다.
 *
 * 실험 레포는 그래프 전용 변수(--graph-link 등)를 따로 두었지만, 여기서는 Pencil
 * 토큰만이 진실의 원천이다. 그래서 선·격자처럼 토큰에 없는 옅은 색은 토큰 색에
 * 투명도를 얹어 만든다.
 */

import { DOCUMENT_TYPE_META } from "@/domain/document-types";

import { NODE_KINDS, type NodeKind } from "./types";

export interface Palette {
  canvasBg: string;
  /** 그래프 뷰 전용. 엣지가 많아 옅게 둔다 */
  graphLink: string;
  graphLinkDim: string;
  linkHot: string;
  /** 강조된 엣지 위에 얹는 관계 이름 */
  graphLinkLabel: string;
  nodeStroke: string;
  nodeDim: string;
  nodeLabel: string;
  /** 즐겨찾기 별. 분류를 가로지르는 표시라 노드 7색 어디에도 속하지 않는다 */
  favorite: string;
  /** 노드 안에 찍는 분류 아이콘 */
  nodeIcon: string;
  grid: string;
  gridStrong: string;
  node: Record<NodeKind, string>;
}

function readVar(styles: CSSStyleDeclaration, name: string): string {
  return styles.getPropertyValue(name).trim();
}

/** #rgb·#rrggbb·#rrggbbaa 에 투명도를 곱한다. 해석할 수 없으면 원래 값을 돌려준다 */
export function withAlpha(color: string, alpha: number): string {
  const hex = color.replace("#", "");
  if (!/^([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(hex)) return color;
  const full =
    hex.length === 3
      ? hex
          .split("")
          .map((c) => c + c)
          .join("")
      : hex;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const a = full.length === 8 ? parseInt(full.slice(6, 8), 16) / 255 : 1;
  return `rgba(${r}, ${g}, ${b}, ${Number((a * alpha).toFixed(3))})`;
}

export function readPalette(): Palette {
  const styles = getComputedStyle(document.documentElement);
  const token = (name: string) => readVar(styles, `--lk-${name}`);
  const secondary = token("color-text-secondary");
  const border = token("color-border-default");
  return {
    canvasBg: token("color-surface-default"),
    graphLink: withAlpha(secondary, 0.42),
    graphLinkDim: withAlpha(secondary, 0.12),
    linkHot: token("color-text-primary"),
    graphLinkLabel: secondary,
    nodeStroke: token("color-text-primary"),
    nodeDim: token("color-surface-icon"),
    nodeLabel: token("color-text-primary"),
    favorite: token("color-favorite"),
    nodeIcon: token("color-text-on-accent"),
    grid: withAlpha(border, 0.45),
    gridStrong: withAlpha(border, 0.9),
    node: Object.fromEntries(
      NODE_KINDS.map((kind) => [
        kind,
        token(DOCUMENT_TYPE_META[kind].nodeColor),
      ]),
    ) as Record<NodeKind, string>,
  };
}
