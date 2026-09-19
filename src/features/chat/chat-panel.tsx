"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Menu,
  type MenuEntry,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { ChatMessage } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { cx } from "@/shared/cx";

import styles from "./chat-panel.module.css";
import {
  useChatMessages,
  useChatSessionMutations,
  useChatSessions,
} from "./queries";
import { useChatStream } from "./use-chat-stream";

function Message({
  message,
}: {
  message: Pick<ChatMessage, "role" | "content">;
}) {
  if (message.role === "user")
    return <p className={styles.user}>{message.content}</p>;
  return (
    <div className={styles.assistant}>
      <span className={styles.assistantLabel}>
        <Icon name="sparkles" size={14} />
        Lorekeeper AI
      </span>
      <p>{message.content}</p>
    </div>
  );
}

function DeleteSessionConfirm({
  title,
  busy,
  failed,
  onCancel,
  onConfirm,
}: {
  title: string;
  busy: boolean;
  failed: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => cancelRef.current?.focus(), []);
  return (
    <div
      className={styles.scrim}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !busy) {
          event.stopPropagation();
          onCancel();
        }
      }}
    >
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="chat-delete-title"
        aria-describedby="chat-delete-description"
        className={styles.confirm}
      >
        <h2 id="chat-delete-title" className={styles.confirmTitle}>
          채팅 세션을 삭제할까요?
        </h2>
        <p id="chat-delete-description" className={styles.confirmText}>
          {failed
            ? "세션을 삭제하지 못했어요. 다시 시도해 주세요."
            : `‘${title}’의 대화 내역이 삭제되고 되돌릴 수 없어요.`}
        </p>
        <div className={styles.confirmActions}>
          <Button ref={cancelRef} size="lg" onClick={onCancel} disabled={busy}>
            취소
          </Button>
          <Button size="lg" variant="primary" busy={busy} onClick={onConfirm}>
            삭제
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChatPanel() {
  const { projectId, activeFileId } = useWorkspace();
  const sessions = useChatSessions(projectId);
  const mutations = useChatSessionMutations(projectId);
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);
  const [selected, setSelected] = useState<string | null>(null);
  const sessionId =
    sessions.data?.find((session) => session.id === selected)?.id ??
    sessions.data?.[0]?.id ??
    null;
  const session = sessions.data?.find((s) => s.id === sessionId);
  const messages = useChatMessages(sessionId);
  const stream = useChatStream(projectId, sessionId);

  const switcherRef = useRef<HTMLButtonElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const [switcherOpen, setSwitcherOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [draft, setDraft] = useState("");
  const [composing, setComposing] = useState(false);

  const contextNode = activeFileId ? index.get(activeFileId) : undefined;
  const context = isDocument(contextNode)
    ? {
        id: contextNode.id,
        title: contextNode.title,
        label: `현재 ${DOCUMENT_TYPE_META[contextNode.docType].label} · ${contextNode.title}`,
      }
    : null;

  const streaming = stream.state.kind === "streaming";
  const partial = stream.state.kind === "streaming" ? stream.state.partial : "";
  const log = messages.data ?? [];

  useEffect(() => {
    const node = logRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [log.length, partial]);

  const submit = () => {
    const content = draft.trim();
    if (!content || streaming || !sessionId) return;
    setDraft("");
    void stream.send(
      content,
      context ? { id: context.id, title: context.title } : null,
    );
  };

  const newSession = () =>
    mutations.create.mutate(undefined, {
      onSuccess: (created) => setSelected(created.id),
    });

  const commitRename = () => {
    if (renaming === null || !sessionId) return;
    const title = renaming.trim();
    if (!title || title === session?.title) {
      setRenaming(null);
      return;
    }
    mutations.rename.mutate(
      { sessionId, title },
      { onSuccess: () => setRenaming(null) },
    );
  };

  const sessionEntries: MenuEntry[] = (sessions.data ?? []).map((item) => ({
    id: item.id,
    label: item.title,
    icon: "message-square",
    checked: item.id === sessionId,
    onSelect: () => setSelected(item.id),
  }));

  const moreEntries: MenuEntry[] = [
    {
      id: "rename",
      label: "이름 변경",
      icon: "pencil",
      disabled: !session,
      onSelect: () => setRenaming(session?.title ?? ""),
    },
    {
      id: "delete",
      label: "삭제",
      icon: "trash-2",
      disabled: !session,
      onSelect: () => setConfirming(true),
    },
  ];

  const empty = !messages.isPending && log.length === 0 && !streaming;

  return (
    <section className={styles.panel} aria-label="AI 챗">
      <header className={styles.header}>
        {renaming !== null ? (
          <form
            className={styles.rename}
            onSubmit={(event) => {
              event.preventDefault();
              commitRename();
            }}
          >
            <input
              autoFocus
              className={styles.renameInput}
              value={renaming}
              aria-label="채팅 세션 이름"
              size={Math.max(renaming.length, 4)}
              onFocus={(event) => event.currentTarget.select()}
              onChange={(event) => setRenaming(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") {
                  event.preventDefault();
                  setRenaming(null);
                  switcherRef.current?.focus();
                }
              }}
            />
            <IconButton
              type="submit"
              icon="check"
              iconSize={14}
              label="이름 저장"
              className={styles.renameConfirm}
            />
          </form>
        ) : (
          <button
            ref={switcherRef}
            type="button"
            className={styles.switcher}
            aria-haspopup="menu"
            aria-expanded={switcherOpen}
            onClick={() => setSwitcherOpen((open) => !open)}
          >
            <span className={styles.switcherLabel}>
              {session?.title ?? "새 채팅"}
            </span>
            <Icon
              name={switcherOpen ? "chevron-up" : "chevron-down"}
              size={14}
            />
          </button>
        )}
        <IconButton
          icon="plus"
          iconSize={16}
          label="새 채팅"
          className={styles.headerButton}
          disabled={mutations.create.isPending}
          onClick={newSession}
        />
        <IconButton
          ref={moreRef}
          icon="ellipsis"
          iconSize={16}
          label="채팅 세션 메뉴"
          aria-haspopup="menu"
          aria-expanded={moreOpen}
          className={styles.headerButton}
          onClick={() => setMoreOpen((open) => !open)}
        />
        {switcherOpen && (
          <Menu
            anchorRef={switcherRef}
            open={switcherOpen}
            onOpenChange={setSwitcherOpen}
            label="채팅 세션"
            placement="bottom-start"
            width={300}
            itemHeight={40}
            entries={sessionEntries}
          />
        )}
        {moreOpen && (
          <Menu
            anchorRef={moreRef}
            open={moreOpen}
            onOpenChange={setMoreOpen}
            label="채팅 세션 메뉴"
            placement="bottom-end"
            width={160}
            entries={moreEntries}
          />
        )}
      </header>

      <div ref={logRef} className={styles.log} aria-live="polite">
        {empty ? (
          <EmptyState
            icon="sparkles"
            title="새 대화를 시작하세요"
            description={
              context
                ? "현재 원고에 대해 질문하거나 장면을 함께 다듬어 보세요."
                : "프로젝트에 대해 질문하거나 아이디어를 함께 정리해 보세요."
            }
            className={styles.empty}
            action={
              sessionId ? undefined : (
                <Button size="md" icon="plus" onClick={newSession}>
                  새 채팅
                </Button>
              )
            }
          />
        ) : (
          <>
            {context && <p className={styles.context}>{context.label}</p>}
            {log.map((message) => (
              <Message key={message.id} message={message} />
            ))}
            {stream.state.kind === "streaming" && (
              <>
                <Message message={stream.state.pending} />
                <div className={styles.assistant} aria-busy="true">
                  <span className={styles.assistantLabel}>
                    <Icon name="sparkles" size={14} />
                    Lorekeeper AI
                  </span>
                  <p>
                    {partial}
                    <span className={styles.caret} aria-hidden="true" />
                  </p>
                </div>
              </>
            )}
            {stream.state.kind === "stopped" && (
              <p className={styles.note}>
                응답 생성을 중단했어요. 미완성 답변은 기록에 남기지 않았어요.
              </p>
            )}
            {stream.state.kind === "error" && (
              <div className={styles.error} role="alert">
                <Icon name="circle-alert" size={14} />
                <span>메시지를 보내지 못했어요.</span>
                <Button
                  size="sm"
                  icon="rotate-ccw"
                  onClick={() => {
                    if (stream.state.kind !== "error") return;
                    const content = stream.state.content;
                    stream.dismiss();
                    void stream.send(
                      content,
                      context ? { id: context.id, title: context.title } : null,
                    );
                  }}
                >
                  다시 시도
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      <form
        className={styles.composer}
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <textarea
          className={styles.input}
          value={draft}
          placeholder={
            sessionId
              ? "메시지를 입력하세요"
              : "새 채팅을 만들어 대화를 시작하세요"
          }
          disabled={!sessionId}
          aria-label="메시지"
          onChange={(event) => setDraft(event.target.value)}
          onCompositionStart={() => setComposing(true)}
          onCompositionEnd={() => setComposing(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !composing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        {streaming ? (
          <IconButton
            icon="square"
            iconSize={13}
            label="응답 중단"
            className={cx(styles.send, styles.stop)}
            onClick={stream.stop}
          />
        ) : (
          <IconButton
            type="submit"
            icon="arrow-up"
            iconSize={15}
            label="보내기"
            className={styles.send}
            disabled={!draft.trim() || !sessionId}
          />
        )}
      </form>

      {confirming && session && (
        <DeleteSessionConfirm
          title={session.title}
          busy={mutations.remove.isPending}
          failed={mutations.remove.isError}
          onCancel={() => {
            mutations.remove.reset();
            setConfirming(false);
            moreRef.current?.focus();
          }}
          onConfirm={() =>
            mutations.remove.mutate(session.id, {
              onSuccess: () => {
                mutations.remove.reset();
                setConfirming(false);
                setSelected(null);
              },
            })
          }
        />
      )}
    </section>
  );
}
