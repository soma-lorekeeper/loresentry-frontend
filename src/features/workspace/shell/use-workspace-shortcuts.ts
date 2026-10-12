"use client";

import { useEffect, useRef } from "react";

import { useWorkspace } from "../workspace-context";
import { isMac, matchShortcut, type ShortcutId } from "./shortcuts";

/**
 * 다른 것이 키보드를 쥐고 있는가. 대화상자·메뉴·투어 카드가 떠 있으면 그것들이 Esc 와
 * 방향키를 쓰고 있고, 그 뒤의 작업공간을 단축키로 바꾸면 안 된다.
 */
function keyboardIsTaken() {
  return (
    document.querySelector('dialog[open], [role="dialog"], [role="menu"]') !==
    null
  );
}

/**
 * 작업공간 단축키를 듣는다. 작업공간에 하나만 건다(WorkspaceShell).
 *
 * <p><b>window 에서, 맨 나중에 듣는다.</b> 에디터와 입력칸이 먼저 키를 쓰고, 그들이 이미 쓴
 * 키(`defaultPrevented`)는 건드리지 않는다. 그래서 에디터의 굵게·되돌리기와 부딪히지 않는다.
 *
 * <p><b>한글을 쓰는 중에도 들어야 한다.</b> 한글 입력기는 글자를 조합하는 내내
 * `isComposing` 이 켜져 있다. 그것을 이유로 건너뛰면 한글을 쓰다가 누른 저장 키가 브라우저의
 * "페이지 저장" 창으로 새어 나간다. 입력기가 삼킨 키(keyCode 229)만 건너뛴다.
 *
 * @param onPlace 탭 옮기기·창 나누기(배치 모드)를 시작한다
 */
export function useWorkspaceShortcuts({ onPlace }: { onPlace: () => void }) {
  const workspace = useWorkspace();
  // 리스너는 한 번만 걸고, 그 안에서는 늘 지금의 작업공간을 본다.
  const latest = useRef({ workspace, onPlace });
  useEffect(() => {
    latest.current = { workspace, onPlace };
  });

  useEffect(() => {
    const mac = isMac();

    const run = (id: ShortcutId, event: KeyboardEvent) => {
      const { workspace: ws, onPlace: place } = latest.current;
      const pane = ws.activePane;
      const actions = ws.tabActionsOf(pane.id, pane.activeTabId);
      const index = pane.tabs.findIndex((tab) => tab.id === pane.activeTabId);

      switch (id) {
        case "save":
          // 저장할 문서가 없어도 막는다. 작업공간에서 브라우저의 "페이지 저장" 창이 뜰 이유가 없다.
          event.preventDefault();
          void actions?.save?.();
          return;
        case "find":
          // 문서가 아닌 화면(가이드, 설정 등)에서는 브라우저의 찾기를 그대로 쓴다.
          if (!actions?.find) return;
          event.preventDefault();
          actions.find();
          return;
        case "exportPdf":
          if (!actions?.exportPdf) return;
          event.preventDefault();
          actions.exportPdf();
          return;
        case "search":
          event.preventDefault();
          ws.open({ kind: "search" });
          return;
        case "toggleSidebar":
          event.preventDefault();
          ws.setSidebarVisible(!ws.sidebarVisible);
          return;
        case "closeTab":
          event.preventDefault();
          ws.closeTab(pane.id, pane.activeTabId);
          return;
        case "newTab":
          event.preventDefault();
          ws.dispatch({
            type: "open",
            target: { kind: "new" },
            paneId: pane.id,
          });
          return;
        case "nextTab":
        case "previousTab": {
          event.preventDefault();
          const step = id === "nextTab" ? 1 : -1;
          const next =
            pane.tabs[(index + step + pane.tabs.length) % pane.tabs.length];
          ws.dispatch({ type: "activate", paneId: pane.id, tabId: next.id });
          return;
        }
        case "placeTab":
          event.preventDefault();
          place();
          return;
        case "focusOtherPane": {
          const other = ws.layout.panes.find(
            (candidate) => candidate.id !== pane.id,
          );
          // 좁은 창에서는 창을 하나만 그린다. 갈 곳이 없다.
          if (!other || ws.narrow) return;
          event.preventDefault();
          ws.dispatch({ type: "focusPane", paneId: other.id });
          // 포커스도 그 창으로 옮긴다. 안 옮기면 방향키가 여전히 앞 창을 움직인다.
          document
            .getElementById(`tab-${other.id}-${other.activeTabId}`)
            ?.focus();
          return;
        }
      }
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.keyCode === 229) return;
      const id = matchShortcut(event, mac);
      if (!id) return;
      if (keyboardIsTaken()) {
        // 대화상자 뒤에서 작업공간을 바꾸지는 않지만, 저장 키가 브라우저로 새는 것은 막는다.
        if (id === "save") event.preventDefault();
        return;
      }
      // 키를 누르고 있으면 같은 키가 되풀이해 온다. 탭 넘기기만 그대로 받는다.
      if (event.repeat && id !== "nextTab" && id !== "previousTab") {
        event.preventDefault();
        return;
      }
      run(id, event);
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);
}
