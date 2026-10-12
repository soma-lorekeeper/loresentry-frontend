import { useSyncExternalStore } from "react";

import type { Rect } from "../model/drop-zones";
import type { WorkspaceTarget } from "../model/layout";

/**
 * 지금 끌고 있는 것.
 *
 * <p><b>왜 따로 두는가.</b> 브라우저는 끄는 동안(`dragover`) 끌고 있는 내용을 읽지 못하게 한다 —
 * 종류(type)의 이름만 보이고, 값은 놓는 순간(`drop`)에야 읽힌다. 그런데 "어디에 놓을 수 있는가"는
 * 끄는 동안 정해야 한다(끌어온 것이 탭인지 파일인지, 어느 창에 있던 탭인지, 문서인지 폴더인지).
 * 그래서 끌기 시작할 때 여기에 적어 두고, 탭 막대와 작업 영역이 함께 읽는다.
 *
 * <p>끌기는 한 번에 하나뿐이라 모듈 하나에 둔다.
 */
type Dragged =
  /** 탭을 끌고 있다. `paneId` 는 그 탭이 있던 창이다 */
  | { kind: "tab"; paneId: string; tabId: string; target: WorkspaceTarget }
  /** 사이드바의 파일을 끌고 있다. 창에 열 수 있는 것은 문서뿐이라 폴더인지도 적는다 */
  | { kind: "node"; fileId: string; document: boolean }
  /** 사이드바의 보기(검색·그래프·타임라인·메모)를 끌고 있다. 놓은 곳에 그 화면을 연다 */
  | { kind: "view"; target: WorkspaceTarget };

export type DragSession = Dragged & {
  /**
   * 끌기 시작한 단추의 자리(뷰포트 좌표). 놓아서 새 창이 생기면 그 창이 여기서 나온다
   * (use-pane-motion.ts).
   */
  origin: Rect;
};

/** 요소의 자리를 {@link DragSession.origin} 에 적을 모양으로 잰다 */
export function originOf(element: Element): Rect {
  const box = element.getBoundingClientRect();
  return { left: box.left, top: box.top, width: box.width, height: box.height };
}

/** 탭을 끌 때 dataTransfer 에 싣는 종류. 글자로 싣지 않아 에디터 본문에 붙여 넣어지지 않는다 */
export const TAB_MIME = "application/x-loresentry-tab";
/** 사이드바의 보기를 끌 때 싣는 종류. 탭과 같은 이유로 글자로 싣지 않는다 */
export const VIEW_MIME = "application/x-loresentry-view";

let current: DragSession | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

export function beginDrag(session: DragSession) {
  current = session;
  emit();
}

export function endDrag() {
  if (!current) return;
  current = null;
  emit();
}

export function getDrag() {
  return current;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 끌기가 진행 중인지에 따라 다시 그려야 하는 화면이 쓴다 */
export function useDragSession() {
  return useSyncExternalStore(subscribe, getDrag, () => null);
}

if (typeof document !== "undefined") {
  /*
   * 끌기가 어떻게 끝나든 여기서 치운다. 끌던 탭이 다른 창으로 옮겨 가면 원래 자리의 요소가
   * 사라져 그 요소의 `dragend` 가 오지 않을 수 있다. 문서 전체에서 한 번 더 듣는다.
   * 놓은 곳의 처리(drop)가 먼저 읽어야 하므로 한 박자 늦춘다.
   */
  const settle = () => window.setTimeout(endDrag, 0);
  document.addEventListener("dragend", settle, true);
  document.addEventListener("drop", settle, true);
  /*
   * 그래도 치우지 못한 것이 남았을 수 있다(끌던 요소가 사라진 채 창 밖에서 끝난 끌기는 위의 두
   * 사건이 모두 오지 않는다). 남은 채로 두면 다음에 끄는 것 — 에디터의 글자 같은 남의 끌기 — 을
   * 예전에 끌던 탭으로 알고 받는다. 새 끌기는 늘 빈 데서 시작하게 한다. 문서에서 먼저(capture)
   * 들으므로, 우리 단추의 `beginDrag` 는 이 뒤에 불려 새로 적는다.
   */
  document.addEventListener("dragstart", endDrag, true);
}
