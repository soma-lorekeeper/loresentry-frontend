"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { isDocumentType } from "@/domain/document-types";
import type { ChatIntent, ChatQuote } from "@/domain/models";
import { t } from "@/i18n";

import { AiMark } from "./ai-mark";
import styles from "./chat.module.css";

interface Picked {
  rect: DOMRect;
  quote: ChatQuote;
}

export type QuickIntent = Exclude<ChatIntent, "ask">;

export function quickLabel(intent: QuickIntent) {
  if (intent === "explain") return t("설명해 줘");
  if (intent === "related") return t("관련 설정");
  return t("앞뒤 흐름");
}

export function quickQuestion(intent: QuickIntent) {
  if (intent === "explain") return t("이 부분을 설명해 줘");
  if (intent === "related") return t("이 부분과 관련된 설정을 알려 줘");
  return t("이 부분의 앞뒤 흐름을 알려 줘");
}

const QUICK: QuickIntent[] = ["explain", "related", "flow"];
const MAX_QUOTE = 400;

function readSelection(): Picked | null {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed || selection.rangeCount === 0)
    return null;
  const range = selection.getRangeAt(0);
  const host =
    range.commonAncestorContainer instanceof Element
      ? range.commonAncestorContainer
      : range.commonAncestorContainer.parentElement;
  const editor = host?.closest(".ProseMirror");
  const column = host?.closest<HTMLElement>("[data-file-id]");
  if (!editor || !column?.dataset.fileId) return null;
  const text = selection.toString().replace(/\s+/g, " ").trim();
  if (text.length < 2) return null;
  const kind = column.dataset.kind;
  return {
    rect: range.getBoundingClientRect(),
    quote: {
      fileId: column.dataset.fileId,
      title: column.dataset.fileTitle || t("제목 없음"),
      docType: isDocumentType(kind) ? kind : "manuscript",
      text: text.length > MAX_QUOTE ? `${text.slice(0, MAX_QUOTE)}…` : text,
    },
  };
}

export function SelectionAsk({
  onAttach,
  onAsk,
}: {
  onAttach: (quote: ChatQuote) => void;
  onAsk: (quote: ChatQuote, intent: QuickIntent) => void;
}) {
  const [picked, setPicked] = useState<Picked | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      window.setTimeout(() => setPicked(readSelection()), 0);
    };
    const dismiss = (event: Event) => {
      if (panelRef.current?.contains(event.target as Node)) return;
      setPicked(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPicked(null);
    };
    document.addEventListener("mouseup", update);
    document.addEventListener("keyup", update);
    document.addEventListener("mousedown", dismiss);
    document.addEventListener("scroll", dismiss, true);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mouseup", update);
      document.removeEventListener("keyup", update);
      document.removeEventListener("mousedown", dismiss);
      document.removeEventListener("scroll", dismiss, true);
      document.removeEventListener("keydown", escape);
    };
  }, []);

  if (!picked) return null;

  const above = picked.rect.top > 80;
  const style = {
    left: Math.max(
      16,
      Math.min(
        picked.rect.left + picked.rect.width / 2,
        window.innerWidth - 16,
      ),
    ),
    top: above ? picked.rect.top - 10 : picked.rect.bottom + 10,
  };
  const close = () => {
    setPicked(null);
    window.getSelection()?.removeAllRanges();
  };

  return createPortal(
    <div
      ref={panelRef}
      role="toolbar"
      aria-label={t("선택한 부분으로 AI에게 묻기")}
      className={styles.selectionBar}
      data-above={above || undefined}
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      <button
        type="button"
        className={styles.selectionMain}
        onClick={() => {
          onAttach(picked.quote);
          close();
        }}
      >
        <AiMark size={15} />
        {t("AI에게 묻기")}
      </button>
      {QUICK.map((intent) => (
        <button
          key={intent}
          type="button"
          className={styles.selectionQuick}
          onClick={() => {
            onAsk(picked.quote, intent);
            close();
          }}
        >
          {quickLabel(intent)}
        </button>
      ))}
    </div>,
    document.body,
  );
}
