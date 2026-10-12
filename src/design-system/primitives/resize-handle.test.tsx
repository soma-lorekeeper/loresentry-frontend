import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ResizeHandle } from "./resize-handle";

function setup(orientation: "vertical" | "horizontal" = "vertical") {
  const handlers = {
    onDragStart: vi.fn(),
    onDrag: vi.fn(),
    onDragEnd: vi.fn(),
    onStep: vi.fn(),
    onReset: vi.fn(),
  };
  render(
    <ResizeHandle
      label="사이드바 폭 조절"
      orientation={orientation}
      value={232}
      min={200}
      max={420}
      {...handlers}
    />,
  );
  return { handle: screen.getByRole("separator"), ...handlers };
}

describe("ResizeHandle", () => {
  it("announces what it resizes and the current range", () => {
    const { handle } = setup();

    expect(handle).toHaveAccessibleName("사이드바 폭 조절");
    expect(handle).toHaveAttribute("aria-orientation", "vertical");
    expect(handle).toHaveAttribute("aria-valuenow", "232");
    expect(handle).toHaveAttribute("aria-valuemin", "200");
    expect(handle).toHaveAttribute("aria-valuemax", "420");
  });

  it("reports how far the pointer moved since it was pressed", () => {
    const { handle, onDragStart, onDrag, onDragEnd } = setup();

    fireEvent.pointerDown(handle, { clientX: 300, clientY: 50 });
    fireEvent.pointerMove(handle, { clientX: 340, clientY: 90 });
    fireEvent.pointerMove(handle, { clientX: 280, clientY: 90 });
    fireEvent.pointerUp(handle);

    expect(onDragStart).toHaveBeenCalledTimes(1);
    // 세로 막대는 좌우 이동만 본다.
    expect(onDrag.mock.calls).toEqual([[40], [-20]]);
    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("follows the vertical axis when the bar lies flat", () => {
    const { handle, onDrag } = setup("horizontal");

    fireEvent.pointerDown(handle, { clientX: 300, clientY: 50 });
    fireEvent.pointerMove(handle, { clientX: 340, clientY: 80 });

    expect(onDrag).toHaveBeenCalledWith(30);
  });

  it("ignores pointer movement when it is not being dragged", () => {
    const { handle, onDrag, onDragEnd } = setup();

    fireEvent.pointerMove(handle, { clientX: 340 });
    fireEvent.pointerUp(handle);

    expect(onDrag).not.toHaveBeenCalled();
    expect(onDragEnd).not.toHaveBeenCalled();
  });

  it("ends the drag once when the pointer is cancelled", () => {
    const { handle, onDragEnd } = setup();

    fireEvent.pointerDown(handle, { clientX: 300 });
    fireEvent.pointerCancel(handle);
    fireEvent.pointerUp(handle);

    expect(onDragEnd).toHaveBeenCalledTimes(1);
  });

  it("steps with the arrow keys along its axis, coarser with Shift", () => {
    const { handle, onStep } = setup();

    fireEvent.keyDown(handle, { key: "ArrowRight" });
    fireEvent.keyDown(handle, { key: "ArrowLeft", shiftKey: true });
    // 세로 막대는 위아래 방향키에 반응하지 않는다.
    fireEvent.keyDown(handle, { key: "ArrowDown" });

    expect(onStep.mock.calls).toEqual([
      [1, false],
      [-1, true],
    ]);
  });

  it("resets on a double click", () => {
    const { handle, onReset } = setup();

    fireEvent.doubleClick(handle);

    expect(onReset).toHaveBeenCalledTimes(1);
  });
});
