"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import { useEffect, useRef, useState, type ReactNode } from "react";

import {
  Button,
  Icon,
  Menu,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import { cx } from "@/shared/cx";
import { t } from "@/i18n";
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
  /** 오른쪽 끝에 붙는 파일 도구(메모·버전·내보내기·잠금). */
  actions?: ReactNode;
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
        {t("저장하지 못했어요")}
        <button type="button" className={styles.retry} onClick={onRetry}>
          {t("다시 시도")}
        </button>
      </span>
    );
  }
  const view: Record<
    Exclude<SaveStatus, "error">,
    { icon: IconName; label: string }
  > = {
    loading: { icon: "loader-circle", label: t("불러오는 중") },
    saved: { icon: "cloud-check", label: t("저장됨") },
    dirty: { icon: "loader-circle", label: t("저장 대기 중") },
    saving: { icon: "loader-circle", label: t("저장 중…") },
    conflict: { icon: "triangle-alert", label: t("다른 곳에서 수정됨") },
    locked: { icon: "lock", label: t("잠김") },
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
      <span className={styles.saveLabel}>{label}</span>
    </span>
  );
}

export function EditorToolbar({
  editor,
  prefs,
  status,
  locked,
  onRetry,
  actions,
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

  const characters = formatNumber(state?.withSpaces ?? 0);
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
    { type: "group", id: "g-env", label: t("줄 간격") },
    ...lineEntries.map((entry) => ({ ...entry, id: `lh-${entry.id}` })),
    { type: "group", id: "g-align", label: t("정렬") },
    ...alignEntries.map((entry) => ({ ...entry, id: `al-${entry.id}` })),
    { type: "separator", id: "s1" },
    {
      id: "outdent",
      label: t("내어쓰기"),
      icon: "list-indent-decrease",
      disabled: !state?.canLift,
      onSelect: () => run((c) => c.liftListItem("listItem")),
    },
    {
      id: "indent",
      label: t("들여쓰기"),
      icon: "list-indent-increase",
      disabled: !state?.canSink,
      onSelect: () => run((c) => c.sinkListItem("listItem")),
    },
    {
      id: "underline",
      label: t("밑줄"),
      icon: "underline",
      checked: state?.underline,
      onSelect: () => run((c) => c.toggleUnderline()),
    },
    {
      id: "strike",
      label: t("취소선"),
      icon: "strikethrough",
      checked: state?.strike,
      onSelect: () => run((c) => c.toggleStrike()),
    },
    {
      id: "bullet",
      label: t("글머리 목록"),
      icon: "list",
      checked: state?.bulletList,
      onSelect: () => run((c) => c.toggleBulletList()),
    },
    {
      id: "ordered",
      label: t("번호 목록"),
      icon: "list-ordered",
      checked: state?.orderedList,
      onSelect: () => run((c) => c.toggleOrderedList()),
    },
    { type: "separator", id: "s2" },
    {
      id: "find",
      label: t("찾기·바꾸기"),
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
        aria-label={t("편집 도구")}
        aria-disabled={locked || undefined}
      >
        <div className={styles.controls}>
          <div className={styles.group}>
            <Tool
              icon="undo-2"
              label={t("되돌리기")}
              disabled={!state?.canUndo}
              onClick={() => run((c) => c.undo())}
            />
            <Tool
              icon="redo-2"
              label={t("다시 실행")}
              disabled={!state?.canRedo}
              onClick={() => run((c) => c.redo())}
            />
          </div>
          <span className={styles.separator} />
          <div className={styles.group}>
            <Select
              label={t("글꼴")}
              value={font.label}
              width={88}
              entries={fontEntries}
            />
            <Select
              label={t("글자 크기")}
              value={String(prefs.fontSize)}
              width={58}
              entries={sizeEntries}
            />
            {!compact && (
              <Select
                label={t("줄 간격")}
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
                  label={t("정렬")}
                  value={align.id === "left" ? t("정렬 값::정렬") : align.label}
                  width={68}
                  entries={alignEntries}
                />
                <Tool
                  icon="list-indent-decrease"
                  label={t("내어쓰기")}
                  disabled={!state?.canLift}
                  onClick={() => run((c) => c.liftListItem("listItem"))}
                />
                <Tool
                  icon="list-indent-increase"
                  label={t("들여쓰기")}
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
              label={t("굵게")}
              pressed={state?.bold}
              onClick={() => run((c) => c.toggleBold())}
            />
            <Tool
              icon="italic"
              label={t("기울임")}
              pressed={state?.italic}
              onClick={() => run((c) => c.toggleItalic())}
            />
            {!compact && (
              <>
                <Tool
                  icon="underline"
                  label={t("밑줄")}
                  pressed={state?.underline}
                  onClick={() => run((c) => c.toggleUnderline())}
                />
                <Tool
                  icon="strikethrough"
                  label={t("취소선")}
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
                {t("더보기")}
              </button>
              <Menu
                anchorRef={moreRef}
                open={moreOpen}
                onOpenChange={setMoreOpen}
                label={t("더보기")}
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
                  label={t("글머리 목록")}
                  pressed={state?.bulletList}
                  onClick={() => run((c) => c.toggleBulletList())}
                />
                <Tool
                  icon="list-ordered"
                  label={t("번호 목록")}
                  pressed={state?.orderedList}
                  onClick={() => run((c) => c.toggleOrderedList())}
                />
              </div>
              <span className={styles.separator} />
              <Tool
                icon="search"
                label={t("찾기·바꾸기")}
                pressed={findOpen}
                onClick={() => setFindOpen((open) => !open)}
              />
            </>
          )}
        </div>
        <div className={styles.status}>
          <SaveState status={status} onRetry={onRetry} />
          <span
            className={styles.counts}
            title={t("공백 포함 {withSpaces}자 · 공백 제외 {withoutSpaces}자", {
              withSpaces: formatNumber(state?.withSpaces ?? 0),
              withoutSpaces: formatNumber(state?.withoutSpaces ?? 0),
            })}
            data-short={t("글자 수 줄임::{count}자", { count: characters })}
          >
            {t("{count}자", { count: characters })}
          </span>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
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
    <div
      className={styles.findBar}
      role="search"
      aria-label={t("찾기와 바꾸기")}
    >
      <input
        autoFocus
        className={styles.findInput}
        placeholder={t("찾을 내용")}
        aria-label={t("찾을 내용")}
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
        label={t("이전 결과")}
        disabled={!find?.count}
        onClick={() => editor.commands.findStep(-1)}
      />
      <Tool
        icon="chevron-down"
        label={t("다음 결과")}
        disabled={!find?.count}
        onClick={() => editor.commands.findStep(1)}
      />
      <input
        className={styles.findInput}
        placeholder={t("바꿀 내용")}
        aria-label={t("바꿀 내용")}
        value={replacement}
        disabled={locked}
        onChange={(event) => setReplacement(event.target.value)}
      />
      <Button
        disabled={locked || !find?.count}
        onClick={() => editor.commands.replaceCurrent(replacement)}
      >
        {t("바꾸기")}
      </Button>
      <Button
        disabled={locked || !find?.count}
        onClick={() => editor.commands.replaceAll(replacement)}
      >
        {t("모두 바꾸기")}
      </Button>
      <span className={styles.findSpacer} />
      <Tool icon="x" label={t("찾기 닫기")} onClick={onClose} />
    </div>
  );
}
