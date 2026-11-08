"use client";

import { trackUsage } from "@/features/analytics/usage-analytics";
import type { UsageParameters } from "@/features/analytics/usage-schema";

import { useUsageViewQuery } from "@/features/analytics/usage-hooks";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import { Button, EmptyState } from "@/design-system/primitives";
import {
  isUnavailable,
  PreparingState,
} from "@/features/common/preparing-state";
import { t } from "@/i18n";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { GuideArticle, GuideTopics } from "./guide-parts";
import { onHelpRequest, sectionAnchor, takeHelpRequest } from "./help-request";
import parts from "./guide-parts.module.css";
import styles from "./workspace-help-view.module.css";

type HelpPage =
  { kind: "topics" } | { kind: "topic"; id: string; section?: string | null };

function requestedPage(): HelpPage {
  const request = takeHelpRequest();
  return request
    ? { kind: "topic", id: request.topic, section: request.section }
    : { kind: "topics" };
}

function useGuides() {
  const services = useServices();
  return useQuery({
    queryKey: queryKeys.guides,
    queryFn: () => services.help.guides(),
    staleTime: Infinity,
  });
}

export function WorkspaceHelpView() {
  const guides = useGuides();
  const retryUsageLoad = useUsageViewQuery(
    guides,
    guides.data?.length === 0,
    "help",
  );
  const [page, setPage] = useState<HelpPage>(requestedPage);
  const viewRef = useRef<HTMLDivElement>(null);

  const topicShown = page.kind === "topic" && guides.isSuccess ? page.id : null;
  const sectionShown = page.kind === "topic" ? (page.section ?? null) : null;
  useEffect(() => {
    if (!topicShown || !sectionShown) return;
    document
      .getElementById(sectionAnchor(topicShown, sectionShown))
      ?.scrollIntoView({ block: "start" });
  }, [topicShown, sectionShown]);

  const go = (next: HelpPage) => {
    if (next.kind === "topic")
      trackUsage("help_action", {
        action: "topic_open",
        entry_point: "guide",
        topic_key: next.id as UsageParameters<"help_action">["topic_key"],
      });
    setPage(next);
    viewRef.current?.scrollIntoView({ block: "start" });
  };

  useEffect(() =>
    onHelpRequest((request) =>
      go({ kind: "topic", id: request.topic, section: request.section }),
    ),
  );

  const topic =
    page.kind === "topic"
      ? guides.data?.find((candidate) => candidate.id === page.id)
      : undefined;

  const loadError = isUnavailable(guides.error) ? (
    <div className={parts.panel}>
      <PreparingState what={t("가이드::사용 가이드")} />
    </div>
  ) : (
    <div className={parts.panel}>
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
          <Button
            size="md"
            icon="refresh-cw"
            onClick={() => {
              retryUsageLoad();
              void guides.refetch();
            }}
          >
            {t("다시 시도")}
          </Button>
        }
      />
    </div>
  );

  const loading = (
    <div className={parts.panel}>
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
          <h1 className={parts.pageTitle}>{t("가이드::사용 가이드")}</h1>
          {guides.isPending ? (
            loading
          ) : guides.isError ? (
            loadError
          ) : (
            <GuideTopics
              topics={guides.data}
              nav={{ onOpen: (id) => go({ kind: "topic", id }) }}
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
              nav={{ onOpen: (id) => go({ kind: "topic", id }) }}
            />
          )}
        </div>
      )}
    </div>
  );
}
