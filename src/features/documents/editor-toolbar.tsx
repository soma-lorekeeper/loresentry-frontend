"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  Icon,
  Menu,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import { cx } from "@/shared/cx";
import { formatNumber } from "@/shared/format";

import type { SaveStatus } from "./document-session";
import {
  EDITOR_ALIGNMENTS,
  EDITOR_FONT_SIZES,
  EDITOR_FONTS,
  EDITOR_LINE_HEIGHTS,
  setEditorPrefs,
  type EditorPrefs,
} from "./editor-prefs";
import { findStateOf } from "./editor/find-replace";
import styles from "./editor-toolbar.module.css";

const COMPACT_WIDTH = 900;

interface ToolbarProps {
  editor: Editor | null;
  prefs: EditorPrefs;
  status: SaveStatus;
  locked: boolean;
  onRetry: () => void;
}

function Tool({
  icon,
  label,
  pressed,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={styles.tool}
      aria-label={label}
      title={label}
      aria-pressed={pressed}
      disabled={disabled}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      <Icon name={icon} size={15} />
    </button>
  );
}

function Select({
  label,
  value,
  width,
  entries,
}: {
  label: string;
  value: string;
  width: number;
  entries: MenuEntry[];
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.select}
        style={{ width }}
        aria-label={`${label}: ${value}`}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        <span>{value}</span>
        <Icon name="chevron-down" size={13} />
      </button>
      <Menu
        anchorRef={ref}
        open={open}
        onOpenChange={setOpen}
        label={label}
        width={160}
        entries={entries}
      />
    </>
  );
}

function SaveState({
  status,
  onRetry,
}: {
  status: SaveStatus;
  onRetry: () => void;
}) {
  if (status === "error") {
    return (
      <span className={styles.saveError} role="alert">
        <Icon name="cloud-off" size={15} />
        저장하지 못했어요
        <button type="button" className={styles.retry} onClick={onRetry}>
          다시 시도
        </button>
      </span>
    );
  }
  const view: Record<
    Exclude<SaveStatus, "error">,
    { icon: IconName; label: string }
  > = {
    loading: { icon: "loader-circle", label: "불러오는 중" },
    saved: { icon: "cloud-check", label: "자동 저장됨" },
    dirty: { icon: "loader-circle", label: "저장 대기 중" },
    saving: { icon: "loader-circle", label: "저장 중…" },
    conflict: { icon: "triangle-alert", label: "다른 곳에서 수정됨" },
    locked: { icon: "lock", label: "잠김" },
  };
  const { icon, label } = view[status];
  const spinning = status === "saving" || status === "loading";
  return (
    <span className={styles.saveState} role="status">
      <Icon
        name={icon}
        size={14}
        className={spinning ? styles.spin : undefined}
      />
      {label}
    </span>
  );
}

export function EditorToolbar({
  editor,
  prefs,
  status,
  locked,
  onRetry,
}: ToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const [compact, setCompact] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) =>
      setCompact(entry.contentRect.width < COMPACT_WIDTH),
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const state = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      if (!current) return null;
      const text = current.state.doc.textContent;
      return {
        bold: current.isActive("bold"),
        italic: current.isActive("italic"),
        underline: current.isActive("underline"),
        strike: current.isActive("strike"),
        bulletList: current.isActive("bulletList"),
        orderedList: current.isActive("orderedList"),
        canUndo: current.can().undo(),
        canRedo: current.can().redo(),
        canSink: current.can().sinkListItem("listItem"),
        canLift: current.can().liftListItem("listItem"),
        withSpaces: text.length,
        withoutSpaces: text.replace(/\s/g, "").length,
      };
    },
  });

  const run = (
    command: (
      chain: ReturnType<Editor["chain"]>,
    ) => ReturnType<Editor["chain"]>,
  ) => {
    if (!editor) return;
    command(editor.chain().focus()).run();
  };

  const font = EDITOR_FONTS.find((f) => f.id === prefs.font) ?? EDITOR_FONTS[0];
  const align =
    EDITOR_ALIGNMENTS.find((a) => a.id === prefs.align) ?? EDITOR_ALIGNMENTS[0];

  const fontEntries: MenuEntry[] = EDITOR_FONTS.map((f) => ({
    id: f.id,
    label: f.label,
    checked: f.id === prefs.font,
    onSelect: () => setEditorPrefs({ font: f.id }),
  }));
  const sizeEntries: MenuEntry[] = EDITOR_FONT_SIZES.map((size) => ({
    id: String(size),
    label: String(size),
    checked: size === prefs.fontSize,
    onSelect: () => setEditorPrefs({ fontSize: size }),
  }));
  const lineEntries: MenuEntry[] = EDITOR_LINE_HEIGHTS.map((height) => ({
    id: String(height),
    label: String(height),
    checked: height === prefs.lineHeight,
    onSelect: () => setEditorPrefs({ lineHeight: height }),
  }));
  const alignEntries: MenuEntry[] = EDITOR_ALIGNMENTS.map((a) => ({
    id: a.id,
    label: a.label,
    checked: a.id === prefs.align,
    onSelect: () => setEditorPrefs({ align: a.id }),
  }));

  const moreEntries: MenuEntry[] = [
    { type: "group", id: "g-env", label: "줄 간격" },
    ...lineEntries.map((entry) => ({ ...entry, id: `lh-${entry.id}` })),
    { type: "group", id: "g-align", label: "정렬" },
    ...alignEntries.map((entry) => ({ ...entry, id: `al-${entry.id}` })),
    { type: "separator", id: "s1" },
    {
      id: "outdent",
      label: "내어쓰기",
      icon: "list-indent-decrease",
      disabled: !state?.canLift,
      onSelect: () => run((c) => c.liftListItem("listItem")),
    },
    {
      id: "indent",
      label: "들여쓰기",
      icon: "list-indent-increase",
      disabled: !state?.canSink,
      onSelect: () => run((c) => c.sinkListItem("listItem")),
    },
    {
      id: "underline",
      label: "밑줄",
      icon: "underline",
      checked: state?.underline,
      onSelect: () => run((c) => c.toggleUnderline()),
    },
    {
      id: "strike",
      label: "취소선",
      icon: "strikethrough",
      checked: state?.strike,
      onSelect: () => run((c) => c.toggleStrike()),
    },
    {
      id: "bullet",
      label: "글머리 목록",
      icon: "list",
      checked: state?.bulletList,
      onSelect: () => run((c) => c.toggleBulletList()),
    },
    {
      id: "ordered",
      label: "번호 목록",
      icon: "list-ordered",
      checked: state?.orderedList,
      onSelect: () => run((c) => c.toggleOrderedList()),
    },
    { type: "separator", id: "s2" },
    {
      id: "find",
      label: "찾기·바꾸기",
      icon: "search",
      onSelect: () => setFindOpen(true),
    },
  ];

  return (
    <>
      <div
        ref={rootRef}
        className={styles.toolbar}
        role="toolbar"
        aria-label="편집 도구"
        aria-disabled={locked || undefined}
      >
        <div className={styles.controls}>
          <div className={styles.group}>
            <Tool
              icon="undo-2"
              label="되돌리기"
              disabled={!state?.canUndo}
              onClick={() => run((c) => c.undo())}
            />
            <Tool
              icon="redo-2"
              label="다시 실행"
              disabled={!state?.canRedo}
              onClick={() => run((c) => c.redo())}
            />
          </div>
          <span className={styles.separator} />
          <div className={styles.group}>
            <Select
              label="글꼴"
              value={font.label}
              width={88}
              entries={fontEntries}
            />
            <Select
              label="글자 크기"
              value={String(prefs.fontSize)}
              width={58}
              entries={sizeEntries}
            />
            {!compact && (
              <Select
                label="줄 간격"
                value={String(prefs.lineHeight)}
                width={64}
                entries={lineEntries}
              />
            )}
          </div>
          {!compact && (
            <>
              <span className={styles.separator} />
              <div className={styles.group}>
                <Select
                  label="정렬"
                  value={align.id === "left" ? "정렬" : align.label}
                  width={68}
                  entries={alignEntries}
                />
                <Tool
                  icon="list-indent-decrease"
                  label="내어쓰기"
                  disabled={!state?.canLift}
                  onClick={() => run((c) => c.liftListItem("listItem"))}
                />
                <Tool
                  icon="list-indent-increase"
                  label="들여쓰기"
                  disabled={!state?.canSink}
                  onClick={() => run((c) => c.sinkListItem("listItem"))}
                />
              </div>
            </>
          )}
          <span className={styles.separator} />
          <div className={styles.group}>
            <Tool
              icon="bold"
              label="굵게"
              pressed={state?.bold}
              onClick={() => run((c) => c.toggleBold())}
            />
            <Tool
              icon="italic"
              label="기울임"
              pressed={state?.italic}
              onClick={() => run((c) => c.toggleItalic())}
            />
            {!compact && (
              <>
                <Tool
                  icon="underline"
                  label="밑줄"
                  pressed={state?.underline}
                  onClick={() => run((c) => c.toggleUnderline())}
                />
                <Tool
                  icon="strikethrough"
                  label="취소선"
                  pressed={state?.strike}
                  onClick={() => run((c) => c.toggleStrike())}
                />
              </>
            )}
          </div>
          {compact ? (
            <>
              <button
                ref={moreRef}
                type="button"
                className={cx(styles.labelTool, styles.more)}
                aria-haspopup="menu"
                aria-expanded={moreOpen}
                onClick={() => setMoreOpen((open) => !open)}
              >
                <Icon name="ellipsis" size={15} />
                더보기
              </button>
              <Menu
                anchorRef={moreRef}
                open={moreOpen}
                onOpenChange={setMoreOpen}
                label="더보기"
                width={200}
                entries={moreEntries}
              />
            </>
          ) : (
            <>
              <span className={styles.separator} />
              <div className={styles.group}>
                <Tool
                  icon="list"
                  label="글머리 목록"
                  pressed={state?.bulletList}
                  onClick={() => run((c) => c.toggleBulletList())}
                />
                <Tool
                  icon="list-ordered"
                  label="번호 목록"
                  pressed={state?.orderedList}
                  onClick={() => run((c) => c.toggleOrderedList())}
                />
              </div>
              <span className={styles.separator} />
              <button
                type="button"
                className={styles.labelTool}
                aria-pressed={findOpen}
                onClick={() => setFindOpen((open) => !open)}
              >
                <Icon name="search" size={15} />
                찾기·바꾸기
              </button>
            </>
          )}
        </div>
        <div className={styles.status}>
          <SaveState status={status} onRetry={onRetry} />
          <span className={styles.separator} />
          {compact ? (
            <span>{formatNumber(state?.withSpaces ?? 0)}자</span>
          ) : (
            <span className={styles.counts}>
              <span>공백 포함 {formatNumber(state?.withSpaces ?? 0)}</span>
              <span>제외 {formatNumber(state?.withoutSpaces ?? 0)}</span>
            </span>
          )}
        </div>
      </div>
      {findOpen && editor && (
        <FindBar
          editor={editor}
          locked={locked}
          onClose={() => setFindOpen(false)}
        />
      )}
    </>
  );
}

function FindBar({
  editor,
  locked,
  onClose,
}: {
  editor: Editor;
  locked: boolean;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const find = useEditorState({
    editor,
    selector: ({ editor: current }) => {
      const state = current ? findStateOf(current.state) : undefined;
      return { count: state?.matches.length ?? 0, index: state?.index ?? 0 };
    },
  });

  useEffect(() => () => void editor.commands.setFindQuery(""), [editor]);

  return (
    <div className={styles.findBar} role="search" aria-label="찾기와 바꾸기">
      <input
        autoFocus
        className={styles.findInput}
        placeholder="찾을 내용"
        aria-label="찾을 내용"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          editor.commands.setFindQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            editor.commands.findStep(event.shiftKey ? -1 : 1);
          } else if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
      />
      <span className={styles.findCount} aria-live="polite">
        {query ? `${find?.count ? find.index + 1 : 0}/${find?.count ?? 0}` : ""}
      </span>
      <Tool
        icon="chevron-up"
        label="이전 결과"
        disabled={!find?.count}
        onClick={() => editor.commands.findStep(-1)}
      />
      <Tool
        icon="chevron-down"
        label="다음 결과"
        disabled={!find?.count}
        onClick={() => editor.commands.findStep(1)}
      />
      <input
        className={styles.findInput}
        placeholder="바꿀 내용"
        aria-label="바꿀 내용"
        value={replacement}
        disabled={locked}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <Button
        disabled={locked || !find?.count}
        onClick={() => editor.commands.replaceCurrent(replacement)}
      >
        바꾸기
      </Button>
      <Button
        disabled={locked || !find?.count}
        onClick={() => editor.commands.replaceAll(replacement)}
      >
        모두 바꾸기
      </Button>
      <span className={styles.findSpacer} />
      <Tool icon="x" label="찾기 닫기" onClick={onClose} />
    </div>
  );
}
