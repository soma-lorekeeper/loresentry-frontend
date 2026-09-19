import { describe, expect, it } from "vitest";

import { applyHunk, lineDiff, toLines } from "./line-diff";

/** 덩어리를 읽기 쉬운 모양으로 접는다 */
function shape(left: string, right: string) {
  return lineDiff(left, right).map((hunk) => ({
    same: hunk.same,
    left: hunk.leftLines,
    right: hunk.rightLines,
    at: [hunk.leftStart, hunk.rightStart],
  }));
}

describe("줄 견주기", () => {
  it("같은 글은 한 덩어리다", () => {
    expect(shape("가\n나\n다", "가\n나\n다")).toEqual([
      {
        same: true,
        left: ["가", "나", "다"],
        right: ["가", "나", "다"],
        at: [0, 0],
      },
    ]);
  });

  it("가운데에 줄이 끼면 그 자리만 덩어리가 된다", () => {
    // 현재 11번째 줄이 신규 13번째 줄과 같고 그 사이 둘이 새로 생긴 경우.
    expect(shape("가\n나", "가\n새1\n새2\n나")).toEqual([
      { same: true, left: ["가"], right: ["가"], at: [0, 0] },
      { same: false, left: [], right: ["새1", "새2"], at: [1, 1] },
      { same: true, left: ["나"], right: ["나"], at: [1, 3] },
    ]);
  });

  it("줄이 빠지면 왼쪽만 담긴 덩어리가 된다", () => {
    expect(shape("가\n나\n다", "가\n다")).toEqual([
      { same: true, left: ["가"], right: ["가"], at: [0, 0] },
      { same: false, left: ["나"], right: [], at: [1, 1] },
      { same: true, left: ["다"], right: ["다"], at: [2, 1] },
    ]);
  });

  it("붙어 있는 변경은 한 덩어리로 묶인다", () => {
    // 따로 세우면 화살표가 셋이 되고, 하나씩 밀어야 한다.
    const hunks = lineDiff("가\n나\n다\n라", "가\nX\nY\n라");
    expect(hunks).toHaveLength(3);
    expect(hunks[1].same).toBe(false);
    expect(hunks[1].leftLines).toEqual(["나", "다"]);
    expect(hunks[1].rightLines).toEqual(["X", "Y"]);
  });

  it("이어 붙이면 원래 글이 된다", () => {
    const left = "한 줄\n\n두 문단\n세 번째";
    const right = "한 줄\n\n바뀐 문단\n세 번째\n덧붙임";
    const hunks = lineDiff(left, right);

    expect(hunks.flatMap((hunk) => hunk.leftLines)).toEqual(toLines(left));
    expect(hunks.flatMap((hunk) => hunk.rightLines)).toEqual(toLines(right));
  });

  it("빈 글은 줄이 하나도 없다", () => {
    // 빈 글과 '빈 줄 하나'는 다르다. 빈 글을 [""] 로 보면 없던 줄이 하나 생긴다.
    expect(toLines("")).toEqual([]);
    expect(shape("", "새 글")).toEqual([
      { same: false, left: [], right: ["새 글"], at: [0, 0] },
    ]);
  });
});

describe("덩어리 반영", () => {
  it("그 구간만 갈아 끼운다", () => {
    expect(applyHunk("가\n나\n다", 1, 1, ["X", "Y"])).toBe("가\nX\nY\n다");
  });

  it("빈 구간에 넣으면 끼워 넣기다", () => {
    expect(applyHunk("가\n나", 1, 0, ["새"])).toBe("가\n새\n나");
  });

  it("빈 줄 목록을 넣으면 지우기다", () => {
    expect(applyHunk("가\n나\n다", 1, 1, [])).toBe("가\n다");
  });
});
