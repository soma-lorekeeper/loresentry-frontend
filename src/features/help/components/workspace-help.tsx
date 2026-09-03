"use client";

import { type KeyboardEvent, useRef, useState } from "react";

import { Button, StatusNotice } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import type { HelpScenario } from "../help-states";
import styles from "./workspace-help.module.css";

interface GuideTopic {
  description: string;
  id: string;
  keywords: string;
  title: string;
}

const guideTopics: GuideTopic[] = [
  {
    id: "workspace-start",
    title: "작업공간 시작하기",
    description: "프로젝트, 사이드바와 탭의 기본 사용법",
    keywords: "프로젝트 사이드바 탭 시작",
  },
  {
    id: "files-properties",
    title: "파일과 속성 문서",
    description: "파일을 만들고 정보를 구조화하는 방법",
    keywords: "파일 폴더 속성",
  },
  {
    id: "manuscript",
    title: "원고 작성",
    description: "원고 편집, 저장 상태와 버전 관리",
    keywords: "원고 편집 저장 버전",
  },
  {
    id: "search-graph",
    title: "검색과 그래프",
    description: "필요한 기록과 연결 관계를 찾는 방법",
    keywords: "검색 그래프 연결",
  },
  {
    id: "memo-timeline",
    title: "메모와 시간 흐름",
    description: "아이디어와 사건 순서를 함께 관리하기",
    keywords: "메모 시간 흐름 사건",
  },
  {
    id: "trash-restore",
    title: "휴지통과 복원",
    description: "삭제한 파일과 프로젝트를 안전하게 관리하기",
    keywords: "삭제 휴지통 복원",
  },
];

export interface WorkspaceHelpProps {
  copyFeedbackLink?: (url: string) => Promise<void>;
  feedbackUrl?: string;
  hidden?: boolean;
  initialScenario?: HelpScenario;
  loadGuideArticle?: (topicId: string) => Promise<void>;
  openExternal?: (url: string) => Window | null;
}

type HelpView = "article" | "home" | "topics";

export function WorkspaceHelp({
  copyFeedbackLink,
  feedbackUrl,
  hidden,
  initialScenario,
  loadGuideArticle,
  openExternal,
}: WorkspaceHelpProps) {
  const initialMode = initialScenario?.mode ?? "default";
  const [view, setView] = useState<HelpView>(
    initialMode === "article" || initialMode === "load-error"
      ? "article"
      : initialMode === "topics" || initialMode === "search-empty"
        ? "topics"
        : "home",
  );
  const [query, setQuery] = useState(initialScenario?.query ?? "");
  const [selectedTopicId, setSelectedTopicId] = useState(
    initialScenario?.selectedTopicId,
  );
  const [guideError, setGuideError] = useState(initialMode === "load-error");
  const [feedbackStatus, setFeedbackStatus] = useState<
    "error" | "idle" | "opened"
  >(
    initialMode === "feedback-error"
      ? "error"
      : initialMode === "feedback-opened"
        ? "opened"
        : "idle",
  );
  const topicRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const feedbackRef = useRef<HTMLButtonElement>(null);
  const selectedTopic =
    guideTopics.find((topic) => topic.id === selectedTopicId) ?? guideTopics[0];
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  const filteredTopics = guideTopics.filter((topic) =>
    `${topic.title} ${topic.description} ${topic.keywords}`
      .toLocaleLowerCase("ko")
      .includes(normalizedQuery),
  );

  const openTopic = (topic: GuideTopic) => {
    setSelectedTopicId(topic.id);
    setGuideError(false);
    setView("article");
  };

  const handleTopicKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let target = index;
    if (event.key === "ArrowDown") target = (index + 1) % filteredTopics.length;
    else if (event.key === "ArrowUp")
      target = (index - 1 + filteredTopics.length) % filteredTopics.length;
    else if (event.key === "Home") target = 0;
    else if (event.key === "End") target = filteredTopics.length - 1;
    else return;
    event.preventDefault();
    topicRefs.current[target]?.focus();
  };

  const openFeedback = () => {
    const opened = feedbackUrl
      ? openExternal
        ? openExternal(feedbackUrl)
        : window.open(feedbackUrl, "_blank", "noopener,noreferrer")
      : null;
    setFeedbackStatus(opened ? "opened" : "error");
    requestAnimationFrame(() => feedbackRef.current?.focus());
  };

  const retryArticle = async () => {
    if (!loadGuideArticle) return;
    try {
      await loadGuideArticle(selectedTopic.id);
      setGuideError(false);
    } catch {
      setGuideError(true);
    }
  };

  return (
    <section
      aria-label="도움말"
      className={styles.panel}
      data-help-view={view}
      hidden={hidden}
      id="panel-help"
      role="tabpanel"
      tabIndex={-1}
    >
      {view === "home" && (
        <div className={styles.content}>
          <header className={styles.header}>
            <span className={styles.eyebrow}>Workspace</span>
            <h1>도움말</h1>
            <p>Lorekeeper 사용 방법을 확인하거나 의견을 보내세요.</p>
          </header>
          <div className={styles.cards}>
            <button
              className={styles.card}
              onClick={() => setView("topics")}
              type="button"
            >
              <span className={styles.cardIcon}>
                <WorkspaceIcon name="book" />
              </span>
              <span className={styles.cardText}>
                <strong>사용 가이드</strong>
                <p>작업공간과 파일 편집 방법을 단계별로 확인합니다.</p>
                <span className={styles.direction}>
                  가이드 보기 <WorkspaceIcon name="chevron-right" />
                </span>
              </span>
            </button>
            <button
              aria-label="피드백 보내기, 새 탭에서 열림"
              className={styles.card}
              onClick={openFeedback}
              ref={feedbackRef}
              type="button"
            >
              <span className={styles.cardIcon}>
                <WorkspaceIcon name="message-square" />
              </span>
              <span className={styles.cardText}>
                <strong>피드백 보내기</strong>
                <p>문제와 개선 의견을 외부 피드백 폼으로 전달합니다.</p>
                <span className={styles.direction}>
                  새 탭에서 열림 <WorkspaceIcon name="external-link" />
                </span>
              </span>
            </button>
          </div>
          {feedbackStatus === "opened" && (
            <StatusNotice className={styles.status} variant="success">
              피드백 페이지를 새 탭에서 열었습니다.
            </StatusNotice>
          )}
          {feedbackStatus === "error" && (
            <StatusNotice className={styles.status} variant="error">
              <span>피드백 페이지를 열지 못했습니다.</span>
              <span className={styles.errorActions}>
                <Button onClick={openFeedback}>다시 열기</Button>
                <Button
                  disabled={!feedbackUrl || !copyFeedbackLink}
                  onClick={() => {
                    if (feedbackUrl) void copyFeedbackLink?.(feedbackUrl);
                  }}
                >
                  링크 복사
                </Button>
              </span>
            </StatusNotice>
          )}
        </div>
      )}

      {view === "topics" && (
        <div className={styles.content}>
          <button
            className={styles.back}
            onClick={() => setView("home")}
            type="button"
          >
            <WorkspaceIcon name="chevron-left" /> 도움말로 돌아가기
          </button>
          <header className={styles.header}>
            <span className={styles.eyebrow}>도움말</span>
            <h1>사용 가이드</h1>
            <p>궁금한 기능을 검색하거나 주제를 선택하세요.</p>
          </header>
          <label className={styles.search}>
            <span className={styles.srOnly}>가이드 검색</span>
            <WorkspaceIcon name="search" />
            <input
              onChange={(event) => setQuery(event.target.value)}
              placeholder="가이드 검색"
              type="search"
              value={query}
            />
          </label>
          {filteredTopics.length ? (
            <div aria-label="가이드 주제" className={styles.topics}>
              {filteredTopics.map((topic, index) => (
                <button
                  className={styles.topic}
                  key={topic.id}
                  onClick={() => openTopic(topic)}
                  onKeyDown={(event) => handleTopicKeyDown(event, index)}
                  ref={(node) => {
                    topicRefs.current[index] = node;
                  }}
                  type="button"
                >
                  <WorkspaceIcon name="book" />
                  <span className={styles.topicText}>
                    <strong>{topic.title}</strong>
                    <p>{topic.description}</p>
                  </span>
                  <WorkspaceIcon name="chevron-right" />
                </button>
              ))}
            </div>
          ) : (
            <div className={styles.empty} role="status">
              <h2>일치하는 가이드가 없습니다</h2>
              <p>다른 검색어를 입력하거나 전체 주제를 확인해 보세요.</p>
              <div className={styles.errorActions}>
                <Button onClick={() => setQuery("")}>검색 지우기</Button>
              </div>
            </div>
          )}
        </div>
      )}

      {view === "article" && (
        <div className={styles.articleLayout}>
          <nav aria-label="이 문서의 목차" className={styles.toc}>
            <strong>이 문서에서</strong>
            <a href="#guide-overview">작업공간 둘러보기</a>
            <a href="#guide-tabs">탭으로 이동하기</a>
            <a href="#guide-next">다음 단계</a>
          </nav>
          <div className={styles.articleMain}>
            <button
              className={styles.back}
              onClick={() => setView("topics")}
              type="button"
            >
              <WorkspaceIcon name="chevron-left" /> 가이드 목록으로
            </button>
            {guideError ? (
              <div className={styles.empty} role="alert">
                <h1>{selectedTopic.title}</h1>
                <h2>가이드를 불러오지 못했습니다</h2>
                <p>
                  선택한 주제는 유지했습니다. 연결을 확인하고 다시 시도해
                  주세요.
                </p>
                <div className={styles.errorActions}>
                  <Button
                    icon={<WorkspaceIcon name="rotate-cw" />}
                    onClick={() => void retryArticle()}
                  >
                    다시 시도
                  </Button>
                </div>
              </div>
            ) : (
              <article className={styles.article}>
                <span className={styles.eyebrow}>사용 가이드</span>
                <h1>{selectedTopic.title}</h1>
                <p>
                  프로젝트를 열면 원고와 설정을 한곳에서 관리하는 작업공간이
                  나타납니다. 화면의 세 영역을 익히면 기록을 빠르게 오갈 수
                  있습니다.
                </p>
                <h2 id="guide-overview">작업공간 둘러보기</h2>
                <p>
                  왼쪽 사이드바에서는 프로젝트를 전환하고 파일, 검색, 메모와
                  관리 기능을 엽니다. 가운데 영역은 현재 탭의 내용을 보여 주며
                  오른쪽에는 필요할 때 AI 대화나 메모 패널을 열 수 있습니다.
                </p>
                <ul>
                  <li>사이드바에서 파일과 프로젝트 기능을 찾습니다.</li>
                  <li>탭 바에서 열린 문서의 순서와 현재 위치를 확인합니다.</li>
                  <li>상태 문구로 저장 여부를 확인합니다.</li>
                </ul>
                <h2 id="guide-tabs">탭으로 이동하기</h2>
                <p>
                  사이드바 항목을 선택하면 이미 열린 탭으로 이동하거나 새 탭을
                  엽니다. 좌우 방향키로 탭을 이동하고 Delete 키로 현재 탭을 닫을
                  수 있습니다.
                </p>
                <h2 id="guide-next">다음 단계</h2>
                <ol>
                  <li>원고 파일을 열어 제목과 본문을 작성합니다.</li>
                  <li>설정 파일에서 인물과 장소의 속성을 정리합니다.</li>
                  <li>검색과 그래프로 기록 사이의 연결을 확인합니다.</li>
                </ol>
              </article>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
