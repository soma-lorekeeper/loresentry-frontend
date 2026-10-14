"use client";

import {
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  Button,
  DIALOG_SURFACE_CLASS,
  EmptyState,
  Icon,
  IconButton,
  SearchField,
} from "@/design-system/primitives";
import type {
  ChatAvailability,
  ChatCitation,
  ChatIntent,
  ChatMessage,
  ChatQuote,
  ChatSearchHit,
  ChatSession,
  DocumentNode,
} from "@/domain/models";
import {
  PreparingState,
  isUnavailable,
} from "@/features/common/preparing-state";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";
import { formatNumber, relativeTime } from "@/shared/format";

import { useFileTree } from "../workspace/queries";
import { useWorkspace } from "../workspace/workspace-context";
import { AiMark } from "./ai-mark";
import { highlight } from "./answer";
import { Composer, type Viewing } from "./composer";
import {
  Conversation,
  DeleteConfirm,
  RenameInput,
  SessionMenu,
} from "./conversation";
import {
  useChatAvailability,
  useChatMessages,
  useChatSearch,
  useChatSessions,
  useCreateChatSession,
  useDeleteChatSession,
  useRenameChatSession,
} from "./queries";
import {
  ResizeFrame,
  clampSize,
  readSize,
  saveSize,
  type ChatSize,
} from "./resize-frame";
import { SelectionAsk, quickQuestion, type QuickIntent } from "./selection-ask";
import { selectionTarget, type ChatView } from "./selection-route";
import { useChatStreams, useNow } from "./use-chat-streams";
import styles from "./chat.module.css";

function suggestions() {
  return [
    t("가장 최근 회차에서 무슨 일이 있었어?"),
    t("주요 인물과 연결된 설정을 정리해 줘"),
    t("주인공이 처음 흔들리는 장면은 어디야?"),
  ];
}

function Suggestions({ onPick }: { onPick: (question: string) => void }) {
  return (
    <ul className={styles.suggestions}>
      {suggestions().map((question) => (
        <li key={question}>
          <button type="button" onClick={() => onPick(question)}>
            <Icon name="message-square" size={13} />
            <span>{question}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function SessionRow({
  session,
  busy,
  now,
  line,
  onClick,
}: {
  session: ChatSession;
  busy: boolean;
  now: number;
  line: ReactNode;
  onClick: () => void;
}) {
  return (
    <li>
      <button type="button" className={styles.sessionRow} onClick={onClick}>
        <span className={styles.sessionRowTop}>
          <span className={styles.sessionRowTitle}>{session.title}</span>
          {busy ? (
            <Icon
              name="loader-circle"
              size={12}
              className={styles.spin}
              label={t("답을 쓰는 중")}
            />
          ) : (
            <span className={styles.sessionRowTime}>
              {relativeTime(session.updatedAt, now)}
            </span>
          )}
        </span>
        {line && <span className={styles.sessionRowLine}>{line}</span>}
      </button>
    </li>
  );
}

function snippetLine(hit: ChatSearchHit, query: string) {
  if (!hit.snippet) return highlight(hit.session.preview, query);
  return (
    <>
      {hit.snippet.before}
      <mark className={styles.hit}>{hit.snippet.match}</mark>
      {hit.snippet.after}
    </>
  );
}

function Launcher({
  open,
  busy,
  unread,
  disabled,
  onClick,
  buttonRef,
}: {
  open: boolean;
  busy: boolean;
  unread: boolean;
  disabled: boolean;
  onClick: () => void;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
}) {
  const label = disabled
    ? t("AI 챗을 열 수 없어요")
    : open
      ? t("AI 챗 접기")
      : busy
        ? t("AI 챗 열기, 답을 쓰는 중")
        : unread
          ? t("AI 챗 열기, 새 답변")
          : t("AI 챗 열기");
  return (
    <button
      ref={buttonRef}
      type="button"
      className={styles.launcher}
      data-open={open || undefined}
      data-busy={(busy && !open) || undefined}
      data-disabled={disabled || undefined}
      aria-disabled={disabled || undefined}
      aria-label={label}
      aria-expanded={open}
      title={label}
      data-tour="ai-chat"
      onClick={onClick}
    >
      <span className={styles.launcherIcon} data-show={!open || undefined}>
        <AiMark solid size={26} />
      </span>
      <span className={styles.launcherIcon} data-show={open || undefined}>
        <Icon name="chevron-down" size={22} />
      </span>
      {unread && !open && <span className={styles.unread} aria-hidden />}
    </button>
  );
}

function TooLarge({
  availability,
  onClose,
}: {
  availability: ChatAvailability;
  onClose: () => void;
}) {
  return (
    <div className={styles.tooLarge} role="status">
      <div className={styles.tooLargeHead}>
        <Icon name="book-open" size={15} />
        <h2>{t("작품이 커서 AI 챗을 열 수 없어요")}</h2>
        <IconButton
          icon="x"
          iconSize={13}
          label={t("닫기")}
          onClick={onClose}
        />
      </div>
      <p>
        {t(
          "AI 챗은 원고·설정·메모를 한 번에 모두 읽고 답해요. 지금 작품은 약 {size}자로, 한 번에 읽을 수 있는 {limit}자를 넘었어요.",
          {
            size: formatNumber(availability.size),
            limit: formatNumber(availability.limit),
          },
        )}
      </p>
    </div>
  );
}

export function ChatDock() {
  const { projectId, user, activeFileId, open, narrow } = useWorkspace();
  const tree = useFileTree(projectId);
  const availability = useChatAvailability(projectId);
  const unavailable = isUnavailable(availability.error);
  const tooLarge = availability.data?.status === "too-large";
  const ready = availability.data?.status === "available";
  const sessions = useChatSessions(projectId, ready);
  const streams = useChatStreams(projectId);
  const createSession = useCreateChatSession(projectId);
  const renameSession = useRenameChatSession(projectId);
  const deleteSession = useDeleteChatSession(projectId);
  const now = useNow(30000);

  const [windowOpen, setWindowOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [view, setView] = useState<ChatView>({ kind: "home" });
  const [draft, setDraft] = useState("");
  const [quote, setQuote] = useState<ChatQuote | null>(null);
  const [viewingOn, setViewingOn] = useState(true);
  const [seenAt, setSeenAt] = useState(0);
  const [renaming, setRenaming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [query, setQuery] = useState("");
  const [term, setTerm] = useState("");
  const [size, setSize] = useState<ChatSize>(readSize);
  const frameRef = useRef<HTMLElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const needle = query.trim();
  const search = useChatSearch(projectId, needle);
  const sessionId = view.kind === "session" ? view.id : null;
  const messages = useChatMessages(sessionId);
  const session =
    sessions.data?.find((candidate) => candidate.id === sessionId) ?? null;
  const stream = sessionId ? (streams.streams[sessionId] ?? null) : null;
  const interruption = sessionId
    ? (streams.interrupted[sessionId] ?? null)
    : null;

  const docs = useMemo(
    () =>
      (tree.data ?? []).filter(
        (node): node is DocumentNode =>
          node.kind === "document" && node.trashedAt === null,
      ),
    [tree.data],
  );
  const viewingDoc = docs.find((doc) => doc.id === activeFileId);
  const viewing: Viewing | null = viewingDoc
    ? { title: viewingDoc.title, docType: viewingDoc.docType }
    : null;
  const focusFileId = viewingOn ? (viewingDoc?.id ?? null) : null;

  const unread = !windowOpen && streams.completedAt > seenAt;
  const recent = (sessions.data ?? []).filter(
    (candidate) =>
      candidate.preview !== "" ||
      streams.streams[candidate.id] ||
      streams.interrupted[candidate.id],
  );

  const goTo = (next: ChatView) => {
    setView(next);
    setRenaming(false);
    setDeleting(false);
    if (next.kind === "home") setTerm("");
  };

  const openWindow = () => {
    setWindowOpen(true);
    setNotice(false);
    setSeenAt(Date.now());
  };

  const closeWindow = () => {
    setWindowOpen(false);
    setSeenAt(Date.now());
    launcherRef.current?.focus();
  };

  const focusInput = () =>
    window.requestAnimationFrame(() => inputRef.current?.focus());

  const newSession = async () => {
    const created = await createSession.mutateAsync();
    goTo({ kind: "session", id: created.id });
    return created.id;
  };

  const sendTo = (
    id: string,
    content: string,
    intent: ChatIntent,
    withQuote: ChatQuote | null,
  ) => {
    setTerm("");
    streams.send(id, {
      content,
      intent,
      quote: withQuote,
      focusFileId,
      replaces: null,
    });
  };

  const submit = async () => {
    const content = draft.trim();
    const attached = quote;
    setDraft("");
    setQuote(null);
    const id = sessionId ?? (await newSession());
    sendTo(id, content, "ask", attached);
  };

  const attach = async (picked: ChatQuote) => {
    const target = selectionTarget(windowOpen, view);
    openWindow();
    if (!target) await newSession();
    setQuote(picked);
    focusInput();
  };

  const askAbout = async (picked: ChatQuote, intent: QuickIntent) => {
    const target = selectionTarget(windowOpen, view);
    openWindow();
    if (target && streams.streams[target]) {
      setQuote(picked);
      setDraft(quickQuestion(intent));
      focusInput();
      return;
    }
    const id = target ?? (await newSession());
    sendTo(id, quickQuestion(intent), intent, picked);
  };

  const openCitation = (citation: ChatCitation) => {
    if (citation.kind === "document")
      open({ kind: "file", fileId: citation.fileId });
    else open({ kind: "memo" });
    if (narrow) setWindowOpen(false);
  };

  const editSend = (message: ChatMessage, content: string) => {
    if (!sessionId) return;
    streams.send(sessionId, {
      content,
      intent: message.intent ?? "ask",
      quote: message.quote,
      focusFileId,
      replaces: message.id,
    });
  };

  const resize = (next: ChatSize, commit: boolean) => {
    const clamped = clampSize(next);
    frameRef.current?.style.setProperty("--chat-w", `${clamped.width}px`);
    frameRef.current?.style.setProperty("--chat-h", `${clamped.height}px`);
    if (commit) {
      setSize(clamped);
      saveSize(clamped);
    }
  };

  const composer = (
    <Composer
      ref={inputRef}
      value={draft}
      onChange={setDraft}
      onSubmit={() => void submit()}
      pending={stream !== null}
      onStop={() => sessionId && streams.stop(sessionId)}
      quote={quote}
      onRemoveQuote={() => setQuote(null)}
      viewing={viewing}
      viewingOn={viewingOn}
      onToggleViewing={() => setViewingOn((v) => !v)}
      placeholder={
        sessionId ? t("작품에 대해 물어보세요") : t("새 대화를 시작해 보세요")
      }
    />
  );

  const closeButton = (
    <IconButton icon="chevron-down" label={t("접기")} onClick={closeWindow} />
  );

  const brandHeader = (
    <header className={styles.header}>
      <span className={styles.homeBrand}>
        <AiMark size={17} />
        {t("AI 챗")}
      </span>
      <span className={styles.headerSpacer} />
      {closeButton}
    </header>
  );

  const pick = async (question: string) => {
    const id = sessionId ?? (await newSession());
    sendTo(id, question, "ask", null);
  };

  const greeting = (
    <h2 className={styles.greeting}>
      {t("{name} 님, 무엇이 궁금하세요?", { name: user.displayName })}
    </h2>
  );

  const home = (
    <>
      {brandHeader}
      <div className={styles.scroll}>
        <div className={styles.home}>
          {greeting}
          <div className={styles.homeComposer}>{composer}</div>
          <section className={styles.homeSection} aria-label={t("대화")}>
            <h3>{t("대화")}</h3>
            <SearchField
              value={query}
              label={t("대화 검색")}
              clearLabel={t("검색어 지우기")}
              className={styles.search}
              busy={search.isFetching}
              busyLabel={t("찾는 중")}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery("")}
              onKeyDown={(event) => {
                const first = search.data?.[0];
                if (event.key === "Enter" && first) {
                  goTo({ kind: "session", id: first.session.id });
                  setTerm(needle);
                }
                if (event.key === "Escape" && query) {
                  event.stopPropagation();
                  setQuery("");
                }
              }}
            />
            {needle ? (
              search.data && search.data.length > 0 ? (
                <>
                  <p className={styles.resultCount} role="status">
                    {t("대화 {count}개", { count: search.data.length })}
                  </p>
                  <ul className={styles.sessionList}>
                    {search.data.map((hit) => (
                      <SessionRow
                        key={hit.session.id}
                        session={hit.session}
                        busy={Boolean(streams.streams[hit.session.id])}
                        now={now}
                        line={snippetLine(hit, needle)}
                        onClick={() => {
                          goTo({ kind: "session", id: hit.session.id });
                          setTerm(needle);
                        }}
                      />
                    ))}
                  </ul>
                </>
              ) : (
                search.isSuccess && (
                  <p className={styles.noResult} role="status">
                    {t("‘{query}’와 맞는 대화가 없어요", { query: needle })}
                  </p>
                )
              )
            ) : recent.length > 0 ? (
              <ul className={styles.sessionList}>
                {recent.map((candidate) => (
                  <SessionRow
                    key={candidate.id}
                    session={candidate}
                    busy={Boolean(streams.streams[candidate.id])}
                    now={now}
                    line={candidate.preview}
                    onClick={() => goTo({ kind: "session", id: candidate.id })}
                  />
                ))}
              </ul>
            ) : (
              <p className={styles.noResult}>{t("아직 나눈 대화가 없어요")}</p>
            )}
          </section>
          {!needle && (
            <section className={styles.homeSection}>
              <h3>{t("이렇게 물어보세요")}</h3>
              <Suggestions onPick={(question) => void pick(question)} />
            </section>
          )}
        </div>
      </div>
    </>
  );

  const conversation = sessionId && (
    <>
      <header className={styles.header}>
        <IconButton
          icon="arrow-left"
          label={t("대화 목록")}
          onClick={() => goTo({ kind: "home" })}
        />
        {renaming && session ? (
          <RenameInput
            key={session.id}
            initial={session.title}
            onRename={(title) => {
              renameSession.mutate({ sessionId: session.id, title });
              setRenaming(false);
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className={styles.headerTitle}>{session?.title ?? ""}</span>
        )}
        <span className={styles.headerSpacer} />
        {session && (
          <SessionMenu
            onRename={() => setRenaming(true)}
            onDelete={() => setDeleting(true)}
          />
        )}
        {closeButton}
      </header>
      {session ? (
        <Conversation
          key={`${session.id}:${term}`}
          session={session}
          messages={messages.data ?? []}
          loading={messages.isPending}
          stream={stream}
          interruption={interruption}
          term={term}
          onOpenCitation={openCitation}
          onRetry={() => streams.retry(session.id, messages.data ?? [])}
          onEditSend={editSend}
          empty={
            <div className={styles.empty}>
              {greeting}
              <Suggestions onPick={(question) => void pick(question)} />
            </div>
          }
        />
      ) : (
        <div className={styles.scroll} aria-busy="true" />
      )}
      {composer}
    </>
  );

  let body: ReactNode;
  if (unavailable)
    body = (
      <>
        {brandHeader}
        <div className={styles.scroll}>
          <PreparingState what={t("AI 챗")} className={styles.preparing} />
        </div>
      </>
    );
  else if (availability.isError)
    body = (
      <>
        {brandHeader}
        <div className={styles.scroll}>
          <EmptyState
            role="alert"
            icon="cloud-off"
            title={t("AI 챗을 불러오지 못했어요")}
            description={t("잠시 후 다시 시도해 주세요.")}
            className={styles.preparing}
            action={
              <Button
                icon="rotate-cw"
                busy={availability.isFetching}
                onClick={() => void availability.refetch()}
              >
                {t("다시 시도")}
              </Button>
            }
          />
        </div>
      </>
    );
  else if (availability.isPending)
    body = (
      <>
        {brandHeader}
        <div className={styles.scroll} aria-busy="true">
          <div className={styles.loading}>
            <Icon name="loader-circle" size={16} className={styles.spin} />
          </div>
        </div>
      </>
    );
  else if (view.kind === "session") body = conversation;
  else body = home;

  return (
    <>
      {windowOpen && !tooLarge && (
        <section
          ref={frameRef}
          className={styles.window}
          data-narrow={narrow || undefined}
          style={
            {
              "--chat-w": `${size.width}px`,
              "--chat-h": `${size.height}px`,
            } as CSSProperties
          }
          role="dialog"
          aria-modal="false"
          aria-label={t("AI 챗")}
          onKeyDown={(event) => {
            if (
              event.key === "Escape" &&
              event.currentTarget.contains(event.target as Node)
            )
              closeWindow();
          }}
        >
          <div className={cx(styles.surface, DIALOG_SURFACE_CLASS)}>
            {body}
            {deleting && session && (
              <DeleteConfirm
                title={session.title}
                busy={deleteSession.isPending}
                onCancel={() => setDeleting(false)}
                onConfirm={() => {
                  streams.forget(session.id);
                  deleteSession.mutate(session.id, {
                    onSuccess: () => goTo({ kind: "home" }),
                  });
                }}
              />
            )}
          </div>
          {!narrow && <ResizeFrame size={size} onResize={resize} />}
        </section>
      )}
      {notice && tooLarge && availability.data && (
        <TooLarge
          availability={availability.data}
          onClose={() => {
            setNotice(false);
            launcherRef.current?.focus();
          }}
        />
      )}
      <Launcher
        open={windowOpen && !tooLarge}
        busy={streams.busy}
        unread={unread}
        disabled={tooLarge}
        buttonRef={launcherRef}
        onClick={() => {
          if (tooLarge) setNotice((v) => !v);
          else if (windowOpen) closeWindow();
          else openWindow();
        }}
      />
      {ready && <SelectionAsk onAttach={attach} onAsk={askAbout} />}
    </>
  );
}
