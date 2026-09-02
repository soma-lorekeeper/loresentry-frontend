"use client";

import { type FormEvent, useId, useRef, useState } from "react";

import { IconButton } from "@/components/ui";
import { WorkspaceIcon } from "@/features/workspace/icons";

import styles from "./ai-chat-panel.module.css";

interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  text: string;
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

export interface AiChatPanelProps {
  documentName: string;
  hidden?: boolean;
}

export function AiChatPanel({ documentName, hidden }: AiChatPanelProps) {
  const headingId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState(initialMessages);
  const [sessionName, setSessionName] = useState("균열 장면 다듬기");

  const startNewSession = () => {
    setDraft("");
    setMessages([]);
    setSessionName("새 채팅");
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const sendMessage = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text) return;

    setMessages((current) => [
      ...current,
      { id: `message-user-${current.length + 1}`, role: "user", text },
    ]);
    if (sessionName === "새 채팅") {
      setSessionName(text.length > 18 ? `${text.slice(0, 18)}…` : text);
    }
    setDraft("");
  };

  return (
    <aside aria-labelledby={headingId} className={styles.panel} hidden={hidden}>
      <header className={styles.header}>
        <button
          aria-label={`채팅 세션 선택: ${sessionName}`}
          className={styles.sessionTrigger}
          type="button"
        >
          <span id={headingId}>{sessionName}</span>
          <WorkspaceIcon name="chevron" />
        </button>
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
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <WorkspaceIcon name="sparkles" />
            <h2>새 대화를 시작하세요</h2>
            <p>현재 원고에 대해 질문하거나 장면을 함께 다듬어 보세요.</p>
          </div>
        ) : (
          <>
            <p className={styles.fileContext}>현재 원고 · {documentName}</p>
            {messages.map((message) =>
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
              messages.length === 0 ? "메시지를 입력하세요" : "메시지 입력"
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
