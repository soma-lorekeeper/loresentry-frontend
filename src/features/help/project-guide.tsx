"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, EmptyState, Icon } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { ProjectShell } from "@/features/projects/project-shell";

import { findTopic, searchTopics } from "./guide-content";
import styles from "./project-guide.module.css";

export function ProjectGuidePage({ user }: { user: User }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = findTopic(searchParams.get("topic"));
  const [query, setQuery] = useState("");
  const topics = searchTopics(query);

  const backButton = (
    <Button
      size="md"
      icon="arrow-left"
      onClick={() => router.push("/projects")}
    >
      프로젝트 목록으로
    </Button>
  );

  if (topic) {
    return (
      <ProjectShell
        user={user}
        section="guide"
        title={topic.title}
        description={topic.summary}
        headerAction={backButton}
      >
        <nav className={styles.breadcrumb} aria-label="위치">
          <Link href="/projects/guide" className={styles.crumbLink}>
            사용 가이드
          </Link>
          <Icon name="chevron-right" size={14} />
          <span className={styles.crumbCurrent} aria-current="page">
            {topic.title}
          </span>
        </nav>
        <article className={styles.article}>
          <p className={styles.lead}>{topic.lead}</p>
          <ol className={styles.steps}>
            {topic.sections.map((section, index) => (
              <li key={section.id} className={styles.step}>
                <span className={styles.stepNumber}>{index + 1}</span>
                <span className={styles.stepCopy}>
                  <span className={styles.stepTitle}>{section.title}</span>
                  <span className={styles.stepBody}>{section.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </article>
      </ProjectShell>
    );
  }

  return (
    <ProjectShell
      user={user}
      section="guide"
      title="사용 가이드"
      description="Lorekeeper의 주요 기능을 프로젝트 목록에서 바로 살펴보세요."
      headerAction={backButton}
    >
      <label className={styles.search}>
        <Icon name="search" size={17} />
        <span className="lk-visually-hidden">가이드 검색</span>
        <input
          type="search"
          className={styles.searchInput}
          placeholder="가이드 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {topics.length === 0 ? (
        <EmptyState
          icon="search-x"
          title="검색 결과가 없어요"
          description="다른 단어로 검색하거나 전체 주제를 둘러보세요."
          action={
            <Button size="md" onClick={() => setQuery("")}>
              검색어 지우기
            </Button>
          }
        />
      ) : (
        <div className={styles.grid}>
          {topics.map((item) => (
            <Link
              key={item.id}
              href={`/projects/guide?topic=${item.id}`}
              className={styles.topic}
            >
              <span className={styles.topicIcon}>
                <Icon name={item.icon} size={18} />
              </span>
              <span className={styles.topicCopy}>
                <span className={styles.topicTitle}>{item.title}</span>
                <span className={styles.topicSummary}>{item.summary}</span>
              </span>
              <Icon name="arrow-right" size={16} />
            </Link>
          ))}
        </div>
      )}
    </ProjectShell>
  );
}
