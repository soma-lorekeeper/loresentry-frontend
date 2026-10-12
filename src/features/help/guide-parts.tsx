"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";

import { EmptyState, SearchField } from "@/design-system/primitives";
import { INTL_LOCALE, LOCALE, t } from "@/i18n";
import { cx } from "@/shared/cx";

import { searchTopics, type GuideTopic } from "./guide-content";
import styles from "./guide-parts.module.css";

/**
 * 사용 가이드의 두 화면(주제 목록, 주제 글).
 *
 * <p>가이드는 두 곳에서 본다 — 작업공간의 도움말 탭(workspace-help-view.tsx)과 프로젝트 목록의
 * 사용 가이드(project-guide.tsx). 내용은 같은 글인데 전에는 화면을 따로 만들어, 프로젝트 쪽에는
 * 검색어 지우기도 읽는 시간도 요약 표도 목차도 없었다. 같은 글을 두 모양으로 보일 이유가 없어
 * 여기 한 벌만 둔다.
 *
 * <p>두 곳이 다른 것은 **다른 주제로 가는 방법**뿐이다. 작업공간은 탭 안에서 화면을 바꾸고
 * (`onOpen`), 프로젝트 쪽은 주소가 바뀌는 링크다(`hrefFor`). 그 차이만 {@link GuideNav} 로 받는다.
 */
export type GuideNav =
  { onOpen: (id: string) => void } | { hrefFor: (id: string) => string };

/** 다른 주제로 가는 것. 주소가 있으면 링크, 없으면 단추다 */
function TopicLink({
  id,
  nav,
  className,
  children,
}: {
  id: string;
  nav: GuideNav;
  className: string;
  children: ReactNode;
}) {
  if ("hrefFor" in nav) {
    return (
      <Link href={nav.hrefFor(id)} className={className}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" className={className} onClick={() => nav.onOpen(id)}>
      {children}
    </button>
  );
}

const LONG_DATE = new Intl.DateTimeFormat(INTL_LOCALE[LOCALE], {
  year: "numeric",
  month: "long",
  day: "numeric",
});

/** 글 제목 아래에 적는 한 줄: 마지막으로 고친 날과 읽는 데 걸리는 시간 */
export function guideMeta(topic: GuideTopic) {
  const [year, month, day] = topic.updatedAt.split("-").map(Number);
  return t("마지막 업데이트 {date} · 읽는 데 {minutes}분", {
    date: LONG_DATE.format(new Date(year, month - 1, day)),
    minutes: topic.readMinutes,
  });
}

/** 주제 목록. 위의 검색 칸으로 제목과 본문을 함께 찾는다 */
export function GuideTopics({
  topics,
  nav,
}: {
  topics: GuideTopic[];
  nav: GuideNav;
}) {
  const [query, setQuery] = useState("");
  const matches = searchTopics(query, topics);
  return (
    <div className={styles.listBody}>
      <SearchField
        value={query}
        label={t("가이드 검색")}
        clearLabel={t("가이드::검색어 지우기")}
        onClear={() => setQuery("")}
        onChange={(event) => setQuery(event.target.value)}
      />
      {matches.length === 0 ? (
        <div className={styles.panel}>
          <EmptyState icon="search-x" title={t("가이드::검색 결과가 없어요")} />
        </div>
      ) : (
        <ul className={styles.topics} aria-label={t("가이드 주제")}>
          {matches.map((topic) => (
            <li key={topic.id}>
              <TopicLink id={topic.id} nav={nav} className={styles.topic}>
                <span className={styles.topicTitle}>{topic.title}</span>
                <span className={styles.topicSummary}>{topic.summary}</span>
              </TopicLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/**
 * 주제 글 한 편: 요약, 한눈에 보는 표, 번호 붙은 절, 관련 글. 넓은 화면에서는 옆에 목차
 * ("이 문서에서")가 따라오며 지금 읽는 절을 표시한다.
 *
 * @param heading 글 제목과 메타 줄을 여기서 그릴지. 바깥(프로젝트 화면의 머리)이 이미 제목을
 *   그렸으면 끈다 — 같은 제목이 두 번 나오지 않게
 */
export function GuideArticle({
  topic,
  topics,
  nav,
  heading = true,
}: {
  topic: GuideTopic;
  topics: GuideTopic[];
  nav: GuideNav;
  heading?: boolean;
}) {
  const [activeId, setActiveId] = useState(topic.sections[0]?.id ?? null);
  const articleRef = useRef<HTMLElement>(null);

  // 화면 위쪽에 걸린 절을 "지금 읽는 절" 로 본다. 목차가 그것을 따라 표시한다.
  useEffect(() => {
    const root = articleRef.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        const id = visible[0]?.target.getAttribute("data-section");
        if (id) setActiveId(id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    root
      .querySelectorAll("[data-section]")
      .forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [topic.id]);

  const related = topic.related
    .map((id) => topics.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is GuideTopic => Boolean(candidate));

  return (
    <div className={styles.articleScope}>
      <div className={styles.articleLayout}>
        <article ref={articleRef} className={styles.article}>
          {heading && (
            <header className={styles.articleHeader}>
              <h1 className={styles.pageTitle}>{topic.title}</h1>
              <p className={styles.articleMeta}>{guideMeta(topic)}</p>
            </header>
          )}
          <p className={styles.secondary}>{topic.lead}</p>
          <dl className={styles.facts}>
            {topic.facts.map((fact) => (
              <div key={fact.label} className={styles.fact}>
                <dt>{fact.label}</dt>
                <dd>{fact.value}</dd>
              </div>
            ))}
          </dl>
          {topic.sections.map((section, index) => (
            <section
              key={section.id}
              id={`guide-${topic.id}-${section.id}`}
              data-section={section.id}
              className={styles.articleSection}
            >
              <h2 className={styles.sectionTitle}>
                {index + 1}. {section.title}
              </h2>
              <p className={styles.secondary}>{section.body}</p>
            </section>
          ))}
          {related.length > 0 && (
            <nav className={styles.related} aria-label={t("가이드::관련 문서")}>
              <span>{t("가이드::관련 문서")}</span>
              {related.map((item) => (
                <TopicLink
                  key={item.id}
                  id={item.id}
                  nav={nav}
                  className={styles.chip}
                >
                  {item.title}
                </TopicLink>
              ))}
            </nav>
          )}
        </article>
        <nav className={styles.toc} aria-label={t("이 문서에서")}>
          <span className={styles.tocLabel}>{t("이 문서에서")}</span>
          {topic.sections.map((section) => (
            <a
              key={section.id}
              href={`#guide-${topic.id}-${section.id}`}
              className={cx(
                styles.tocLink,
                activeId === section.id && styles.tocActive,
              )}
              aria-current={activeId === section.id ? "location" : undefined}
              onClick={(event) => {
                event.preventDefault();
                setActiveId(section.id);
                document
                  .getElementById(`guide-${topic.id}-${section.id}`)
                  ?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
            >
              {section.title}
            </a>
          ))}
        </nav>
      </div>
    </div>
  );
}
