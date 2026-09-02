"use client";

import { useLayoutEffect, useRef } from "react";

import styles from "./workspace.module.css";

const manuscriptBodies: Record<string, string> = {
  "manuscript-12":
    "정원은 밤이 오면 유리보다 먼저 숨을 죽였다. 달빛이 온실의 지붕을 훑고 지나갈 때마다, 금이 간 창마다 은빛 선이 번졌다. 서윤은 그 선들이 모두 한곳을 가리키고 있다는 사실을 세 번째 순찰에서야 알아차렸다.\n\n오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다. 안으로 들어간 흔적은 있었지만 돌아 나온 흔적은 없었다. 손잡이에 손을 얹자 차가운 진동이 손목을 타고 올라왔다. 어젯밤 메모에 적어 둔 문장이 떠올랐다. ‘균열은 문이 아니라 기억의 방향이다.’\n\n서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다. 어둠 너머에서 익숙한 목소리가 이름을 불렀다. 아주 오래전, 이 정원을 떠난 사람이 마지막으로 불렀던 방식 그대로였다.",
  "manuscript-11":
    "유리 정원에 아침이 들면 밤새 맺힌 이슬이 작은 렌즈처럼 빛을 모았다. 서윤은 가장 먼저 깨어난 빛을 따라 중앙 온실로 걸었다.",
};

export type ManuscriptSaveStatus = "error" | "saved" | "saving";

export interface ManuscriptDocument {
  body: string;
  saveStatus: ManuscriptSaveStatus;
  title: string;
}

export interface ManuscriptFocusTarget {
  end: number;
  field: "body" | "title";
  start: number;
}

interface WorkspaceManuscriptEditorProps {
  document: ManuscriptDocument;
  documentId: string;
  focusRequest: number;
  onChange: (document: ManuscriptDocument) => void;
  onFocusTargetChange: (target: ManuscriptFocusTarget) => void;
  onRetrySave: () => void;
  restoreFocus?: ManuscriptFocusTarget;
}

export function WorkspaceManuscriptEditor({
  document,
  documentId,
  focusRequest,
  onChange,
  onFocusTargetChange,
  onRetrySave,
  restoreFocus,
}: WorkspaceManuscriptEditorProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);
  const charactersWithoutSpaces = document.body.replace(/\s/g, "").length;

  useLayoutEffect(() => {
    if (!restoreFocus) return;
    const target =
      restoreFocus.field === "title" ? titleRef.current : bodyRef.current;
    if (!target) return;
    target.focus();
    target.setSelectionRange(restoreFocus.start, restoreFocus.end);
  }, [documentId, focusRequest, restoreFocus]);

  const recordSelection = (
    field: ManuscriptFocusTarget["field"],
    target: HTMLInputElement | HTMLTextAreaElement,
  ) => {
    onFocusTargetChange({
      end: target.selectionEnd ?? target.value.length,
      field,
      start: target.selectionStart ?? target.value.length,
    });
  };

  const saveStatusCopy: Record<ManuscriptSaveStatus, string> = {
    error: "저장하지 못했습니다. 입력은 유지됩니다.",
    saved: "저장됨",
    saving: "저장 중…",
  };

  return (
    <section
      aria-labelledby={`manuscript-heading-${documentId}`}
      className={styles.manuscriptCanvas}
      data-document-id={documentId}
      id={`panel-${documentId}`}
      role="tabpanel"
      tabIndex={-1}
    >
      <div className={styles.manuscriptReadingColumn}>
        <h1 className={styles.srOnly} id={`manuscript-heading-${documentId}`}>
          {document.title || "제목 없는 원고"}
        </h1>
        <label
          className={styles.srOnly}
          htmlFor={`manuscript-title-${documentId}`}
        >
          원고 제목
        </label>
        <input
          className={styles.manuscriptTitle}
          id={`manuscript-title-${documentId}`}
          maxLength={120}
          onChange={(event) =>
            onChange({ ...document, title: event.target.value })
          }
          onFocus={(event) => recordSelection("title", event.currentTarget)}
          onSelect={(event) => recordSelection("title", event.currentTarget)}
          placeholder="제목 없는 원고"
          ref={titleRef}
          type="text"
          value={document.title}
        />
        <label
          className={styles.srOnly}
          htmlFor={`manuscript-body-${documentId}`}
        >
          원고 본문
        </label>
        <textarea
          className={styles.manuscriptBody}
          id={`manuscript-body-${documentId}`}
          onChange={(event) =>
            onChange({ ...document, body: event.target.value })
          }
          onFocus={(event) => recordSelection("body", event.currentTarget)}
          onSelect={(event) => recordSelection("body", event.currentTarget)}
          placeholder="이야기를 시작하세요."
          ref={bodyRef}
          spellCheck
          value={document.body}
          wrap="soft"
        />
        <footer className={styles.manuscriptStatus}>
          <div
            aria-live="polite"
            className={styles.manuscriptSaveStatus}
            data-save-status={document.saveStatus}
            role="status"
          >
            <span aria-hidden="true" className={styles.saveStatusDot} />
            <span>{saveStatusCopy[document.saveStatus]}</span>
            {document.saveStatus === "error" && (
              <button onClick={onRetrySave} type="button">
                다시 저장
              </button>
            )}
          </div>
          <div className={styles.manuscriptCounts}>
            <span>
              공백 포함 {document.body.length.toLocaleString("ko-KR")}자
            </span>
            <span>
              공백 제외 {charactersWithoutSpaces.toLocaleString("ko-KR")}자
            </span>
          </div>
        </footer>
      </div>
    </section>
  );
}

export function createInitialManuscriptDocument(
  documentId: string,
  title: string,
): ManuscriptDocument {
  return {
    body: manuscriptBodies[documentId] ?? "",
    saveStatus: "saved",
    title,
  };
}
