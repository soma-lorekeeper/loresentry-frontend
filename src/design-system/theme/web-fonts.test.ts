import { readFileSync } from "node:fs";
import { join } from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import {
  WEB_FONTS_STORAGE_KEY,
  createWebFontScript,
  enableWebFonts,
} from "./web-fonts";

/** 브라우저의 `document.fonts` 를 흉내 낸다. 글꼴을 다 받으면 loadingdone 이 난다. */
let fonts: EventTarget;

beforeEach(() => {
  fonts = new EventTarget();
  Object.defineProperty(document, "fonts", {
    value: fonts,
    configurable: true,
  });
  delete document.documentElement.dataset.fonts;
  window.localStorage.clear();
});

afterEach(() => {
  delete document.documentElement.dataset.fonts;
});

const runHeadScript = () => new Function(createWebFontScript())();

describe("web fonts", () => {
  /**
   * 처음 온 사람에게는 그리기 전에 표시를 붙이지 않는다. 붙이면 글꼴이 스크립트를 앞질러,
   * 버튼이 보이는데 눌리지 않는 시간이 길어진다.
   */
  it("does not ask for web fonts before the screen works on a first visit", () => {
    runHeadScript();

    expect(document.documentElement.dataset.fonts).toBeUndefined();
  });

  it("turns web fonts on once the screen works, and remembers when they have arrived", () => {
    enableWebFonts();

    expect(document.documentElement.dataset.fonts).toBe("web");
    // 받는 중에는 기억하지 않는다. 받다가 떠난 사람은 다음에도 스크립트가 먼저 온다.
    expect(window.localStorage.getItem(WEB_FONTS_STORAGE_KEY)).toBeNull();

    fonts.dispatchEvent(new Event("loadingdone"));

    expect(window.localStorage.getItem(WEB_FONTS_STORAGE_KEY)).toBe("1");
  });

  /**
   * 글꼴은 브라우저에 남아 있다. 다시 온 사람에게도 미루면, 올 때마다 기기의 글꼴이 잠깐 보였다가
   * 바뀐다.
   */
  it("uses web fonts from the first paint for someone who already has them", () => {
    window.localStorage.setItem(WEB_FONTS_STORAGE_KEY, "1");

    runHeadScript();

    expect(document.documentElement.dataset.fonts).toBe("web");
  });

  it("leaves a returning visitor alone", () => {
    document.documentElement.dataset.fonts = "web";

    enableWebFonts();
    fonts.dispatchEvent(new Event("loadingdone"));

    // 이미 켜져 있으면 다시 기다리지 않는다.
    expect(window.localStorage.getItem(WEB_FONTS_STORAGE_KEY)).toBeNull();
  });

  /**
   * 미루는 동안의 글꼴 묶음은 원래 묶음에서 웹 글꼴 이름만 뺀 것이어야 한다. 그래야 글꼴이 온
   * 뒤와 오기 전의 차이가 글꼴 하나뿐이다. 두 값은 app/globals.css 에 따로 적혀 있다.
   */
  it("draws with the same stack minus the web fonts while they are held back", () => {
    const css = readFileSync(
      join(__dirname, "../../app/globals.css"),
      "utf8",
    ).replace(/\/\*[\s\S]*?\*\//g, "");
    const block = (selector: string) => {
      const start = css.indexOf(`${selector} {`);
      return css.slice(start, css.indexOf("}", start));
    };
    const stack = (source: string, name: string) =>
      new RegExp(`--lk-font-stack-${name}:([^;]+);`)
        .exec(source)![1]
        .replace(/\s+/g, " ")
        .trim();

    const full = stack(block(":root"), "ui");
    const held = stack(block("html:not([data-fonts])"), "ui");

    expect(full).toBe(`"Pretendard Variable", ${held}`);
    expect(stack(block(":root"), "display")).toBe(
      `"Wanted Sans Variable", var(--lk-font-stack-ui)`,
    );
    expect(stack(block("html:not([data-fonts])"), "display")).toBe(
      "var(--lk-font-stack-ui)",
    );
  });
});
