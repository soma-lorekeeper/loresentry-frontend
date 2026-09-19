"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";

export type PopoverPlacement =
  "bottom-start" | "bottom-end" | "top-start" | "top-end" | "right-start";

interface PopoverProps {
  anchorRef: RefObject<HTMLElement | null>;
  open: boolean;
  onClose: (reason: "escape" | "outside") => void;
  placement?: PopoverPlacement;
  offset?: number;
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

const VIEWPORT_MARGIN = 8;

function computePosition(
  anchor: DOMRect,
  panel: DOMRect,
  placement: PopoverPlacement,
  offset: number,
) {
  let top: number;
  let left: number;
  if (placement === "right-start") {
    top = anchor.top;
    left = anchor.right + offset;
  } else {
    const below = placement.startsWith("bottom");
    top = below ? anchor.bottom + offset : anchor.top - panel.height - offset;
    left = placement.endsWith("start")
      ? anchor.left
      : anchor.right - panel.width;
    const overflowsBottom =
      below && top + panel.height > window.innerHeight - VIEWPORT_MARGIN;
    const overflowsTop = !below && top < VIEWPORT_MARGIN;
    if (overflowsBottom) top = anchor.top - panel.height - offset;
    if (overflowsTop) top = anchor.bottom + offset;
  }
  const maxLeft = window.innerWidth - panel.width - VIEWPORT_MARGIN;
  const maxTop = window.innerHeight - panel.height - VIEWPORT_MARGIN;
  return {
    top: Math.max(VIEWPORT_MARGIN, Math.min(top, maxTop)),
    left: Math.max(VIEWPORT_MARGIN, Math.min(left, maxLeft)),
  };
}

export function Popover(props: PopoverProps) {
  if (!props.open || typeof document === "undefined") return null;
  return <PopoverPanel {...props} />;
}

function PopoverPanel({
  anchorRef,
  open,
  onClose,
  placement = "bottom-start",
  offset = 4,
  children,
  className,
  style,
}: PopoverProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>();

  const reposition = useCallback(() => {
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    setPosition(
      computePosition(
        anchor.getBoundingClientRect(),
        panel.getBoundingClientRect(),
        placement,
        offset,
      ),
    );
  }, [anchorRef, placement, offset]);

  useLayoutEffect(reposition, [reposition]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose("outside");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      onClose("escape");
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown, true);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown, true);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, onClose, anchorRef, reposition]);

  return createPortal(
    <div
      ref={panelRef}
      className={className}
      style={{
        position: "fixed",
        zIndex: 50,
        top: position?.top ?? 0,
        left: position?.left ?? 0,
        visibility: position ? "visible" : "hidden",
        ...style,
      }}
    >
      {children}
    </div>,
    document.body,
  );
}
