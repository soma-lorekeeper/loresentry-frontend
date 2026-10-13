import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

/** 설정은 모듈이 한 번 읽어 쥐고 있다. 보관된 값을 바꿔 가며 보려면 모듈을 새로 불러야 한다. */
async function readPrefs() {
  vi.resetModules();
  const { useEditorPrefs } = await import("./editor-prefs");
  return renderHook(() => useEditorPrefs()).result.current;
}

const LEGACY_KEY = "loresentry.editor-prefs";
const KEY = "loresentry.editor-prefs.v2";

beforeEach(() => window.localStorage.clear());

describe("editor prefs", () => {
  it("starts at 10.5pt, the same size as the old 14px default", async () => {
    expect(await readPrefs()).toEqual({
      font: "inter",
      fontSize: 10.5,
      lineHeight: 1.5,
    });
  });

  /**
   * 예전에는 글자 크기를 px 로 적었다. 같은 자리의 pt 로 옮겨야 고른 순서(작게·보통·크게)가
   * 유지된다. 14 와 16 은 px 목록과 pt 목록에 모두 있어, 보관 자리를 나누지 않으면 구분할 수 없다.
   */
  it.each([
    [13, 10],
    [14, 10.5],
    [16, 12],
    [20, 16],
  ])("moves a size saved as %ipx to %fpt", async (px, pt) => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ font: "mono", fontSize: px, lineHeight: 2 }),
    );

    expect(await readPrefs()).toEqual({
      font: "mono",
      fontSize: pt,
      lineHeight: 2,
    });
  });

  it("reads a size saved in pt as it is", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ font: "batang", fontSize: 14, lineHeight: 1.65 }),
    );
    // 옛 자리에 값이 남아 있어도 새 자리가 먼저다.
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ fontSize: 20 }));

    expect(await readPrefs()).toEqual({
      font: "batang",
      fontSize: 14,
      lineHeight: 1.65,
    });
  });

  it("moves the old single serif choice to Nanum Myeongjo and drops the alignment", async () => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ font: "myeongjo", fontSize: 14, align: "justify" }),
    );

    expect(await readPrefs()).toEqual({
      font: "nanum-myeongjo",
      fontSize: 10.5,
      lineHeight: 1.5,
    });
  });

  it("falls back to the defaults for values that are no longer offered", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ font: "comic-sans", fontSize: 99, lineHeight: 3 }),
    );

    expect(await readPrefs()).toEqual({
      font: "inter",
      fontSize: 10.5,
      lineHeight: 1.5,
    });
  });

  it("saves to the new place and leaves the old one alone", async () => {
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ fontSize: 16 }));
    vi.resetModules();
    const { setEditorPrefs } = await import("./editor-prefs");

    setEditorPrefs({ font: "georgia" });

    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({
      font: "georgia",
      fontSize: 12,
      lineHeight: 1.5,
    });
    expect(JSON.parse(window.localStorage.getItem(LEGACY_KEY)!)).toEqual({
      fontSize: 16,
    });
  });
});
