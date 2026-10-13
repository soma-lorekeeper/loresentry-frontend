"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

import { Button, Icon } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { ProjectShell } from "@/features/projects/project-shell";
import { t } from "@/i18n";

import { findTopic, GUIDE_TOPICS } from "./guide-content";
import { GuideArticle, GuideTopics, guideMeta } from "./guide-parts";
import styles from "./project-guide.module.css";

/** 주제의 주소. 주제마다 주소가 있어 새로고침하거나 남에게 보내도 그 글이 열린다 */
const hrefFor = (id: string) => `/projects/guide?topic=${id}`;

/**
 * 프로젝트 목록의 사용 가이드.
 *
 * <p>주제 목록과 글은 작업공간의 도움말 탭과 **같은 부품**(guide-parts.tsx)으로 그린다. 여기서
 * 다른 것은 둘뿐이다 — 주제가 주소(`?topic=`)를 갖는 링크라는 것, 그리고 처음 안내를 다시 보는
 * 단추가 있다는 것.
 */
export function ProjectGuidePage({ user }: { user: User }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const topic = findTopic(searchParams.get("topic"));

  if (topic) {
    return (
      <ProjectShell
        user={user}
        section="guide"
        title={topic.title}
        description={guideMeta(topic)}
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
        {/* 제목과 메타 줄은 위의 머리가 이미 그렸다. */}
        <GuideArticle
          key={topic.id}
          topic={topic}
          topics={GUIDE_TOPICS}
          nav={{ hrefFor }}
          heading={false}
        />
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
      <GuideTopics topics={GUIDE_TOPICS} nav={{ hrefFor }} />
    </ProjectShell>
  );
}
