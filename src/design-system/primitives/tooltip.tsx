"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

import styles from "./tooltip.module.css";

/**
 * 아이콘만 있는 단추에 붙이는 호버 설명.
 *
 * <p><b>언제 뜨는가.</b> 포인터를 올리고 잠깐 머물렀을 때, 그리고 키보드로 포커스했을 때.
 * 누르거나 자리를 뜨면 사라진다. 손가락으로 누르는 화면에서는 뜨지 않는다 — 올려 둘 수가 없다.
 *
 * <p><b>이름을 대신하지 않는다.</b> 단추의 이름은 단추 자신의 `aria-label` 이다. 이 설명은 그
 * 이름을 눈에 보이게 한 것이라 보조 기술에는 숨긴다(같은 말을 두 번 읽지 않게).
 *
 * <p>브라우저의 `title` 을 쓰지 않는 이유: 1초 가까이 기다려야 뜨고, 키보드 포커스에는 뜨지 않고,
 * 단축키를 곁들일 수 없고, 모양이 화면과 따로 논다.
 */
interface TooltipProps {
  /** 설명을 붙일 요소. 이 요소 옆(형제)에 Tooltip 을 둔다 */
  anchorRef: RefObject<HTMLElement | null>;
  label: string;
  /** 단축키 표기(예: ⌘B). 있으면 설명 뒤에 약하게 적는다 */
  shortcut?: string;
}

/** 포인터를 올리고 이만큼 머물러야 뜬다. 지나가는 길에는 뜨지 않는다. */
const HOVER_DELAY = 400;
/** 설명 하나가 닫히고 이 안에 옆 단추로 옮기면 기다리지 않고 바로 뜬다 — 도구를 훑어 읽을 때다. */
const WARM_WINDOW = 300;
const GAP = 6;
const VIEWPORT_MARGIN = 8;

/** 마지막 설명이 닫힌 때. 옆 단추로 옮길 때 기다림을 건너뛰려고 모든 Tooltip 이 함께 본다. */
let lastClosedAt = -Infinity;

/** 키보드로 온 포커스인가. 눌러서 생긴 포커스나 메뉴가 닫히며 돌아온 포커스에는 띄우지 않는다. */
function focusedByKeyboard(element: HTMLElement) {
  try {
    return element.matches(":focus-visible");
  } catch {
    // 이 선택자를 모르는 환경에서는 포커스면 띄운다.
    return true;
  }
}

export function Tooltip({ anchorRef, label, shortcut }: TooltipProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    let timer = 0;
    const show = (delay: number) => {
      window.clearTimeout(timer);
      // 이 단추가 연 메뉴가 떠 있는 동안에는 설명이 메뉴를 가린다.
      if (anchor.getAttribute("aria-expanded") === "true") return;
      timer = window.setTimeout(() => setOpen(true), delay);
    };
    const hide = () => {
      window.clearTimeout(timer);
      setOpen((current) => {
        if (current) lastClosedAt = performance.now();
        return false;
      });
    };
    const onPointerEnter = (event: PointerEvent) => {
      if (event.pointerType === "touch") return;
      const warm = performance.now() - lastClosedAt < WARM_WINDOW;
      show(warm ? 0 : HOVER_DELAY);
    };
    const onFocus = () => {
      if (focusedByKeyboard(anchor)) show(0);
    };
    anchor.addEventListener("pointerenter", onPointerEnter);
    anchor.addEventListener("pointerleave", hide);
    anchor.addEventListener("pointerdown", hide);
    anchor.addEventListener("focus", onFocus);
    anchor.addEventListener("blur", hide);
    // 키를 누르면(Enter 로 실행, Esc 로 닫기 등) 설명은 할 일을 다 했다.
    anchor.addEventListener("keydown", hide);
    // 단추가 밀려나면 설명이 엉뚱한 자리에 남는다.
    window.addEventListener("scroll", hide, true);
    return () => {
      window.clearTimeout(timer);
      anchor.removeEventListener("pointerenter", onPointerEnter);
      anchor.removeEventListener("pointerleave", hide);
      anchor.removeEventListener("pointerdown", hide);
      anchor.removeEventListener("focus", onFocus);
      anchor.removeEventListener("blur", hide);
      anchor.removeEventListener("keydown", hide);
      window.removeEventListener("scroll", hide, true);
    };
  }, [anchorRef]);

  if (!open) return null;
  return <Bubble anchorRef={anchorRef} label={label} shortcut={shortcut} />;
}

function Bubble({ anchorRef, label, shortcut }: TooltipProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>();

  // 단추 아래 가운데에 둔다. 아래에 자리가 없으면 위로 올리고, 화면 옆으로 나가지 않게 당긴다.
  useLayoutEffect(() => {
    const anchor = anchorRef.current?.getBoundingClientRect();
    const bubble = ref.current?.getBoundingClientRect();
    if (!anchor || !bubble) return;
    const below = anchor.bottom + GAP;
    const fitsBelow =
      below + bubble.height <= window.innerHeight - VIEWPORT_MARGIN;
    const centered = anchor.left + anchor.width / 2 - bubble.width / 2;
    const maxLeft = window.innerWidth - bubble.width - VIEWPORT_MARGIN;
    setPosition({
      top: fitsBelow ? below : anchor.top - bubble.height - GAP,
      left: Math.max(VIEWPORT_MARGIN, Math.min(centered, maxLeft)),
    });
  }, [anchorRef, label, shortcut]);

  return createPortal(
    <div
      ref={ref}
      className={styles.tooltip}
      aria-hidden="true"
      style={{
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
      }}
    >
      {label}
      {shortcut && <span className={styles.shortcut}>{shortcut}</span>}
    </div>,
    document.body,
  );
}
