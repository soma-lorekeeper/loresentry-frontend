import { act, fireEvent, render, screen } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { Tooltip } from "./tooltip";

function Tools() {
  const bold = useRef<HTMLButtonElement>(null);
  const italic = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={bold} aria-label="굵게" />
      <Tooltip anchorRef={bold} label="굵게" shortcut="⌘B" />
      <button ref={italic} aria-label="기울임" />
      <Tooltip anchorRef={italic} label="기울임" />
    </>
  );
}

const button = (name: string) => screen.getByRole("button", { name });
const enter = (name: string, pointerType = "mouse") =>
  fireEvent.pointerEnter(button(name), { pointerType });

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("Tooltip", () => {
  it("appears after the pointer rests on the control, with its shortcut", () => {
    render(<Tools />);

    enter("굵게");
    // 지나가는 길에는 뜨지 않는다.
    expect(screen.queryByText("⌘B")).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(400));

    expect(screen.getByText("⌘B")).toBeInTheDocument();
    // 단추의 이름은 단추 자신이 갖는다. 설명은 보조 기술에 다시 읽히지 않는다.
    expect(screen.getByText("⌘B").parentElement).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  });

  it("goes away when the pointer leaves or the control is pressed", () => {
    render(<Tools />);
    enter("굵게");
    act(() => vi.advanceTimersByTime(400));

    fireEvent.pointerLeave(button("굵게"));
    expect(screen.queryByText("⌘B")).not.toBeInTheDocument();

    enter("굵게");
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerDown(button("굵게"));
    expect(screen.queryByText("⌘B")).not.toBeInTheDocument();
  });

  /** 도구를 훑어 읽을 때는 옆 단추로 옮길 때마다 다시 기다리게 하지 않는다. */
  it("shows the next one at once when moving along a row of controls", () => {
    render(<Tools />);
    enter("굵게");
    act(() => vi.advanceTimersByTime(400));
    fireEvent.pointerLeave(button("굵게"));

    enter("기울임");
    act(() => vi.advanceTimersByTime(0));

    expect(document.querySelector('[aria-hidden="true"]')?.textContent).toBe(
      "기울임",
    );
  });

  it("appears on keyboard focus and hides on blur", () => {
    render(<Tools />);

    act(() => button("굵게").focus());
    act(() => vi.advanceTimersByTime(0));
    expect(screen.getByText("⌘B")).toBeInTheDocument();

    act(() => button("굵게").blur());
    expect(screen.queryByText("⌘B")).not.toBeInTheDocument();
  });

  it("stays out of the way on touch and while the control's menu is open", () => {
    render(<Tools />);

    enter("굵게", "touch");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText("⌘B")).not.toBeInTheDocument();

    button("굵게").setAttribute("aria-expanded", "true");
    enter("굵게");
    act(() => vi.advanceTimersByTime(1000));
    expect(screen.queryByText("⌘B")).not.toBeInTheDocument();
  });
});
