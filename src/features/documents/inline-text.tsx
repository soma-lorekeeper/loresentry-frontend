"use client";

/**
 * 눌러서 고치는 텍스트 한 칸(graph-visualization 의 docs-view/inline-text.tsx 를 옮겼다).
 *
 * 평소엔 글자로 보이다가 누르면 그 자리에서 입력란이 되고, 포커스를 잃거나 Enter 를
 * 누르면 저장된다. 입력란이 늘 펼쳐져 있으면(관계가 서른 개 붙은 인물 문서를 떠올려
 * 보면) 읽을 수 없어지기 때문이다.
 */

import { useEffect, useRef, useState, type KeyboardEvent } from "react";

import { cx } from "@/shared/cx";

import styles from "./property-table.module.css";

export function InlineText({
  value,
  placeholder,
  label,
  readOnly,
  className,
  onCommit,
}: {
  value: string;
  /** 값이 비었을 때 대신 보여줄 글자 */
  placeholder: string;
  label: string;
  readOnly?: boolean;
  className?: string;
  onCommit: (value: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  // 편집을 시작할 때 현재 값을 초안으로 가져오고 커서를 끝에 둔다.
  // value 는 일부러 의존성에서 뺀다 — 편집 중에 바깥 값이 바뀌어도 초안을 덮지 않는다.
  useEffect(() => {
    if (!editing) return;
    const input = inputRef.current;
    if (!input) return;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }, [editing]);

  if (!editing || readOnly) {
    if (readOnly && !value) return null;
    return (
      <button
        type="button"
        className={cx(styles.inlineValue, className)}
        data-empty={value === "" || undefined}
        aria-label={label}
        disabled={readOnly}
        onClick={() => {
          setDraft(value);
          setEditing(true);
        }}
      >
        {value || placeholder}
      </button>
    );
  }

  const commit = () => {
    setEditing(false);
    if (draft.trim() !== value) onCommit(draft.trim());
  };

  return (
    <input
      ref={inputRef}
      className={cx(styles.inlineInput, className)}
      value={draft}
      placeholder={placeholder}
      aria-label={label}
      size={Math.max(draft.length, placeholder.length)}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") {
          event.preventDefault();
          setEditing(false);
        } else if (event.key === "Enter") {
          event.preventDefault();
          commit();
        }
      }}
    />
  );
}
