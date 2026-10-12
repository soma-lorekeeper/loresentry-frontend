import { describe, expect, it } from "vitest";

import { formatChord, matchShortcut, shortcutKeys } from "./shortcuts";

const key = (
  code: string,
  mods: Partial<
    Record<"metaKey" | "ctrlKey" | "altKey" | "shiftKey", boolean>
  > = {},
) => ({
  code,
  metaKey: false,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  ...mods,
});

describe("matchShortcut", () => {
  it("uses Command on a Mac and Control elsewhere for the main modifier", () => {
    expect(matchShortcut(key("KeyS", { metaKey: true }), true)).toBe("save");
    expect(matchShortcut(key("KeyS", { ctrlKey: true }), false)).toBe("save");
    // 그 기기의 주 보조 키가 아니면 저장이 아니다.
    expect(matchShortcut(key("KeyS", { ctrlKey: true }), true)).toBeNull();
    expect(matchShortcut(key("KeyS", { metaKey: true }), false)).toBeNull();
  });

  it("matches the physical key, so it works while typing Korean", () => {
    // 입력기가 켜져 있으면 key 는 "ㄴ" 이지만 code 는 그대로 KeyS 다.
    const event = { ...key("KeyS", { metaKey: true }), key: "ㄴ" };

    expect(matchShortcut(event, true)).toBe("save");
  });

  it("needs the modifiers to match exactly", () => {
    // ⌘⇧F 는 프로젝트 검색이고 ⌘F 는 문서에서 찾기다. 서로 겹치지 않는다.
    expect(matchShortcut(key("KeyF", { metaKey: true }), true)).toBe("find");
    expect(
      matchShortcut(key("KeyF", { metaKey: true, shiftKey: true }), true),
    ).toBe("search");
    expect(
      matchShortcut(key("KeyS", { metaKey: true, shiftKey: true }), true),
    ).toBeNull();
    expect(matchShortcut(key("KeyS"), true)).toBeNull();
  });

  it("closes a tab with Option/Alt+W, and with the main modifier where the browser allows", () => {
    expect(matchShortcut(key("KeyW", { altKey: true }), true)).toBe("closeTab");
    expect(matchShortcut(key("KeyW", { altKey: true }), false)).toBe(
      "closeTab",
    );
    expect(matchShortcut(key("KeyW", { metaKey: true }), true)).toBe(
      "closeTab",
    );
    expect(matchShortcut(key("KeyW", { ctrlKey: true }), false)).toBe(
      "closeTab",
    );
  });

  it("cycles tabs with the physical Control key on every platform", () => {
    const next = key("BracketRight", { ctrlKey: true, shiftKey: true });
    const previous = key("BracketLeft", { ctrlKey: true, shiftKey: true });

    expect(matchShortcut(next, true)).toBe("nextTab");
    expect(matchShortcut(next, false)).toBe("nextTab");
    expect(matchShortcut(previous, true)).toBe("previousTab");
  });
});

describe("shortcut labels", () => {
  it("writes Mac chords with symbols and others with names", () => {
    expect(formatChord({ mod: true, code: "KeyS" }, true)).toBe("⌘S");
    expect(formatChord({ mod: true, code: "KeyS" }, false)).toBe("Ctrl+S");
    expect(formatChord({ mod: true, shift: true, code: "KeyF" }, true)).toBe(
      "⇧⌘F",
    );
    expect(formatChord({ mod: true, shift: true, code: "KeyF" }, false)).toBe(
      "Ctrl+Shift+F",
    );
    expect(formatChord({ mod: true, code: "Backslash" }, true)).toBe("⌘\\");
    expect(
      formatChord({ ctrl: true, shift: true, code: "BracketRight" }, true),
    ).toBe("⌃⇧]");
  });

  it("shows the first chord of a shortcut", () => {
    // 탭 닫기는 Option/Alt+W 를 적는다. 브라우저가 가로채는 조합을 적어 두면 믿고 눌렀다가
    // 브라우저 탭이 닫힌다.
    expect(shortcutKeys("closeTab", true)).toBe("⌥W");
    expect(shortcutKeys("closeTab", false)).toBe("Alt+W");
  });
});
