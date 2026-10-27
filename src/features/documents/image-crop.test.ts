import { describe, expect, it } from "vitest";

import {
  clampCrop,
  initialCrop,
  MAX_ZOOM,
  scaleOf,
  sourceRect,
  zoomAround,
} from "./image-crop";

const VIEW = 200;

describe("image crop", () => {
  it("fits the short side of the image to the window at zoom 1", () => {
    const wide = { width: 800, height: 400 };
    expect(scaleOf(wide, VIEW, 1)).toBe(0.5);
    expect(sourceRect(wide, VIEW, initialCrop(wide, VIEW)).size).toBe(400);
  });

  it("centers a wide picture", () => {
    const wide = { width: 800, height: 400 };
    // 0.5 배면 가로 400px, 창 200px. 넘치는 200px 을 반씩 나눈다.
    expect(initialCrop(wide, VIEW)).toEqual({ zoom: 1, x: -100, y: 0 });
  });

  it("frames the upper part of a tall picture, where a face usually is", () => {
    const tall = { width: 400, height: 1000 };
    // 0.5 배면 세로 500px. 넘치는 300px 의 4분의 1 만 올린다.
    expect(initialCrop(tall, VIEW)).toEqual({ zoom: 1, x: 0, y: -75 });
  });

  it("never leaves an empty edge inside the window", () => {
    const square = { width: 400, height: 400 };
    expect(clampCrop(square, VIEW, { zoom: 2, x: 50, y: -900 })).toEqual({
      zoom: 2,
      x: 0,
      y: -200,
    });
  });

  it("keeps the zoom between the cover size and the maximum", () => {
    const square = { width: 400, height: 400 };
    expect(clampCrop(square, VIEW, { zoom: 0.2, x: 0, y: 0 }).zoom).toBe(1);
    expect(clampCrop(square, VIEW, { zoom: 99, x: 0, y: 0 }).zoom).toBe(
      MAX_ZOOM,
    );
  });

  it("zooms around the point under the cursor", () => {
    const square = { width: 400, height: 400 };
    const start = initialCrop(square, VIEW);
    const zoomed = zoomAround(square, VIEW, start, 2, { x: 0, y: 0 });
    // 왼쪽 위 모서리를 붙잡고 키우면 그 모서리는 그대로다.
    expect(zoomed).toEqual({ zoom: 2, x: 0, y: 0 });
    expect(sourceRect(square, VIEW, zoomed)).toEqual({
      x: 0,
      y: 0,
      size: 200,
    });
  });

  it("zooms around the center by default", () => {
    const square = { width: 400, height: 400 };
    const zoomed = zoomAround(square, VIEW, initialCrop(square, VIEW), 2);
    expect(sourceRect(square, VIEW, zoomed)).toEqual({
      x: 100,
      y: 100,
      size: 200,
    });
  });
});
