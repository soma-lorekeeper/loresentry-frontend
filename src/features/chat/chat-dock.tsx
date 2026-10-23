"use client";

import {
  useEffect,
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
  InlineNotice,
  SearchField,
  useToast,
} from "@/design-system/primitives";
import type {
  ChatAvailability,
  ChatCitation,
  ChatIntent,
  ChatMessage,
  ChatQuote,
  ChatSearchHit,
  ChatSession,
} from "@/domain/models";
import {
  PreparingState,
  isUnavailable,
} from "@/features/common/preparing-state";
import { QueryFailure } from "@/features/common/query-failure";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";
import { formatNumber, relativeTime } from "@/shared/format";

import { useWorkspace } from "../workspace/workspace-context";
import { AiMark } from "./ai-mark";
import { highlight } from "./answer";
import { Composer } from "./composer";
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
  useChatUsage,
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
import {
  UsageMeter,
  UsageNotice,
  UsageRest,
  usageLevel,
  useUsageNotice,
} from "./usage";
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
  resting,
  onClick,
  buttonRef,
}: {
  open: boolean;
  busy: boolean;
  unread: boolean;
  disabled: boolean;
  resting: boolean;
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
          : resting
            ? t("AI 챗 열기, 오늘 사용량을 다 썼어요")
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
      {resting && !unread && !open && (
        <span className={styles.resting} aria-hidden>
          <Icon name="moon" size={11} />
        </span>
      )}
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
  const { projectId, user, open, narrow } = useWorkspace();
  const availability = useChatAvailability(projectId);
  const unavailable = isUnavailable(availability.error);
  const tooLarge = availability.data?.status === "too-large";
  const ready = availability.data?.status === "available";
  const sessions = useChatSessions(projectId, ready);
  const usage = useChatUsage(ready);
  const level = usageLevel(usage.data);
  const resting = level === "full";
  const usageNotice = useUsageNotice(usage.data);
  const toast = useToast();
  const lastLevel = useRef(level);
  const streams = useChatStreams(projectId);
  const createSession = useCreateChatSession(projectId);
  const creating = useRef<Promise<string | null> | null>(null);
  const submitting = useRef(false);
  const renameSession = useRenameChatSession(projectId);
  const deleteSession = useDeleteChatSession(projectId);
  const now = useNow(30000);

  const [windowOpen, setWindowOpen] = useState(false);
  const [notice, setNotice] = useState(false);
  const [view, setView] = useState<ChatView>({ kind: "home" });
  const [draft, setDraft] = useState("");
  const [quote, setQuote] = useState<ChatQuote | null>(null);
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

  useEffect(() => {
    const before = lastLevel.current;
    lastLevel.current = level;
    if (level === "full" && (before === "ok" || before === "high"))
      toast({
        icon: "moon",
        title: t("오늘 AI 챗 사용량을 다 썼어요"),
        description: t("자정에 0%로 비워져요. 지난 대화는 계속 볼 수 있어요."),
        durationMs: 6000,
      });
  }, [level, toast]);

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

  const newSession = (): Promise<string | null> => {
    if (!creating.current) {
      creating.current = createSession
        .mutateAsync()
        .then(
          (created) => {
            goTo({ kind: "session", id: created.id });
            return created.id;
          },
          () => null,
        )
        .finally(() => {
          creating.current = null;
        });
    }
    return creating.current;
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
      replaces: null,
    });
  };

  const submit = async () => {
    if (submitting.current || streams.busy) return;
    submitting.current = true;
    const content = draft.trim();
    const attached = quote;
    try {
      const id = sessionId ?? (await newSession());
      if (!id) return;
      setDraft("");
      setQuote(null);
      sendTo(id, content, "ask", attached);
    } finally {
      submitting.current = false;
    }
  };

  const attach = async (picked: ChatQuote) => {
    const target = selectionTarget(windowOpen, view);
    openWindow();
    setQuote(picked);
    if (!target) await newSession();
    focusInput();
  };

  const askAbout = async (picked: ChatQuote, intent: QuickIntent) => {
    const target = selectionTarget(windowOpen, view);
    openWindow();
    setQuote(picked);
    setDraft(quickQuestion(intent));
    if (streams.busy) {
      if (!target) await newSession();
      setQuote(picked);
      setDraft(quickQuestion(intent));
      focusInput();
      return;
    }
    const id = target ?? (await newSession());
    if (!id) return;
    setQuote(null);
    setDraft("");
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
      creating={createSession.isPending}
      onStop={() => sessionId && streams.stop(sessionId)}
      quote={quote}
      onRemoveQuote={() => setQuote(null)}
      placeholder={
        sessionId ? t("작품에 대해 물어보세요") : t("새 대화를 시작해 보세요")
      }
      elsewhere={streams.busy && stream === null}
      notice={
        createSession.isError ? (
          <InlineNotice icon="circle-alert">
            {t("대화를 만들지 못했어요. 질문은 유지됩니다.")}
            <Button
              disabled={createSession.isPending}
              onClick={() => void submit()}
            >
              {t("다시 시도")}
            </Button>
          </InlineNotice>
        ) : usage.data && usageNotice.shown ? (
          <UsageNotice usage={usage.data} onDismiss={usageNotice.dismiss} />
        ) : null
      }
    />
  );

  const ask =
    resting && usage.data ? (
      <div className={styles.restArea}>
        <UsageRest usage={usage.data} now={now} />
      </div>
    ) : (
      composer
    );

  const meter = usage.data && level !== "off" && (
    <UsageMeter usage={usage.data} level={level} />
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
      {meter}
      {closeButton}
    </header>
  );

  const pick = async (question: string) => {
    setDraft(question);
    if (streams.busy) {
      setDraft(question);
      focusInput();
      return;
    }
    const id = sessionId ?? (await newSession());
    if (!id) return;
    setDraft("");
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
          <div className={styles.homeComposer}>{ask}</div>
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
                const first = search.isSuccess ? search.data?.[0] : undefined;
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
              search.isError ? (
                <QueryFailure
                  compact
                  title={t("대화 검색을 마치지 못했어요")}
                  retrying={search.isFetching}
                  onRetry={() => void search.refetch()}
                />
              ) : search.data && search.data.length > 0 ? (
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
            ) : sessions.isError ? (
              <QueryFailure
                compact
                title={t("대화 목록을 불러오지 못했어요")}
                retrying={sessions.isFetching}
                onRetry={() => void sessions.refetch()}
              />
            ) : sessions.isPending ? (
              <p className={styles.noResult} role="status" aria-busy="true">
                {t("대화를 불러오는 중…")}
              </p>
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
          {!needle && !resting && (
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
            busy={renameSession.isPending}
            onRename={(title) => {
              if (renameSession.isPending) return;
              renameSession.mutate(
                { sessionId: session.id, title },
                { onSuccess: () => setRenaming(false) },
              );
            }}
            onCancel={() => setRenaming(false)}
          />
        ) : (
          <span className={styles.headerTitle}>{session?.title ?? ""}</span>
        )}
        <span className={styles.headerSpacer} />
        {meter}
        {session && (
          <SessionMenu
            onRename={() => {
              renameSession.reset();
              setRenaming(true);
            }}
            onDelete={() => {
              deleteSession.reset();
              setDeleting(true);
            }}
          />
        )}
        {closeButton}
      </header>
      {renaming && renameSession.isError && (
        <InlineNotice icon="circle-alert">
          {t(
            "대화 이름을 바꾸지 못했어요. 입력한 이름으로 다시 시도해 주세요.",
          )}
        </InlineNotice>
      )}
      {messages.isError ? (
        <div className={styles.scroll}>
          <QueryFailure
            title={t("대화 내용을 불러오지 못했어요")}
            retrying={messages.isFetching}
            onRetry={() => void messages.refetch()}
          />
        </div>
      ) : session ? (
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
              {!resting && (
                <Suggestions onPick={(question) => void pick(question)} />
              )}
            </div>
          }
        />
      ) : (
        <div className={styles.scroll} aria-busy="true" />
      )}
      {ask}
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
              !event.defaultPrevented &&
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
                error={deleteSession.isError}
                onCancel={() => setDeleting(false)}
                onConfirm={() => {
                  if (deleteSession.isPending) return;
                  deleteSession.mutate(session.id, {
                    onSuccess: () => {
                      streams.forget(session.id);
                      goTo({ kind: "home" });
                    },
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
        resting={resting}
        buttonRef={launcherRef}
        onClick={() => {
          if (tooLarge) setNotice((v) => !v);
          else if (windowOpen) closeWindow();
          else openWindow();
        }}
      />
      {ready && (
        <SelectionAsk onAttach={attach} onAsk={askAbout} resting={resting} />
      )}
    </>
  );
}
