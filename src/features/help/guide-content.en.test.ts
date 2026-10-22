import { describe, expect, it } from "vitest";

import { GUIDE_TOPICS, findTopic, searchTopics } from "./guide-content";
import { GUIDE_TOPICS_EN } from "./guide-topics.en";
import { GUIDE_TOPICS_KO } from "./guide-topics.ko";

const HANGUL = /[가-힣]/;

function shape(topics: typeof GUIDE_TOPICS) {
  return topics.map((topic) => ({
    id: topic.id,
    updatedAt: topic.updatedAt,
    readMinutes: topic.readMinutes,
    facts: topic.facts.length,
    sections: topic.sections.map((section) => section.id),
    related: topic.related,
  }));
}

describe("guide content (English build)", () => {
  it("serves the English topics", () => {
    expect(GUIDE_TOPICS).toBe(GUIDE_TOPICS_EN);
    expect(JSON.stringify(GUIDE_TOPICS)).not.toMatch(HANGUL);
    expect(findTopic("trash")?.title).toBe("Trash and restore");
  });

  it("matches the Korean topics one for one", () => {
    expect(shape(GUIDE_TOPICS_EN)).toEqual(shape(GUIDE_TOPICS_KO));
  });

  it("covers the AI chat in both languages", () => {
    const en = GUIDE_TOPICS_EN.find((topic) => topic.id === "chat");
    const ko = GUIDE_TOPICS_KO.find((topic) => topic.id === "chat");
    expect(en?.title).toBe("AI chat");
    expect(ko?.title).toBe("AI 챗");
    expect(ko?.sections.map((section) => section.id)).toEqual([
      "open",
      "ask",
      "selection",
      "answer",
      "stop",
      "sessions",
      "too-long",
    ]);
    expect(searchTopics("drag").map((topic) => topic.id)).toContain("chat");
    expect(searchTopics("note chips").map((topic) => topic.id)).toEqual([
      "chat",
    ]);
  });

  it("searches the English text", () => {
    expect(searchTopics("version history").map((topic) => topic.id)).toEqual([
      "writing",
      "refresh",
    ]);
    expect(searchTopics("ROWS TO SHOW").map((topic) => topic.id)).toEqual([
      "memo",
    ]);
    expect(searchTopics("휴지통")).toEqual([]);
  });
});
