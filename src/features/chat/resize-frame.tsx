"use client";

import { useRef, useState, type PointerEvent } from "react";

import { ResizeHandle } from "@/design-system/primitives";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./chat.module.css";

export interface ChatSize {
  width: number;
  height: number;
}

const SIZE_KEY = "loresentry.chat-size";
export const DEFAULT_SIZE: ChatSize = { width: 380, height: 600 };
const MIN_SIZE: ChatSize = { width: 340, height: 440 };
const MAX_WIDTH = 720;
const STEP = { fine: 16, coarse: 64 };

export function clampSize(size: ChatSize): ChatSize {
  const maxWidth = Math.max(
    MIN_SIZE.width,
    Math.min(MAX_WIDTH, window.innerWidth - 40),
  );
  const maxHeight = Math.max(MIN_SIZE.height, window.innerHeight - 104);
  return {
    width: Math.round(Math.min(maxWidth, Math.max(MIN_SIZE.width, size.width))),
    height: Math.round(
      Math.min(maxHeight, Math.max(MIN_SIZE.height, size.height)),
    ),
  };
}

export function readSize(): ChatSize {
  try {
    const raw = window.localStorage.getItem(SIZE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<ChatSize>;
      if (typeof parsed.width === "number" && typeof parsed.height === "number")
        return { width: parsed.width, height: parsed.height };
    }
  } catch {}
  return DEFAULT_SIZE;
}

export function saveSize(size: ChatSize) {
  try {
    window.localStorage.setItem(SIZE_KEY, JSON.stringify(size));
  } catch {}
}

export function ResizeFrame({
  size,
  onResize,
}: {
  size: ChatSize;
  onResize: (size: ChatSize, commit: boolean) => void;
}) {
  const start = useRef(size);
  const live = useRef(size);
  const corner = useRef<{ x: number; y: number } | null>(null);
  const [cornerActive, setCornerActive] = useState(false);
  const step = (coarse: boolean) => (coarse ? STEP.coarse : STEP.fine);
  const drag = (next: ChatSize) => {
    live.current = next;
    onResize(next, false);
  };
  const begin = () => {
    document.body.style.userSelect = "none";
    start.current = size;
    live.current = size;
  };
  const end = () => {
    document.body.style.userSelect = "";
    onResize(live.current, true);
  };
  const releaseCorner = () => {
    if (!corner.current) return;
    corner.current = null;
    setCornerActive(false);
    end();
  };
  return (
    <>
      <ResizeHandle
        label={t("챗 창 폭 조절")}
        orientation="vertical"
        value={size.width}
        min={MIN_SIZE.width}
        max={MAX_WIDTH}
        className={cx(styles.edge, styles.edgeLeft)}
        onDragStart={begin}
        onDrag={(delta) =>
          drag({ ...start.current, width: start.current.width - delta })
        }
        onDragEnd={end}
        onStep={(direction, coarse) =>
          onResize(
            { ...size, width: size.width - direction * step(coarse) },
            true,
          )
        }
        onReset={() => onResize(DEFAULT_SIZE, true)}
      />
      <ResizeHandle
        label={t("챗 창 높이 조절")}
        orientation="horizontal"
        value={size.height}
        min={MIN_SIZE.height}
        max={2000}
        className={cx(styles.edge, styles.edgeTop)}
        onDragStart={begin}
        onDrag={(delta) =>
          drag({ ...start.current, height: start.current.height - delta })
        }
        onDragEnd={end}
        onStep={(direction, coarse) =>
          onResize(
            { ...size, height: size.height - direction * step(coarse) },
            true,
          )
        }
        onReset={() => onResize(DEFAULT_SIZE, true)}
      />
      <div
        className={styles.corner}
        data-dragging={cornerActive || undefined}
        aria-hidden
        onPointerDown={(event: PointerEvent<HTMLDivElement>) => {
          event.currentTarget.setPointerCapture(event.pointerId);
          begin();
          setCornerActive(true);
          corner.current = { x: event.clientX, y: event.clientY };
        }}
        onPointerMove={(event) => {
          if (!corner.current) return;
          drag({
            width: start.current.width - (event.clientX - corner.current.x),
            height: start.current.height - (event.clientY - corner.current.y),
          });
        }}
        onPointerUp={releaseCorner}
        onPointerCancel={releaseCorner}
        onDoubleClick={() => onResize(DEFAULT_SIZE, true)}
      />
    </>
  );
}
