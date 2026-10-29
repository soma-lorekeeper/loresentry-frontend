import { describe, expect, it } from "vitest";

import type { SettingCheckFinding } from "@/domain/setting-check";

import {
  anchorFindings,
  focusIn,
  foldsOf,
  locate,
  sameSource,
} from "./anchors";

function finding(
  id: string,
  quote: string,
  sourceQuote = "북쪽 문은 낡은 열쇠 없이는 열리지 않는다.",
  sourceId = "north",
): SettingCheckFinding {
  return {
    id,
    kind: "SETTING",
    core: false,
    confidence: "HIGH",
    summary: id,
    direction: id,
    quote,
    quoteFocus: null,
    source: {
      documentId: sourceId,
      title: "북쪽 온실",
      docType: "place",
      ordinal: null,
      quote: sourceQuote,
      quoteFocus: null,
    },
    verdict: null,
    reason: null,
  };
}

const paragraphs = [
  "정원은 밤이 오면 숨을 죽였다. 서윤은 세 번째 순찰에서야 알아차렸다.",
  "오래 잠겨 있던 북쪽 문 앞에는\n발자국이 하나뿐이었다.",
  "서윤은 등불을 내려놓고 천천히 문을 밀었다. 목소리가 이름을 불렀다.",
];

describe("locate", () => {
  it("ignores spacing and the quote marks or full stop around a quote", () => {
    const span = locate(
      paragraphs[1],
      "“오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다.”",
    );
    expect(span).not.toBeNull();
    expect(paragraphs[1].slice(span!.start, span!.end)).toBe(
      "오래 잠겨 있던 북쪽 문 앞에는\n발자국이 하나뿐이었다",
    );
    expect(locate(paragraphs[0], "없는 문장이다.")).toBeNull();
  });

  it("finds the focus phrase inside its sentence", () => {
    const span = focusIn(
      "서윤은 세 번째 순찰에서야 알아차렸다.",
      "세 번째 순찰",
    );
    expect(span).toEqual({ start: 4, end: 11 });
    expect(focusIn("서윤은 알아차렸다.", null)).toBeNull();
  });
});

describe("anchorFindings", () => {
  it("orders findings by where they sit and stacks the ones on one sentence", () => {
    const door = finding("door", "천천히 문을 밀었다.");
    const key = finding("key", "서윤은 등불을 내려놓고 천천히 문을 밀었다.");
    const patrol = finding("patrol", "서윤은 세 번째 순찰에서야 알아차렸다.");
    const lost = finding("lost", "고친 뒤 사라진 문장이다.");
    const { anchors, anchorOf, ordered } = anchorFindings(paragraphs, [
      door,
      key,
      patrol,
      lost,
    ]);
    expect(ordered.map((item) => item.id)).toEqual([
      "lost",
      "patrol",
      "key",
      "door",
    ]);
    expect(anchors).toHaveLength(2);
    expect(anchorOf.get("door")).toBe(anchorOf.get("key"));
    expect(anchorOf.get("door")?.findingIds).toEqual(["key", "door"]);
    expect(anchorOf.has("lost")).toBe(false);
  });

  it("finds other places that conflict with the same source sentence", () => {
    const a = finding("a", "천천히 문을 밀었다.");
    const b = finding(
      "b",
      "발자국이 하나뿐이었다.",
      " 북쪽 문은 낡은 열쇠 없이는  열리지 않는다",
    );
    const c = finding("c", "발자국이 하나뿐이었다.", "다른 문장.");
    expect(sameSource(a, [a, b, c]).map((item) => item.id)).toEqual(["b"]);
  });
});

describe("foldsOf", () => {
  const at = (paragraph: number) => ({
    key: String(paragraph),
    paragraph,
    start: 0,
    end: 1,
    findingIds: [],
  });

  it("keeps each conflict with one paragraph around it and folds long stretches", () => {
    expect(foldsOf(22, [at(0), at(1), at(2), at(7), at(18)])).toEqual([
      { start: 9, end: 17 },
    ]);
    expect(foldsOf(30, [at(15)])).toEqual([
      { start: 0, end: 14 },
      { start: 17, end: 30 },
    ]);
  });

  it("leaves a short manuscript or one without conflicts whole", () => {
    expect(foldsOf(3, [at(0)])).toEqual([]);
    expect(foldsOf(40, [])).toEqual([]);
  });
});
