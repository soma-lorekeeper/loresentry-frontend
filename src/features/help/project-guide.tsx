"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { Button, EmptyState, Icon } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { ProjectShell } from "@/features/projects/project-shell";
import { t } from "@/i18n";

import { findTopic, searchTopics } from "./guide-content";
import styles from "./project-guide.module.css";

export function ProjectGuidePage({ user }: { user: User }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = findTopic(searchParams.get("topic"));
  const [query, setQuery] = useState("");
  const topics = searchTopics(query);

  if (topic) {
    return (
      <ProjectShell
        user={user}
        section="guide"
        title={topic.title}
        description={topic.summary}
      >
        <nav className={styles.breadcrumb} aria-label={t("가이드::위치")}>
          <Link href="/projects/guide" className={styles.crumbLink}>
            {t("가이드::사용 가이드")}
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
      title={t("가이드::사용 가이드")}
      headerAction={
        <Button size="md" onClick={() => router.push("/welcome/?replay=1")}>
          {t("처음 안내 다시 보기")}
        </Button>
      }
    >
      <div className={styles.listBody}>
        <label className={styles.search}>
          <Icon name="search" size={17} />
          <span className="lk-visually-hidden">{t("가이드 검색")}</span>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t("가이드 검색")}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>
        {topics.length === 0 ? (
          <div className={styles.panel}>
            <EmptyState
              icon="search-x"
              title={t("가이드::검색 결과가 없어요")}
              action={
                <Button size="md" onClick={() => setQuery("")}>
                  {t("가이드::검색어 지우기")}
                </Button>
              }
            />
          </div>
        ) : (
          <ul className={styles.list} aria-label={t("가이드 주제")}>
            {topics.map((item) => (
              <li key={item.id}>
                <Link
                  href={`/projects/guide?topic=${item.id}`}
                  className={styles.topic}
                >
                  <span className={styles.topicTitle}>{item.title}</span>
                  <span className={styles.topicSummary}>{item.summary}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProjectShell>
  );
}
