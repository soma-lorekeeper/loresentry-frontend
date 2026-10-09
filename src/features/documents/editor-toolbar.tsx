"use client";

import type { Editor } from "@tiptap/react";
import { useEditorState } from "@tiptap/react";
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  Button,
  Icon,
  Menu,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
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

type Chunk = "indent" | "lists" | "align" | "lineHeight" | "marks" | "find";

/** 도구 줄이 넘치면 이 순서로 하나씩 더보기에 접는다. 원고에서 덜 쓰는 도구가 먼저 들어간다. */
const COLLAPSE_ORDER: Chunk[] = [
  "indent",
  "lists",
  "align",
  "lineHeight",
  "marks",
  "find",
];
/** 도구를 다 접어도 넘치면 저장 상태를 아이콘으로 줄인다. */
const TIGHT_LEVEL = COLLAPSE_ORDER.length + 1;

/** 입력하는 동안 오가는 상태. 가장 긴 문구만큼 자리를 잡아 도구 줄이 들썩이지 않게 한다. */
const ROUTINE_STATUSES: Exclude<SaveStatus, "error">[] = [
  "dirty",
  "saving",
  "saved",
];

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
  const reserved = ROUTINE_STATUSES.includes(status)
    ? ROUTINE_STATUSES.filter((other) => other !== status)
    : [];
  return (
    <span className={styles.saveState} role="status" title={label}>
      <Icon
        name={icon}
        size={14}
        className={spinning ? styles.spin : undefined}
      />
      <span className={styles.saveLabel}>
        <span>{label}</span>
        {reserved.map((other) => (
          <span key={other} className={styles.saveGhost} aria-hidden="true">
            {view[other].label}
          </span>
        ))}
      </span>
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
  const controlsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  /** 단계마다 도구 줄이 차지하는 너비. 그 단계에 있을 때 잰다. */
  const trackWidthRef = useRef<number[]>([]);
  /** 저장 상태 글자를 다시 보이려면 필요한 툴바 너비. */
  const untightWidthRef = useRef(0);
  const [level, setLevel] = useState(0);
  const [scrolls, setScrolls] = useState(false);
  const [resized, onResize] = useReducer((count: number) => count + 1, 0);
  const [moreOpen, setMoreOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const controls = controlsRef.current;
    if (!root || !controls || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => onResize());
    observer.observe(root);
    observer.observe(controls);
    return () => observer.disconnect();
  }, []);

  useLayoutEffect(() => {
    const root = rootRef.current;
    const controls = controlsRef.current;
    const track = trackRef.current;
    if (!root || !controls || !track || root.clientWidth === 0) return;
    const space = controls.clientWidth;
    const needed = track.scrollWidth;
    trackWidthRef.current[level] = needed;
    if (needed > space && level < TIGHT_LEVEL) {
      if (level === TIGHT_LEVEL - 1) {
        untightWidthRef.current = root.clientWidth + needed - space;
      }
      setLevel(level + 1);
      return;
    }
    setScrolls(needed > space);
    if (level === 0) return;
    const fitsWider =
      level === TIGHT_LEVEL
        ? untightWidthRef.current <= root.clientWidth
        : (trackWidthRef.current[level - 1] ?? 0) <= space;
    if (!fitsWider) return;
    if (level === 1) setMoreOpen(false);
    setLevel(level - 1);
  }, [level, resized]);

  const collapsed = new Set(COLLAPSE_ORDER.slice(0, level));
  const shows = (chunk: Chunk) => !collapsed.has(chunk);

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

  const folded = (chunk: Chunk, entries: MenuEntry[]) =>
    shows(chunk) ? [] : entries;
  const moreEntries = [
    [
      ...folded("lineHeight", [
        { type: "group", id: "g-line", label: t("줄 간격") },
        ...lineEntries.map((entry) => ({ ...entry, id: `lh-${entry.id}` })),
      ]),
      ...folded("align", [
        { type: "group", id: "g-align", label: t("정렬") },
        ...alignEntries.map((entry) => ({ ...entry, id: `al-${entry.id}` })),
      ]),
    ],
    [
      ...folded("indent", [
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
      ]),
      ...folded("marks", [
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
      ]),
      ...folded("lists", [
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
      ]),
    ],
    folded("find", [
      {
        id: "find",
        label: t("찾기·바꾸기"),
        icon: "search",
        onSelect: () => setFindOpen(true),
      },
    ]),
  ]
    .filter((section) => section.length > 0)
    .flatMap((section, index): MenuEntry[] =>
      index === 0
        ? section
        : [{ type: "separator", id: `s${index}` }, ...section],
    );

  return (
    <>
      <div
        ref={rootRef}
        className={styles.toolbar}
        role="toolbar"
        aria-label={t("편집 도구")}
        aria-disabled={locked || undefined}
        data-tight={level === TIGHT_LEVEL || undefined}
      >
        <div
          ref={controlsRef}
          className={styles.controls}
          data-scrolls={scrolls || undefined}
        >
          <div ref={trackRef} className={styles.track}>
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
              {shows("lineHeight") && (
                <Select
                  label={t("줄 간격")}
                  value={String(prefs.lineHeight)}
                  width={64}
                  entries={lineEntries}
                />
              )}
            </div>
            {(shows("align") || shows("indent")) && (
              <>
                <span className={styles.separator} />
                <div className={styles.group}>
                  {shows("align") && (
                    <Select
                      label={t("정렬")}
                      value={
                        align.id === "left" ? t("정렬 값::정렬") : align.label
                      }
                      width={68}
                      entries={alignEntries}
                    />
                  )}
                  {shows("indent") && (
                    <>
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
                    </>
                  )}
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
              {shows("marks") && (
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
            {shows("lists") && (
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
              </>
            )}
            {shows("find") && (
              <>
                <span className={styles.separator} />
                <Tool
                  icon="search"
                  label={t("찾기·바꾸기")}
                  pressed={findOpen}
                  onClick={() => setFindOpen((open) => !open)}
                />
              </>
            )}
            {moreEntries.length > 0 && (
              <>
                <button
                  ref={moreRef}
                  type="button"
                  className={styles.labelTool}
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
            )}
          </div>
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
