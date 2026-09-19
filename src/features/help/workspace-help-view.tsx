"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { useRuntimeConfig } from "@/app/providers";
import { Button, EmptyState, Icon } from "@/design-system/primitives";
import type { WorkspaceViewProps } from "@/features/workspace/views/view-types";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";

import { searchTopics, type GuideTopic } from "./guide-content";
import styles from "./workspace-help-view.module.css";

type HelpPage =
  { kind: "home" } | { kind: "topics" } | { kind: "topic"; id: string };
type FeedbackState = "opened" | "error" | null;

function useGuides() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.guides,
    queryFn: () => services.help.guides(),
    staleTime: Infinity,
  });
}

function longDate(iso: string) {
  const [year, month, day] = iso.split("-").map(Number);
  return `${year}년 ${month}월 ${day}일`;
}

function HelpHome({
  feedback,
  onGuide,
  onFeedback,
  onCopy,
  onBack,
}: {
  feedback: FeedbackState;
  onGuide: () => void;
  onFeedback: () => void;
  onCopy: (() => void) | null;
  onBack: () => void;
}) {
  return (
    <div className={styles.home}>
      <header className={styles.homeHeader}>
        <div className={styles.homeCopy}>
          <h1 className={styles.pageTitle}>도움말</h1>
          <p className={styles.secondary}>
            Lorekeeper 사용 방법을 확인하거나 의견을 보내세요.
          </p>
        </div>
        <Button size="md" icon="arrow-left" onClick={onBack}>
          작업공간으로 돌아가기
        </Button>
      </header>
      {feedback && (
        <div
          className={styles.notice}
          role={feedback === "error" ? "alert" : "status"}
        >
          <Icon
            name={feedback === "error" ? "external-link" : "circle-check"}
            size={17}
          />
          <span className={styles.noticeCopy}>
            <strong>
              {feedback === "error"
                ? "피드백 페이지를 열지 못했습니다"
                : "피드백 페이지를 새 탭에서 열었습니다"}
            </strong>
            <span>
              {feedback === "error"
                ? "팝업 차단을 확인하거나 링크를 복사해 직접 열어주세요."
                : "돌아온 포커스는 피드백 보내기 카드에 있습니다."}
            </span>
          </span>
          {feedback === "error" && (
            <span className={styles.noticeActions}>
              <Button size="lg" icon="refresh-cw" onClick={onFeedback}>
                다시 열기
              </Button>
              <Button
                size="lg"
                icon="copy"
                disabled={!onCopy}
                onClick={() => onCopy?.()}
              >
                링크 복사
              </Button>
            </span>
          )}
        </div>
      )}
      <div className={styles.cards}>
        <button type="button" className={styles.card} onClick={onGuide}>
          <span className={styles.cardHead}>
            <span className={styles.cardIcon}>
              <Icon name="book-open" size={17} />
            </span>
            <span className={styles.cardTitle}>사용 가이드</span>
            <Icon name="arrow-right" size={17} className={styles.cardArrow} />
          </span>
          <span className={styles.secondary}>
            작업공간과 파일 편집 방법을 단계별로 확인합니다.
          </span>
        </button>
        <button
          type="button"
          className={styles.card}
          data-help-feedback
          onClick={onFeedback}
        >
          <span className={styles.cardHead}>
            <span className={styles.cardIcon}>
              <Icon name="message-square-plus" size={17} />
            </span>
            <span className={styles.cardTitle}>피드백 보내기</span>
            <Icon name="external-link" size={17} className={styles.cardArrow} />
          </span>
          <span className={styles.secondary}>
            문제와 개선 의견을 외부 피드백 폼으로 전달합니다.
          </span>
          <span className={styles.cardHint}>새 탭에서 열림</span>
        </button>
      </div>
    </div>
  );
}

function GuideTopics({
  topics,
  onOpen,
  onBack,
}: {
  topics: GuideTopic[];
  onOpen: (id: string) => void;
  onBack: () => void;
}) {
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const matches = searchTopics(query, topics);
  return (
    <div className={styles.home}>
      <header className={styles.inlineHeader}>
        <Button size="md" icon="arrow-left" onClick={onBack}>
          도움말로 돌아가기
        </Button>
        <h1 className={styles.pageTitle}>사용 가이드</h1>
      </header>
      <div className={styles.search} role="search">
        <Icon name="search" size={17} />
        <input
          ref={inputRef}
          type="search"
          className={styles.searchInput}
          placeholder="가이드 검색"
          aria-label="가이드 검색"
          value={query}
          size={Math.max(query.length, 1)}
          onChange={(event) => setQuery(event.target.value)}
        />
        {query && (
          <button
            type="button"
            className={styles.clear}
            aria-label="검색어 지우기"
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
          <EmptyState
            icon="search-x"
            title="일치하는 가이드가 없습니다"
            description="다른 검색어를 입력하거나 주제 목록으로 돌아가세요."
          />
        </div>
      ) : (
        <ul className={styles.topics} aria-label="가이드 주제">
          {matches.map((topic) => (
            <li key={topic.id}>
              <button
                type="button"
                className={styles.topic}
                onClick={() => onOpen(topic.id)}
              >
                <Icon name={topic.icon} size={17} />
                <span className={styles.topicTitle}>{topic.title}</span>
                <Icon name="chevron-right" size={16} />
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
            마지막 업데이트 {longDate(topic.updatedAt)} · 읽는 데{" "}
            {topic.readMinutes}분
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
              <span aria-hidden="true">#</span>
              {index + 1}. {section.title}
            </h2>
            <p className={styles.secondary}>{section.body}</p>
          </section>
        ))}
        {related.length > 0 && (
          <nav className={styles.related} aria-label="관련 문서">
            <span>관련 문서</span>
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
      <nav className={styles.toc} aria-label="이 문서에서">
        <span className={styles.tocLabel}>이 문서에서</span>
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

export function WorkspaceHelpView({ tab, paneId }: WorkspaceViewProps) {
  const { setTabLabel, closeTab } = useWorkspace();
  const { feedbackUrl } = useRuntimeConfig();
  const guides = useGuides();
  const [page, setPage] = useState<HelpPage>({ kind: "home" });
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const viewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setTabLabel(
      tab.id,
      page.kind === "home" ? null : { icon: "book-open", title: "사용 가이드" },
    );
  }, [page.kind, setTabLabel, tab.id]);

  useEffect(() => () => setTabLabel(tab.id, null), [setTabLabel, tab.id]);

  const go = (next: HelpPage) => {
    setPage(next);
    viewRef.current?.scrollIntoView({ block: "start" });
  };

  // 서버 가정: 피드백은 외부 폼(runtime config의 feedbackUrl)으로 연결한다. 값이 없으면 여는 데 실패한 것으로 본다.
  const openFeedback = () => {
    const opened = feedbackUrl ? window.open(feedbackUrl, "_blank") : null;
    if (opened) opened.opener = null;
    setFeedback(opened ? "opened" : "error");
    viewRef.current
      ?.querySelector<HTMLElement>("[data-help-feedback]")
      ?.focus();
  };

  const copyLink = feedbackUrl
    ? () => void navigator.clipboard?.writeText(feedbackUrl)
    : null;

  const topic =
    page.kind === "topic"
      ? guides.data?.find((candidate) => candidate.id === page.id)
      : undefined;

  const loadError = (
    <div className={styles.panel}>
      <EmptyState
        role="alert"
        icon="triangle-alert"
        title="가이드를 불러오지 못했어요"
        description={
          page.kind === "topic"
            ? "선택한 주제는 그대로 남아 있어요. 연결을 확인한 뒤 다시 시도해 주세요."
            : "연결을 확인한 뒤 다시 시도해 주세요."
        }
        action={
          <Button size="md" icon="refresh-cw" onClick={() => guides.refetch()}>
            다시 시도
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
        title="가이드를 불러오는 중이에요"
      />
    </div>
  );

  return (
    <div ref={viewRef} className={styles.view}>
      {page.kind === "home" && (
        <HelpHome
          feedback={feedback}
          onGuide={() => go({ kind: "topics" })}
          onFeedback={openFeedback}
          onCopy={copyLink}
          onBack={() => closeTab(paneId, tab.id)}
        />
      )}
      {page.kind === "topics" &&
        (guides.isPending ? (
          loading
        ) : guides.isError ? (
          loadError
        ) : (
          <GuideTopics
            topics={guides.data}
            onOpen={(id) => go({ kind: "topic", id })}
            onBack={() => go({ kind: "home" })}
          />
        ))}
      {page.kind === "topic" && (
        <div className={styles.home}>
          <nav className={styles.inlineHeader} aria-label="위치">
            <Button
              size="md"
              icon="arrow-left"
              onClick={() => go({ kind: "topics" })}
            >
              주제 목록
            </Button>
            <span className={styles.crumbs}>
              사용 가이드 / {topic?.title ?? "가이드"}
            </span>
          </nav>
          {guides.isPending ? (
            loading
          ) : guides.isError || !topic ? (
            loadError
          ) : (
            <GuideArticle
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
