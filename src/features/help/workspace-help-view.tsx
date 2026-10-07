"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button, EmptyState, Icon } from "@/design-system/primitives";
import {
  isUnavailable,
  PreparingState,
} from "@/features/common/preparing-state";
import { INTL_LOCALE, LOCALE, t } from "@/i18n";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";

import { searchTopics, type GuideTopic } from "./guide-content";
import styles from "./workspace-help-view.module.css";

type HelpPage = { kind: "topics" } | { kind: "topic"; id: string };

function useGuides() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.guides,
    queryFn: () => services.help.guides(),
    staleTime: Infinity,
  });
}

const LONG_DATE = new Intl.DateTimeFormat(INTL_LOCALE[LOCALE], {
  year: "numeric",
  month: "long",
  day: "numeric",
});

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return LONG_DATE.format(new Date(year, month - 1, day));
}

function GuideTopics({
  topics,
  onOpen,
}: {
  topics: GuideTopic[];
  onOpen: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = searchTopics(query, topics);
  return (
    <div className={styles.listBody}>
      <div className={styles.search} role="search">
        <Icon name="search" size={17} />
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder={t("가이드 검색")}
          aria-label={t("가이드 검색")}
          value={query}
          size={Math.max(query.length, 1)}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            aria-label={t("가이드::검색어 지우기")}
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
          >
            <Icon name="x" size={15} />
          </button>
        )}
      </div>
      {matches.length === 0 ? (
        <div className={styles.panel}>
          <EmptyState icon="search-x" title={t("가이드::검색 결과가 없어요")} />
        </div>
      ) : (
        <ul className={styles.topics} aria-label={t("가이드 주제")}>
          {matches.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                className={styles.topic}
                onClick={() => onOpen(topic.id)}
              >
                <span className={styles.topicTitle}>{topic.title}</span>
                <span className={styles.topicSummary}>{topic.summary}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function GuideArticle({
  topic,
  topics,
  onOpen,
}: {
  topic: GuideTopic;
  topics: GuideTopic[];
  onOpen: (id: string) => void;
}) {
  const [activeId, setActiveId] = useState(topic.sections[0]?.id ?? null);
  const articleRef = useRef<HTMLElement>(null);

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
    <div className={styles.articleLayout}>
      <article ref={articleRef} className={styles.article}>
        <header className={styles.articleHeader}>
          <h1 className={styles.pageTitle}>{topic.title}</h1>
          <p className={styles.articleMeta}>
            {t("마지막 업데이트 {date} · 읽는 데 {minutes}분", {
              date: longDate(topic.updatedAt),
              minutes: topic.readMinutes,
            })}
          </p>
        </header>
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
              <button
                key={item.id}
                type="button"
                className={styles.chip}
                onClick={() => onOpen(item.id)}
              >
                {item.title}
              </button>
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
  );
}

export function WorkspaceHelpView() {
  const guides = useGuides();
  const [page, setPage] = useState<HelpPage>({ kind: "topics" });
  const viewRef = useRef<HTMLDivElement>(null);

  const go = (next: HelpPage) => {
    setPage(next);
    viewRef.current?.scrollIntoView({ block: "start" });
  };

  const topic =
    page.kind === "topic"
      ? guides.data?.find((candidate) => candidate.id === page.id)
      : undefined;

  const loadError = isUnavailable(guides.error) ? (
    <div className={styles.panel}>
      <PreparingState what={t("가이드::사용 가이드")} />
    </div>
  ) : (
    <div className={styles.panel}>
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title={t("가이드를 불러오지 못했어요")}
        description={
          page.kind === "topic"
            ? t(
                "선택한 주제는 그대로 남아 있어요. 연결을 확인한 뒤 다시 시도해 주세요.",
              )
            : t("가이드::연결을 확인한 뒤 다시 시도해 주세요.")
        }
        action={
          <Button size="md" icon="refresh-cw" onClick={() => guides.refetch()}>
            {t("다시 시도")}
          </Button>
        }
      />
    </div>
  );

  const loading = (
    <div className={styles.panel}>
      <EmptyState
        role="status"
        icon="loader-circle"
        title={t("가이드를 불러오는 중이에요")}
      />
    </div>
  );

  return (
    <div ref={viewRef} className={styles.view}>
      {page.kind === "topics" && (
        <div className={styles.home}>
          <h1 className={styles.pageTitle}>{t("가이드::사용 가이드")}</h1>
          {guides.isPending ? (
            loading
          ) : guides.isError ? (
            loadError
          ) : (
            <GuideTopics
              topics={guides.data}
              onOpen={(id) => go({ kind: "topic", id })}
            />
          )}
        </div>
      )}
      {page.kind === "topic" && (
        <div className={styles.home}>
          <nav className={styles.inlineHeader} aria-label={t("가이드::위치")}>
            <Button
              size="md"
              icon="arrow-left"
              onClick={() => go({ kind: "topics" })}
            >
              {t("주제 목록")}
            </Button>
            <span className={styles.crumbs}>
              {t("가이드::사용 가이드")} / {topic?.title ?? t("가이드::가이드")}
            </span>
          </nav>
          {guides.isPending ? (
            loading
          ) : guides.isError || !topic ? (
            loadError
          ) : (
            <GuideArticle
              key={topic.id}
              topic={topic}
              topics={guides.data}
              onOpen={(id) => go({ kind: "topic", id })}
            />
          )}
        </div>
      )}
    </div>
  );
}
