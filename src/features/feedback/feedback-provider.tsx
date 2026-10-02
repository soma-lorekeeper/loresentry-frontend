"use client";

import { useMutation } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  Button,
  DialogCard,
  InlineNotice,
  Segmented,
  TextAreaField,
  useToast,
  type SegmentedOption,
} from "@/design-system/primitives";
import { isServiceError } from "@/services/errors";
import { FEEDBACK_MAX, type FeedbackCategory } from "@/services/ports";
import { useServices } from "@/services/services-context";

import styles from "./feedback.module.css";

const CATEGORIES: SegmentedOption<FeedbackCategory>[] = [
  { value: "bug", label: "버그 신고", icon: "bug" },
  { value: "idea", label: "개선 제안", icon: "lightbulb" },
  { value: "other", label: "기타", icon: "message-square" },
];

const PLACEHOLDER: Record<FeedbackCategory, string> = {
  bug: "어느 화면에서 무엇을 했을 때 어떤 일이 일어났는지 적어 주세요.",
  idea: "어떤 상황에서 무엇이 있으면 좋을지 적어 주세요.",
  other: "하고 싶은 말을 자유롭게 적어 주세요.",
};

interface Draft {
  category: FeedbackCategory;
  message: string;
}

const EMPTY: Draft = { category: "bug", message: "" };

const FeedbackContext = createContext<{ open: () => void } | null>(null);

/** 어느 화면에서든 같은 피드백 모달을 연다. 보내지 않고 닫은 글은 다음에 열 때 그대로 남는다. */
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("FeedbackProvider is missing");
  return context;
}

function isMac() {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent)
  );
}

function currentPage() {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const open = useCallback(() => setOpened(true), []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      {opened && (
        <FeedbackDialog
          draft={draft}
          onDraft={setDraft}
          onClose={() => setOpened(false)}
          onSent={() => {
            setDraft(EMPTY);
            setOpened(false);
          }}
        />
      )}
    </FeedbackContext.Provider>
  );
}

function FeedbackDialog({
  draft,
  onDraft,
  onClose,
  onSent,
}: {
  draft: Draft;
  onDraft: (draft: Draft) => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const services = useServices();
  const toast = useToast();
  const [page] = useState(currentPage);
  const [mac] = useState(isMac);
  const send = useMutation({
    mutationFn: () =>
      services.feedback.send({
        category: draft.category,
        message: draft.message.trim(),
        page,
      }),
    onSuccess: () => {
      toast({
        icon: "circle-check",
        title: "피드백을 보냈어요",
        description: "보내 주셔서 고마워요. 팀이 모두 읽어요.",
      });
      onSent();
    },
  });
  const empty = draft.message.trim().length === 0;
  const tooLong = draft.message.trim().length > FEEDBACK_MAX;
  const pending = send.isPending;

  const submit = () => {
    if (empty || tooLong || pending) return;
    send.mutate();
  };

  const error = send.error
    ? isServiceError(send.error) && send.error.code === "network"
      ? "피드백을 보내지 못했어요. 쓴 내용은 그대로 있으니 연결을 확인하고 다시 보내 주세요."
      : isServiceError(send.error)
        ? send.error.message
        : "피드백을 보내지 못했어요. 다시 보내 주세요."
    : null;

  return (
    <DialogCard
      open
      onClose={() => !pending && onClose()}
      dismissible={!pending}
      size="md"
      icon="message-square-plus"
      title="피드백 보내기"
      description="불편했던 점이나 있었으면 하는 기능을 알려 주세요. 팀이 모두 읽어요."
      footerHint={
        <span className={styles.hint}>
          <kbd>{mac ? "⌘" : "Ctrl"}</kbd>
          <kbd>Enter</kbd>로 보내기
        </span>
      }
      actions={
        <>
          <Button
            size="md"
            icon="x"
            className={styles.ghost}
            onClick={onClose}
            disabled={pending}
          >
            취소
          </Button>
          <Button
            size="md"
            variant="primary"
            icon={error ? "refresh-cw" : "send"}
            busy={pending}
            disabled={empty || tooLong}
            onClick={submit}
          >
            {pending ? "보내는 중…" : error ? "다시 보내기" : "보내기"}
          </Button>
        </>
      }
    >
      <div className={styles.body}>
        <Segmented
          label="피드백 유형"
          options={CATEGORIES}
          value={draft.category}
          onChange={(category) => onDraft({ ...draft, category })}
          className={styles.categories}
        />
        <TextAreaField
          label="내용"
          value={draft.message}
          onChange={(event) => {
            onDraft({ ...draft, message: event.target.value });
            if (send.isError) send.reset();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={PLACEHOLDER[draft.category]}
          maxLength={FEEDBACK_MAX}
          rows={7}
          readOnly={pending}
          autoFocus
        />
        {error && <InlineNotice icon="circle-alert">{error}</InlineNotice>}
        <p className={styles.context}>
          계정 정보와 지금 보고 있던 화면 위치({page || "/"})가 함께 전달돼요.
        </p>
      </div>
    </DialogCard>
  );
}
