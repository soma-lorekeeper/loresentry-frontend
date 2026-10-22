"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Button,
  Icon,
  IconButton,
  Menu,
  type MenuEntry,
} from "@/design-system/primitives";
import type { ChatCitation, ChatMessage, ChatSession } from "@/domain/models";
import { t } from "@/i18n";

import { Answer, answerPlainText, highlight } from "./answer";
import { QuoteCard } from "./composer";
import type { ChatInterruption, ChatStream } from "./use-chat-streams";
import { useElapsed } from "./use-chat-streams";
import { Waiting } from "./waiting";
import styles from "./chat.module.css";

export function RenameInput({
  initial,
  onRename,
  onCancel,
}: {
  initial: string;
  onRename: (title: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => inputRef.current?.select(), []);
  return (
    <input
      ref={inputRef}
      className={styles.renameInput}
      value={value}
      maxLength={200}
      aria-label={t("대화 이름")}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => (value.trim() ? onRename(value.trim()) : onCancel())}
      onKeyDown={(event) => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) {
          event.preventDefault();
          if (value.trim()) onRename(value.trim());
          else onCancel();
        }
        if (event.key === "Escape") {
          event.stopPropagation();
          onCancel();
        }
      }}
    />
  );
}

export function SessionMenu({
  onRename,
  onDelete,
}: {
  onRename: () => void;
  onDelete: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const entries: MenuEntry[] = [
    {
      id: "rename",
      label: t("이름 바꾸기"),
      icon: "pencil",
      onSelect: onRename,
    },
    {
      id: "delete",
      label: t("대화 삭제"),
      icon: "trash-2",
      destructive: true,
      onSelect: onDelete,
    },
  ];
  return (
    <>
      <IconButton
        ref={ref}
        icon="ellipsis"
        label={t("대화 메뉴")}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      />
      <Menu
        anchorRef={ref}
        open={open}
        onOpenChange={setOpen}
        entries={entries}
        label={t("대화 메뉴")}
        placement="bottom-end"
      />
    </>
  );
}

export function DeleteConfirm({
  title,
  busy,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div className={styles.confirmScrim}>
      <div
        className={styles.confirm}
        role="alertdialog"
        aria-labelledby="chat-delete-title"
        aria-describedby="chat-delete-detail"
      >
        <h3 id="chat-delete-title">
          {t("‘{title}’ 대화를 지울까요?", { title })}
        </h3>
        <p id="chat-delete-detail">{t("지운 대화는 되돌릴 수 없어요.")}</p>
        <div className={styles.confirmActions}>
          <Button ref={cancelRef} onClick={onCancel} disabled={busy}>
            {t("취소")}
          </Button>
          <Button variant="primary" onClick={onConfirm} busy={busy}>
            {t("삭제")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CopyAnswer({ message }: { message: ChatMessage }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(id);
  }, [copied]);
  return (
    <div className={styles.answerActions}>
      <IconButton
        icon={copied ? "check" : "copy"}
        iconSize={13}
        label={copied ? t("복사했어요") : t("답변 복사")}
        className={styles.answerAction}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(
              answerPlainText(message.content, message.citations),
            );
            setCopied(true);
          } catch {
            setCopied(false);
          }
        }}
      />
      <span className={styles.srOnly} role="status">
        {copied ? t("답변을 복사했어요") : ""}
      </span>
    </div>
  );
}

function EditQuestion({
  initial,
  onCancel,
  onSend,
}: {
  initial: string;
  onCancel: () => void;
  onSend: (content: string) => void;
}) {
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  }, [value]);
  useEffect(() => {
    const el = ref.current;
    el?.focus();
    el?.setSelectionRange(el.value.length, el.value.length);
  }, []);
  const send = () => value.trim() && onSend(value.trim());
  return (
    <form
      className={styles.editAsk}
      onSubmit={(event) => {
        event.preventDefault();
        send();
      }}
    >
      <textarea
        ref={ref}
        rows={1}
        value={value}
        maxLength={4000}
        aria-label={t("질문 고치기")}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (
            event.key === "Enter" &&
            !event.shiftKey &&
            !event.nativeEvent.isComposing
          ) {
            event.preventDefault();
            send();
          }
          if (event.key === "Escape") {
            event.stopPropagation();
            onCancel();
          }
        }}
      />
      <div className={styles.editActions}>
        <Button onClick={onCancel}>{t("취소")}</Button>
        <Button variant="primary" type="submit" disabled={!value.trim()}>
          {t("보내기")}
        </Button>
      </div>
    </form>
  );
}

export function Conversation({
  session,
  messages,
  loading,
  stream,
  interruption,
  term,
  onOpenCitation,
  onRetry,
  onEditSend,
  empty,
}: {
  session: ChatSession;
  messages: ChatMessage[];
  loading: boolean;
  stream: ChatStream | null;
  interruption: ChatInterruption | null;
  term: string;
  onOpenCitation: (citation: ChatCitation) => void;
  onRetry: () => void;
  onEditSend: (message: ChatMessage, content: string) => void;
  empty: ReactNode;
}) {
  const elapsed = useElapsed(stream?.startedAt ?? null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [pinned, setPinned] = useState(true);
  const [editing, setEditing] = useState<string | null>(null);
  const jumped = useRef(false);
  const hold = useRef(Boolean(term));

  const cut = stream?.replaces
    ? messages.findIndex((m) => m.id === stream.replaces)
    : -1;
  const kept = cut >= 0 ? messages.slice(0, cut) : messages;
  const saved = kept.at(-1);
  const visible =
    stream &&
    !stream.replaces &&
    saved?.role === "user" &&
    saved.content === stream.question.content
      ? kept.slice(0, -1)
      : kept;
  const shown = stream ? [...visible, stream.question] : visible;
  const lastQuestion = !stream
    ? [...visible].reverse().find((m) => m.role === "user")
    : undefined;

  const count = shown.length;
  const seen = useRef(count);
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    if (term && !jumped.current && el.querySelector("mark")) {
      jumped.current = true;
      el.querySelector("mark")?.scrollIntoView({ block: "center" });
      return;
    }
    if (hold.current) return;
    const grew = count !== seen.current;
    seen.current = count;
    if (pinned || grew) el.scrollTop = el.scrollHeight;
  });

  if (loading)
    return (
      <div className={styles.scroll} aria-busy="true">
        <div className={styles.loading}>
          <Icon name="loader-circle" size={16} className={styles.spin} />
        </div>
      </div>
    );

  if (shown.length === 0 && !interruption)
    return <div className={styles.scroll}>{empty}</div>;

  return (
    <div className={styles.scrollWrap}>
      <div
        ref={scrollRef}
        className={styles.scroll}
        onScroll={(event) => {
          hold.current = false;
          const el = event.currentTarget;
          setPinned(el.scrollHeight - el.scrollTop - el.clientHeight < 24);
        }}
      >
        <div className={styles.thread} aria-label={session.title}>
          {shown.map((message) =>
            message.role === "user" ? (
              editing === message.id ? (
                <EditQuestion
                  key={message.id}
                  initial={message.content}
                  onCancel={() => setEditing(null)}
                  onSend={(content) => {
                    setEditing(null);
                    onEditSend(message, content);
                  }}
                />
              ) : (
                <div key={message.id} className={styles.askRow}>
                  {message.id === lastQuestion?.id && (
                    <IconButton
                      icon="pencil"
                      iconSize={13}
                      label={t("질문 고치기")}
                      className={styles.editButton}
                      onClick={() => setEditing(message.id)}
                    />
                  )}
                  <div className={styles.ask}>
                    {message.quote && (
                      <QuoteCard quote={message.quote} compact />
                    )}
                    {message.content && (
                      <p>{highlight(message.content, term)}</p>
                    )}
                  </div>
                </div>
              )
            ) : (
              <div key={message.id} className={styles.reply}>
                <Answer
                  content={message.content}
                  citations={message.citations}
                  onOpen={onOpenCitation}
                  term={term}
                />
                <CopyAnswer message={message} />
              </div>
            ),
          )}
          {stream && !stream.content && (
            <Waiting
              phase={stream.phase}
              activities={stream.activities}
              elapsed={elapsed}
            />
          )}
          {stream?.content && (
            <Answer
              content={stream.content}
              citations={stream.citations}
              onOpen={onOpenCitation}
              streaming
              freshFrom={stream.freshFrom}
              tick={stream.tick}
            />
          )}
          {interruption && !stream && (
            <div className={styles.halted} role="status">
              <Icon
                name={
                  interruption.reason === "stopped"
                    ? "circle-alert"
                    : "cloud-off"
                }
                size={14}
              />
              <span>
                {interruption.reason === "stopped"
                  ? t("응답을 멈췄어요. 끝나지 않은 답은 남기지 않아요.")
                  : t("답을 받지 못했어요. 잠시 후 다시 물어봐 주세요.")}
              </span>
              <Button variant="ghost" icon="rotate-cw" onClick={onRetry}>
                {t("다시 묻기")}
              </Button>
            </div>
          )}
        </div>
      </div>
      {!pinned && (
        <button
          type="button"
          className={styles.jump}
          aria-label={t("맨 아래로")}
          onClick={() => {
            const el = scrollRef.current;
            if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
            setPinned(true);
          }}
        >
          <Icon name="arrow-down" size={14} />
        </button>
      )}
    </div>
  );
}
