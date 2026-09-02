"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { IconButton, Menu, MenuItem } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./ai-chat-panel.module.css";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
}

interface ChatSession {
  id: string;
  isDraft?: boolean;
  messages: ChatMessage[];
  name: string;
}

const initialMessages: ChatMessage[] = [
  {
    id: "message-user-1",
    role: "user",
    text: "문이 열리기 직전 장면의 긴장감을 더 높일 방법을 알려줘.",
  },
  {
    id: "message-assistant-1",
    role: "assistant",
    text: "문을 열기 전에 세 가지 감각을 짧게 쌓아 보세요. 손잡이의 진동, 등불이 흔들리는 소리, 그리고 문 너머의 목소리를 한 문장씩 좁혀 가면 독자가 서윤의 망설임을 함께 느낄 수 있습니다.",
  },
];

const initialSessions: ChatSession[] = [
  {
    id: "session-scene-tension",
    messages: initialMessages,
    name: "균열 장면 다듬기",
  },
  {
    id: "session-north-door",
    messages: [],
    name: "북쪽 문 복선 정리",
  },
  {
    id: "session-tone-review",
    messages: [],
    name: "12화 문장 톤 검토",
  },
];

export interface AiChatPanelProps {
  documentName: string;
  hidden?: boolean;
}

export function AiChatPanel({ documentName, hidden }: AiChatPanelProps) {
  const headingId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionCounterRef = useRef(0);
  const [draft, setDraft] = useState("");
  const [sessions, setSessions] = useState(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState(initialSessions[0].id);
  const activeSession =
    sessions.find((session) => session.id === activeSessionId) ?? sessions[0];

  const startNewSession = () => {
    sessionCounterRef.current += 1;
    const session: ChatSession = {
      id: `session-new-${sessionCounterRef.current}`,
      isDraft: true,
      messages: [],
      name: "새 채팅",
    };
    setDraft("");
    setSessions((current) => [session, ...current]);
    setActiveSessionId(session.id);
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setSessions((current) =>
      current.map((session) =>
        session.id === activeSession.id
          ? {
              ...session,
              isDraft: false,
              messages: [
                ...session.messages,
                {
                  id: `message-user-${session.messages.length + 1}`,
                  role: "user" as const,
                  text,
                },
              ],
              name: session.isDraft
                ? text.length > 18
                  ? `${text.slice(0, 18)}…`
                  : text
                : session.name,
            }
          : session,
      ),
    );
    setDraft("");
  };

  return (
    <aside aria-labelledby={headingId} className={styles.panel} hidden={hidden}>
      <header className={styles.header}>
        <Menu
          buttonContent={
            <>
              <span id={headingId}>{activeSession.name}</span>
              <WorkspaceIcon name="chevron" />
            </>
          }
          buttonLabel={`채팅 세션 선택: ${activeSession.name}`}
          className={styles.sessionPicker}
          placement="start"
          triggerClassName={styles.sessionTrigger}
        >
          {sessions.map((session) => (
            <MenuItem
              key={session.id}
              onClick={() => {
                setActiveSessionId(session.id);
                setDraft("");
              }}
              selected={session.id === activeSession.id}
            >
              <WorkspaceIcon name="message-square" />
              <span>{session.name}</span>
            </MenuItem>
          ))}
        </Menu>
        <span className={styles.headerSpacer} />
        <IconButton
          aria-label="새 채팅 시작"
          className={styles.headerAction}
          onClick={startNewSession}
        >
          <WorkspaceIcon name="plus" />
        </IconButton>
        <IconButton
          aria-label="현재 채팅 세션 메뉴"
          className={styles.headerAction}
        >
          <WorkspaceIcon name="ellipsis" />
        </IconButton>
      </header>

      <div aria-label="대화 내역" className={styles.history} role="log">
        {activeSession.isDraft ? (
          <div className={styles.emptyState}>
            <WorkspaceIcon name="sparkles" />
            <h2>새 대화를 시작하세요</h2>
            <p>현재 원고에 대해 질문하거나 장면을 함께 다듬어 보세요.</p>
          </div>
        ) : (
          <>
            <p className={styles.fileContext}>현재 원고 · {documentName}</p>
            {activeSession.messages.map((message) =>
              message.role === "user" ? (
                <div className={styles.userMessageRow} key={message.id}>
                  <p className={styles.userMessage}>{message.text}</p>
                </div>
              ) : (
                <article className={styles.assistantMessage} key={message.id}>
                  <header>
                    <WorkspaceIcon name="sparkles" />
                    <strong>Lorekeeper AI</strong>
                  </header>
                  <p>{message.text}</p>
                </article>
              ),
            )}
          </>
        )}
      </div>

      <form
        aria-label="AI 챗 메시지 작성"
        className={styles.composerArea}
        onSubmit={sendMessage}
      >
        <div className={styles.composer}>
          <label className={styles.srOnly} htmlFor="ai-chat-message">
            메시지 입력
          </label>
          <textarea
            id="ai-chat-message"
            onChange={(event) => setDraft(event.target.value)}
            placeholder={
              activeSession.isDraft ? "메시지를 입력하세요" : "메시지 입력"
            }
            ref={inputRef}
            rows={2}
            value={draft}
          />
          <button
            aria-label="메시지 전송"
            className={styles.sendButton}
            disabled={!draft.trim()}
            type="submit"
          >
            <WorkspaceIcon name="arrow-up" />
          </button>
        </div>
      </form>
    </aside>
  );
}
