import { describe, expect, it } from "vitest";

import type { SettingCheckFinding } from "@/domain/setting-check";

import { anchorFindings, excerptOf, focusIn, foldsOf, locate } from "./anchors";

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
    explanation: id,
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
});

describe("excerptOf", () => {
  const north = [
    "유리 지붕이 금 간 온실.",
    "북쪽 문은 낡은 열쇠 없이는 열리지 않는다. 열쇠는 기록단 결성 이후 한 번도 정원 안에 들어온 적이 없다.",
    "하린은 매일 새벽 온실 둘레를 돌며 유리에 맺힌 이슬을 닦는다. 문 앞까지는 다가가지 않는다.",
    "온실의 유리는 정원 기록단만 손볼 수 있다.",
  ];

  it("keeps the sentences around the quote and marks the quote", () => {
    const lines = excerptOf(north, "북쪽 문은 낡은 열쇠 없이는 열리지 않는다")!;

    expect(lines.map((line) => line.text)).toEqual([
      "유리 지붕이 금 간 온실.",
      north[1],
      "하린은 매일 새벽 온실 둘레를 돌며 유리에 맺힌 이슬을 닦는다.",
    ]);
    const [, marked] = lines;
    expect(lines[0].mark).toBeNull();
    expect(marked.text.slice(marked.mark!.start, marked.mark!.end)).toBe(
      "북쪽 문은 낡은 열쇠 없이는 열리지 않는다",
    );
  });

  it("adds two sentences a side at most, fewer once a side is long", () => {
    const long = "가".repeat(70) + ".";
    const lines = excerptOf(
      [`앞. ${long} 근거 문장이다. 하나. 둘. 셋.`],
      "근거 문장이다.",
    )!;

    expect(lines).toHaveLength(1);
    expect(lines[0].text).toBe(`${long} 근거 문장이다. 하나. 둘.`);
    expect(lines[0].text.slice(lines[0].mark!.start, lines[0].mark!.end)).toBe(
      "근거 문장이다",
    );
  });

  it("marks a quote that starts inside a sentence", () => {
    const [line] = excerptOf(["그날 밤, 문은 저절로 열렸다."], "문은 저절로")!;
    expect(line.text.slice(line.mark!.start, line.mark!.end)).toBe(
      "문은 저절로",
    );
    expect(line.text).toBe("그날 밤, 문은 저절로 열렸다.");
  });

  it("gives nothing when the document no longer has the quote", () => {
    expect(excerptOf(north, "기억의 빛을 비추는 등불.")).toBeNull();
    expect(excerptOf([], "아무 문장")).toBeNull();
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
