import { act, render } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { SceneFrame } from "./scene-frame";

/** 틀의 안쪽 폭을 재서 알려 준다. 브라우저에서는 ResizeObserver 가 하는 일이다. */
let measure: (width: number) => void;

beforeEach(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: ResizeObserverCallback) {
        measure = (width) =>
          act(() =>
            callback(
              [{ contentRect: { width, height: 0 } } as ResizeObserverEntry],
              this as unknown as ResizeObserver,
            ),
          );
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function frame(container: HTMLElement) {
  const figure = container.querySelector("figure") as HTMLElement;
  const canvas = figure.querySelector('[aria-hidden="true"]') as HTMLElement;
  return { figure, canvas };
}

describe("SceneFrame", () => {
  /**
   * 빌드 때 만든 HTML 과 스크립트가 돌기 전의 화면이 이 상태다. 얼마나 줄일지 모르는 채로 창을
   * 그리면 큰 창이 보였다가 줄어든다. 높이는 CSS 가 같은 식으로 잡아 둔다.
   */
  it("draws no window before the frame is measured, and leaves the height to CSS", () => {
    const { container } = render(
      <SceneFrame scene="editor" label="editor" eager />,
    );
    const { figure, canvas } = frame(container);

    expect(canvas.childElementCount).toBe(0);
    expect(figure.style.height).toBe("");
    expect(figure.style.getPropertyValue("--frame-spacer")).toBe("64%");
    expect(figure.style.getPropertyValue("--frame-min")).toBe(
      `${640 * 0.56 + 2}px`,
    );
  });

  it("draws the window once measured, at the height the width calls for", () => {
    const { container } = render(
      <SceneFrame scene="editor" label="editor" eager />,
    );
    const { figure, canvas } = frame(container);

    measure(800);

    expect(canvas.childElementCount).toBeGreaterThan(0);
    // 폭 800 이면 0.8 배로 줄인다. 높이는 640 × 0.8 에 테두리 두 줄.
    expect(figure.style.height).toBe("514px");
    expect(canvas.style.transform).toBe("translateX(0px) scale(0.8)");
  });

  it("stops shrinking where the text would become unreadable", () => {
    const { container } = render(
      <SceneFrame scene="editor" label="editor" eager />,
    );
    const { figure } = frame(container);

    measure(335);

    // CSS 가 재기 전에 잡아 둔 가장 작은 높이(--frame-min)와 같은 값이다.
    expect(parseFloat(figure.style.height)).toBeCloseTo(640 * 0.56 + 2, 5);
  });

  /** 보일 범위를 정한 창은 그 범위가 자리를 채울 만큼 키운다. 재기 전의 CSS 도 같은 식이어야 한다. */
  it("reserves the same height in CSS for a frame with a focus range", () => {
    const { container } = render(
      <SceneFrame scene="editor" label="editor" eager focus={[432, 976]} />,
    );
    const { figure } = frame(container);

    expect(figure.style.getPropertyValue("--frame-spacer")).toBe(
      "max(64%, min(640px, calc(100% * 640 / 544)))",
    );

    // 폭 689 면 범위(544)가 자리를 넘으므로 줄이지 않는다: 640 + 2.
    measure(689);
    expect(figure.style.height).toBe("642px");
    // 폭 400 이면 400/544 배: CSS 식의 calc(100% * 640 / 544) 와 같은 값이다.
    measure(400);
    expect(parseFloat(figure.style.height)).toBeCloseTo(
      (400 * 640) / 544 + 2,
      5,
    );
  });

  it("keeps a frame that has not been reached yet empty even after measuring", () => {
    const { container } = render(<SceneFrame scene="editor" label="editor" />);
    const { canvas } = frame(container);

    measure(800);

    expect(canvas.childElementCount).toBe(0);
  });
});
