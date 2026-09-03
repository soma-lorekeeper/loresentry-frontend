"use client";

import Link from "next/link";
import { type KeyboardEvent, useRef } from "react";

import { WorkspaceIcon } from "@/features/workspace/icons";
import { ProjectSidebar } from "@/features/projects/components/project-sidebar";

import {
  findProjectGuideTopic,
  projectGuideTopics,
} from "../project-guide-content";
import shellStyles from "@/features/projects/components/project-list.module.css";
import styles from "./project-guide.module.css";

export interface ProjectGuideProps {
  topicId?: string;
}

export function ProjectGuide({ topicId }: ProjectGuideProps) {
  const topic = findProjectGuideTopic(topicId);
  const topicRefs = useRef<Array<HTMLAnchorElement | null>>([]);

  const handleTopicKeyDown = (
    event: KeyboardEvent<HTMLAnchorElement>,
    index: number,
  ) => {
    let target = index;
    if (event.key === "ArrowDown")
      target = (index + 1) % projectGuideTopics.length;
    else if (event.key === "ArrowUp") {
      target =
        (index - 1 + projectGuideTopics.length) % projectGuideTopics.length;
    } else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = projectGuideTopics.length - 1;
    else return;
    event.preventDefault();
    topicRefs.current[target]?.focus();
  };

  return (
    <div className={shellStyles.shell}>
      <ProjectSidebar current="guide" />
      <main className={styles.main}>
        {topic ? (
          <div className={styles.articleLayout}>
            <nav aria-label="이 문서의 목차" className={styles.toc}>
              <strong>이 문서에서</strong>
              {topic.sections.map((section) => (
                <a href={`#${section.id}`} key={section.id}>
                  {section.title}
                </a>
              ))}
            </nav>
            <div className={styles.articleMain}>
              <Link className={styles.back} href="/projects/guide">
                <WorkspaceIcon name="chevron-left" /> 가이드 목록으로
              </Link>
              <article className={styles.article}>
                <span className={styles.eyebrow}>사용 가이드</span>
                <h1>{topic.title}</h1>
                <p>{topic.description}</p>
                {topic.sections.map((section) => (
                  <section key={section.id}>
                    <h2 id={section.id}>{section.title}</h2>
                    <p>{section.body}</p>
                  </section>
                ))}
              </article>
            </div>
          </div>
        ) : (
          <div className={styles.content}>
            <Link
              className={styles.back}
              href="/projects#project-navigation-list"
            >
              <WorkspaceIcon name="chevron-left" /> 프로젝트 목록으로 돌아가기
            </Link>
            <header className={styles.header}>
              <span className={styles.eyebrow}>Guide</span>
              <h1>사용 가이드</h1>
              <p>궁금한 기능을 선택해 Lorekeeper 사용 방법을 확인하세요.</p>
            </header>
            <nav aria-label="가이드 주제" className={styles.topics}>
              {projectGuideTopics.map((guideTopic, index) => (
                <Link
                  className={styles.topic}
                  href={`/projects/guide?topic=${guideTopic.id}`}
                  key={guideTopic.id}
                  onKeyDown={(event) => handleTopicKeyDown(event, index)}
                  ref={(node) => {
                    topicRefs.current[index] = node;
                  }}
                >
                  <span aria-hidden="true" className={styles.topicIcon}>
                    <WorkspaceIcon name="book" />
                  </span>
                  <span className={styles.topicCopy}>
                    <strong>{guideTopic.title}</strong>
                    <span>{guideTopic.description}</span>
                  </span>
                  <WorkspaceIcon name="chevron-right" />
                </Link>
              ))}
            </nav>
          </div>
        )}
      </main>
    </div>
  );
}
