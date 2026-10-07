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
  TextAreaField,
  useToast,
} from "@/design-system/primitives";
import { isServiceError } from "@/services/errors";
import { FEEDBACK_MAX } from "@/services/ports";
import { useServices } from "@/services/services-context";

import styles from "./feedback.module.css";

const PLACEHOLDER =
  "불편했던 점이나 있었으면 하는 기능을 자유롭게 적어 주세요.";

const FeedbackContext = createContext<{ open: () => void } | null>(null);

/** 어느 화면에서든 같은 피드백 모달을 연다. 보내지 않고 닫은 글은 다음에 열 때 그대로 남는다. */
export function useFeedback() {
  const context = useContext(FeedbackContext);
  if (!context) throw new Error("FeedbackProvider is missing");
  return context;
}

function currentPage() {
  return typeof window === "undefined" ? "" : window.location.pathname;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [opened, setOpened] = useState(false);
  const [draft, setDraft] = useState("");
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
            setDraft("");
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
  draft: string;
  onDraft: (draft: string) => void;
  onClose: () => void;
  onSent: () => void;
}) {
  const services = useServices();
  const toast = useToast();
  const [page] = useState(currentPage);
  const send = useMutation({
    mutationFn: () =>
      services.feedback.send({
        message: draft.trim(),
        page,
      }),
    onSuccess: () => {
      toast({
        icon: "circle-check",
        title: "피드백을 보냈어요",
      });
      onSent();
    },
  });
  const empty = draft.trim().length === 0;
  const tooLong = draft.trim().length > FEEDBACK_MAX;
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
      title="피드백 보내기"
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
        <TextAreaField
          label="내용"
          value={draft}
          onChange={(event) => {
            onDraft(event.target.value);
            if (send.isError) send.reset();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
              event.preventDefault();
              submit();
            }
          }}
          placeholder={PLACEHOLDER}
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
