import { describe, expect, it } from "vitest";

import {
  parseShortcut,
  shortcutLabel,
  splitShortcuts,
  stripShortcuts,
} from "./shortcuts";

describe("parseShortcut", () => {
  it("knows the tour, import, views and guide sections", () => {
    expect(parseShortcut("tour")).toEqual({ id: "tour", kind: "tour" });
    expect(parseShortcut("import")).toEqual({ id: "import", kind: "import" });
    expect(parseShortcut("view:graph")).toEqual({
      id: "view:graph",
      kind: "view",
      view: "graph",
    });
    expect(parseShortcut("guide:writing#import")).toEqual({
      id: "guide:writing#import",
      kind: "guide",
      topic: "writing",
      section: "import",
    });
    expect(parseShortcut("guide:start")).toEqual({
      id: "guide:start",
      kind: "guide",
      topic: "start",
      section: null,
    });
  });

  it("drops what it does not know", () => {
    expect(parseShortcut("view:nope")).toBeNull();
    expect(parseShortcut("press:import")).toBeNull();
    expect(parseShortcut("guide:")).toBeNull();
  });
});

describe("splitShortcuts", () => {
  it("takes the markers out of the text and keeps each shortcut once", () => {
    const { text, shortcuts } = splitShortcuts(
      "가져오기를 누르세요. \n- txt와 md만 받아요.\n[[action:import]][[action:view:nope]][[action:import]][[action:guide:writing#import]]",
    );
    expect(text).toBe("가져오기를 누르세요.\n- txt와 md만 받아요.");
    expect(shortcuts.map((s) => s.id)).toEqual([
      "import",
      "guide:writing#import",
    ]);
    expect(stripShortcuts("답 [[action:tour]]")).toBe("답");
  });

  it("leaves citation markers alone", () => {
    expect(splitShortcuts("답 [[1]] 끝").text).toBe("답 [[1]] 끝");
  });
});

describe("shortcutLabel", () => {
  it("names guide sections after the guide and falls back for unknown ids", () => {
    expect(shortcutLabel(parseShortcut("guide:writing#import")!)).toBe(
      "가이드 · 쓰던 원고 가져오기",
    );
    expect(shortcutLabel(parseShortcut("guide:writing")!)).toBe(
      "가이드 · 원고 작성",
    );
    expect(shortcutLabel(parseShortcut("guide:nothing")!)).toBe(
      "사용 가이드 열기",
    );
    expect(shortcutLabel(parseShortcut("view:setting-check")!)).toBe(
      "설정 오류 점검 열기",
    );
  });
});
