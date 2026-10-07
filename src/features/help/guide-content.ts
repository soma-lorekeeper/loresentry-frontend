import { LOCALE } from "@/i18n";

import { GUIDE_TOPICS_EN } from "./guide-topics.en";
import { GUIDE_TOPICS_KO } from "./guide-topics.ko";

export interface GuideSection {
  id: string;
  title: string;
  body: string;
}

export interface GuideTopic {
  id: string;
  title: string;
  summary: string;
  lead: string;
  updatedAt: string;
  readMinutes: number;
  facts: Array<{ label: string; value: string }>;
  sections: GuideSection[];
  related: string[];
}

export const GUIDE_TOPICS: GuideTopic[] =
  LOCALE === "en" ? GUIDE_TOPICS_EN : GUIDE_TOPICS_KO;

export function findTopic(topicId: string | null) {
  return GUIDE_TOPICS.find((topic) => topic.id === topicId) ?? null;
}

export function searchTopics(query: string, topics = GUIDE_TOPICS) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return topics;
  return topics.filter((topic) =>
    [
      topic.title,
      topic.summary,
      topic.lead,
      ...topic.sections.map((s) => `${s.title} ${s.body}`),
    ]
      .join(" ")
      .toLocaleLowerCase()
      .includes(needle),
  );
}
