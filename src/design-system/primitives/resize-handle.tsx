"use client";

import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

import { cx } from "@/shared/cx";

import styles from "./resize-handle.module.css";

export interface ResizeHandleProps {
  /** 무엇의 크기를 바꾸는지. 화면에는 보이지 않고 스크린 리더가 읽는다 */
  label: string;
  /**
   * 막대가 선 방향. `vertical` 은 세로 막대라 좌우로 끌고, `horizontal` 은 가로 막대라
   * 위아래로 끈다. (ARIA 의 separator 가 쓰는 뜻 그대로다.)
   */
  orientation: "vertical" | "horizontal";
  /** 지금 크기와 범위. 스크린 리더에 알리는 데만 쓴다 — 크기 계산은 부르는 쪽이 한다 */
  value: number;
  min: number;
  max: number;
  /** 숫자만으로 뜻이 안 통할 때 읽어 줄 말(예: "왼쪽 창 60%") */
  valueText?: string;
  /** 끌기를 시작했다. 시작할 때의 크기를 잡아 두는 자리다 */
  onDragStart?: () => void;
  /**
   * 끄는 중이다. `delta` 는 누른 자리에서 움직인 거리(px)이고 오른쪽·아래가 양수다.
   * 포인터가 움직일 때마다 불리므로 여기서는 가벼운 일만 한다(CSS 변수 갱신 등).
   */
  onDrag: (delta: number) => void;
  /** 손을 뗐거나 끌기가 취소됐다. 바뀐 크기를 저장하는 자리다 */
  onDragEnd?: () => void;
  /** 방향키. 오른쪽·아래가 +1 이고, Shift 를 함께 누르면 `coarse` 다 */
  onStep: (direction: 1 | -1, coarse: boolean) => void;
  /** 두 번 눌렀다. 기본 크기로 되돌리는 자리다 */
  onReset?: () => void;
  className?: string;
}

/**
 * 끌어서 크기를 바꾸는 손잡이. 메모 패널, 사이드바, 나란히 연 두 창 사이가 함께 쓴다.
 *
 * <p>손잡이는 **얼마나 움직였는지만** 알린다. 그 거리로 폭을 정할지 비율을 정할지,
 * 어디에 저장할지는 부르는 쪽 몫이다. 놓인 자리(절대 위치인지, 틈을 채우는 칸인지)도
 * 부르는 쪽이 `className` 으로 정한다.
 *
 * <p>마우스 없이도 쓸 수 있어야 하므로 포커스를 받고 방향키로 움직인다.
 */
export function ResizeHandle({
  label,
  orientation,
  value,
  min,
  max,
  valueText,
  onDragStart,
  onDrag,
  onDragEnd,
  onStep,
  onReset,
  className,
}: ResizeHandleProps) {
  // 누른 자리의 좌표. 끄는 동안에만 값이 있다.
  const origin = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const coordinate = (event: PointerEvent) =>
    orientation === "vertical" ? event.clientX : event.clientY;

  const finish = () => {
    if (origin.current === null) return;
    origin.current = null;
    setDragging(false);
    onDragEnd?.();
  };

  return (
    <div
      role="separator"
      tabIndex={0}
      aria-label={label}
      aria-orientation={orientation}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      data-dragging={dragging || undefined}
      className={cx(styles.handle, className)}
      onPointerDown={(event) => {
        // 포인터를 붙잡아 두면 손잡이 밖으로 나가도 계속 따라온다. jsdom 에는 이 함수가 없다.
        event.currentTarget.setPointerCapture?.(event.pointerId);
        origin.current = coordinate(event);
        setDragging(true);
        onDragStart?.();
      }}
      onPointerMove={(event) => {
        if (origin.current === null) return;
        onDrag(coordinate(event) - origin.current);
      }}
      onPointerUp={finish}
      onPointerCancel={finish}
      onDoubleClick={onReset}
      onKeyDown={(event: KeyboardEvent) => {
        const steps: Record<string, 1 | -1> =
          orientation === "vertical"
            ? { ArrowLeft: -1, ArrowRight: 1 }
            : { ArrowUp: -1, ArrowDown: 1 };
        const direction = steps[event.key];
        if (!direction) return;
        event.preventDefault();
        onStep(direction, event.shiftKey);
      }}
    />
  );
}
