"use client";

import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type FormEvent,
  type ReactNode,
} from "react";

import { Icon, IconButton } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { ChatQuote } from "@/domain/models";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./chat.module.css";

export function QuoteCard({
  quote,
  onRemove,
  compact = false,
}: {
  quote: ChatQuote;
  onRemove?: () => void;
  compact?: boolean;
}) {
  return (
    <div
      className={cx(styles.quoteAttach, compact && styles.quoteCompact)}
      data-kind={quote.docType}
    >
      <div className={styles.quoteHead}>
        <Icon name={DOCUMENT_TYPE_META[quote.docType].entityIcon} size={12} />
        <span className={styles.quoteTitle}>{quote.title}</span>
        {onRemove && (
          <IconButton
            icon="x"
            label={t("인용 빼기")}
            iconSize={12}
            className={styles.quoteRemove}
            onClick={onRemove}
          />
        )}
      </div>
      <p className={styles.quoteText}>{quote.text}</p>
    </div>
  );
}

export interface Viewing {
  title: string;
  docType: DocumentType;
}

export const Composer = forwardRef<
  HTMLTextAreaElement,
  {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    pending: boolean;
    onStop: () => void;
    quote: ChatQuote | null;
    onRemoveQuote: () => void;
    viewing: Viewing | null;
    viewingOn: boolean;
    onToggleViewing: () => void;
    placeholder: string;
    notice?: ReactNode;
    elsewhere?: boolean;
  }
>(function Composer(
  {
    value,
    onChange,
    onSubmit,
    pending,
    onStop,
    quote,
    onRemoveQuote,
    viewing,
    viewingOn,
    onToggleViewing,
    placeholder,
    notice,
    elsewhere = false,
  },
  ref,
) {
  const local = useRef<HTMLTextAreaElement | null>(null);
  useLayoutEffect(() => {
    const el = local.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const canSend =
    !pending && !elsewhere && (value.trim().length > 0 || quote !== null);
  const submit = (event?: FormEvent) => {
    event?.preventDefault();
    if (canSend) onSubmit();
  };

  return (
    <form className={styles.composer} onSubmit={submit}>
      {notice}
      {quote && <QuoteCard quote={quote} onRemove={onRemoveQuote} />}
      <div className={styles.field}>
        <textarea
          ref={(el) => {
            local.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }}
          rows={1}
          value={value}
          maxLength={4000}
          placeholder={quote ? t("이 부분에 대해 물어보세요") : placeholder}
          aria-label={t("질문")}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" &&
              !event.shiftKey &&
              !event.nativeEvent.isComposing
            ) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className={styles.fieldRow}>
          {viewing && (
            <button
              type="button"
              className={styles.viewing}
              data-kind={viewing.docType}
              aria-pressed={viewingOn}
              title={
                viewingOn
                  ? t("지금 보는 문서를 함께 알려요. 누르면 빼요.")
                  : t("지금 보는 문서를 빼고 물어요. 누르면 다시 넣어요.")
              }
              onClick={onToggleViewing}
            >
              <Icon
                name={DOCUMENT_TYPE_META[viewing.docType].entityIcon}
                size={12}
              />
              <span>{viewing.title}</span>
            </button>
          )}
          <span className={styles.fieldSpacer} />
          {pending ? (
            <button
              type="button"
              className={styles.stop}
              aria-label={t("응답 멈추기")}
              title={t("응답 멈추기")}
              onClick={onStop}
            >
              <Icon name="square" size={11} />
            </button>
          ) : (
            <button
              type="submit"
              className={styles.send}
              aria-label={t("보내기")}
              title={
                elsewhere
                  ? t("다른 대화에서 답을 쓰는 중이에요")
                  : t("보내기 (Enter)")
              }
              disabled={!canSend}
            >
              <Icon name="arrow-up" size={15} />
            </button>
          )}
        </div>
      </div>
    </form>
  );
});
