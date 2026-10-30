"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import type { Editor } from "@tiptap/core";

import { Icon } from "@/design-system/primitives";
import { isDocumentType } from "@/domain/document-types";
import {
  coreTargetsOf,
  toggleCore,
} from "@/features/documents/editor/core-setting";
import { editorOf } from "@/features/documents/editor/editor-registry";
import type { ChatIntent, ChatQuote } from "@/domain/models";
import { t } from "@/i18n";

import { AiMark } from "./ai-mark";
import styles from "./chat.module.css";

interface Picked {
  rect: DOMRect;
  quote: ChatQuote;
  /** 설정 문서의 최상위 문단을 골랐을 때만 있다. 이미 모두 표시돼 있으면 `marked` 다 */
  core: { editor: Editor; marked: boolean } | null;
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

/** 설정 문서의 본문에서 최상위 문단을 골랐을 때 중요 설정 표시를 내준다 */
function coreOf(element: Element, docType: string | undefined): Picked["core"] {
  if (!isDocumentType(docType) || docType === "manuscript") return null;
  const editor = editorOf(element);
  if (!editor || !editor.isEditable) return null;
  const targets = coreTargetsOf(editor.state);
  return targets ? { editor, marked: targets.marked } : null;
}

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
    core: coreOf(editor, kind),
  };
}

export function SelectionAsk({
  onAttach,
  onAsk,
  resting = false,
  ai = true,
}: {
  onAttach: (quote: ChatQuote) => void;
  onAsk: (quote: ChatQuote, intent: QuickIntent) => void;
  resting?: boolean;
  /** AI 챗을 쓸 수 없으면 AI 동작을 빼고, 설정 문서의 중요 설정 표시만 남긴다 */
  ai?: boolean;
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

  if (!picked || (!ai && !picked.core)) return null;

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
      aria-label={ai ? t("선택한 부분으로 AI에게 묻기") : t("선택한 문단")}
      className={styles.selectionBar}
      data-above={above || undefined}
      data-resting={resting || undefined}
      style={style}
      onMouseDown={(event) => event.preventDefault()}
    >
      {picked.core && (
        <button
          type="button"
          className={styles.selectionCore}
          onClick={() => {
            if (picked.core) toggleCore(picked.core.editor);
            close();
          }}
        >
          <Icon name={picked.core.marked ? "pin-off" : "pin"} size={15} />
          {picked.core.marked ? t("표시 풀기") : t("중요 설정으로 표시")}
        </button>
      )}
      {ai && (
        <button
          type="button"
          className={styles.selectionMain}
          data-secondary={picked.core ? true : undefined}
          aria-disabled={resting || undefined}
          onClick={() => {
            if (resting) return;
            onAttach(picked.quote);
            close();
          }}
        >
          <AiMark size={15} />
          {t("AI에게 묻기")}
        </button>
      )}
      {ai &&
        QUICK.map((intent) => (
          <button
            key={intent}
            type="button"
            className={styles.selectionQuick}
            aria-disabled={resting || undefined}
            onClick={() => {
              if (resting) return;
              onAsk(picked.quote, intent);
              close();
            }}
          >
            {quickLabel(intent)}
          </button>
        ))}
      {ai && resting && (
        <p className={styles.selectionNote} role="status">
          {t("오늘 사용량을 다 썼어요")} <span>{t("자정에 비워져요")}</span>
        </p>
      )}
    </div>,
    document.body,
  );
}
