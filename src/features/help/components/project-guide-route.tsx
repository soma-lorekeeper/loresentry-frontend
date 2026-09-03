"use client";

import { useSearchParams } from "next/navigation";

import { findProjectGuideTopic } from "../project-guide-content";
import { ProjectGuide } from "./project-guide";

export function ProjectGuideRoute() {
  const searchParams = useSearchParams();
  const requestedTopicId = searchParams.get("topic");
  const topic = findProjectGuideTopic(requestedTopicId);

  return <ProjectGuide topicId={topic?.id} />;
}
