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
  Tooltip,
  type IconName,
  type MenuEntry,
} from "@/design-system/primitives";
import { t } from "@/i18n";
import { formatNumber } from "@/shared/format";

import {
  formatChord,
  isMac,
  shortcutKeys,
  type Chord,
} from "../workspace/shell/shortcuts";
import type { SaveStatus } from "./document-session";
import { EDITOR_FONTS, editorFontOf, type EditorFont } from "./editor-fonts";
import {
  EDITOR_FONT_SIZES,
  EDITOR_LINE_HEIGHTS,
  type DocumentFormat,
} from "./document-format";
import { findStateOf } from "./editor/find-replace";
import {
  alignmentOf,
  setAlignment,
  TEXT_ALIGNMENTS,
  type TextAlignment,
} from "./editor/text-align";
import styles from "./editor-toolbar.module.css";

type Chunk =
  | "indent"
  | "lists"
  | "align"
  | "lineHeight"
  | "marks"
  | "find"
  | "history"
  | "basic";

/**
 * 도구 줄이 넘칠 때 한 단계씩 밟는 순서.
 *
 * <ol>
 *   <li>원고에서 덜 쓰는 도구부터 하나씩 더보기에 접는다. 목록과 들여쓰기가 먼저, 밑줄·취소선과
 *       찾기(단축키가 있다)가 다음, 줄 간격과 정렬이 마지막이다.
 *   <li>그래도 넘치면 `tight` — 저장 상태를 아이콘으로, 글자 수의 이름을 줄여 적는다. 도구가
 *       아니라 오른쪽 상태 칸을 줄이는 단계다.
 *   <li>그래도 넘치면(창을 둘로 나눴을 때의 폭) 되돌리기, 굵게·기울임까지 접는다.
 * </ol>
 *
 * 글꼴과 글자 크기는 끝까지 남고, 접힌 것은 모두 더보기에 있다. 더보기는 밀려나지 않는 자리에
 * 따로 두어, 얼마나 좁든 접힌 도구에 닿을 수 있다.
 */
const STEPS: Array<Chunk | "tight"> = [
  "indent",
  "lists",
  "marks",
  "find",
  "lineHeight",
  "align",
  "tight",
  "history",
  "basic",
];

/**
 * 에디터(Tiptap)가 듣는 서식 단축키. 여기서는 호버 설명에 적기만 한다 — 키를 듣는 쪽은 에디터
 * 확장이다(StarterKit 의 기본 키). 정렬의 키는 editor/text-align.ts 의 표에서 읽는다.
 */
const FORMAT_KEYS = {
  undo: { mod: true, code: "KeyZ" },
  redo: { mod: true, shift: true, code: "KeyZ" },
  bold: { mod: true, code: "KeyB" },
  italic: { mod: true, code: "KeyI" },
  underline: { mod: true, code: "KeyU" },
  strike: { mod: true, shift: true, code: "KeyS" },
  bulletList: { mod: true, shift: true, code: "Digit8" },
  orderedList: { mod: true, shift: true, code: "Digit7" },
  // 목록 안에서만 듣는다. 단추도 그때만 켜진다.
  outdent: { shift: true, code: "Tab" },
  indent: { code: "Tab" },
} satisfies Record<string, Chord>;

/** 정렬 단추의 이름과 아이콘. 순서와 키는 TEXT_ALIGNMENTS 를 따른다. */
const ALIGN_VIEW: Record<TextAlignment, { label: string; icon: IconName }> = {
  left: { label: t("왼쪽 정렬"), icon: "text-align-start" },
  center: { label: t("가운데 정렬"), icon: "text-align-center" },
  right: { label: t("오른쪽 정렬"), icon: "text-align-end" },
  justify: { label: t("양쪽 정렬"), icon: "text-align-justify" },
};

/** 입력하는 동안 오가는 상태. 가장 긴 문구만큼 자리를 잡아 도구 줄이 들썩이지 않게 한다. */
const ROUTINE_STATUSES: Exclude<SaveStatus, "error" | "expired">[] = [
  "dirty",
  "saving",
  "saved",
];

interface ToolbarProps {
  editor: Editor | null;
  format: DocumentFormat;
  onFormat: (patch: Partial<DocumentFormat>) => void;
  status: SaveStatus;
  locked: boolean;
  onRetry: () => void;
  /**
   * 찾기 막대가 열려 있는가. 단축키(문서에서 찾기)로도 열어야 해서 문서 화면이 쥐고 있다 —
   * 도구 막대는 에디터가 준비되면 새로 만들어지므로 여기 두면 그때 닫혀 버린다.
   */
  findOpen: boolean;
  onFindOpenChange: (open: boolean) => void;
  /** 오른쪽 끝에 붙는 파일 도구(메모·버전·내보내기·잠금). */
  actions?: ReactNode;
}

/** 아이콘 단추 하나. 이름은 호버 설명으로 보이고, 단축키가 있으면 곁들인다. */
function Tool({
  icon,
  label,
  shortcut,
  pressed,
  disabled,
  onClick,
}: {
  icon: IconName;
  label: string;
  /** 호버 설명에 적을 단축키 표기(예: ⌘B) */
  shortcut?: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.tool}
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        onMouseDown={(event) => event.preventDefault()}
        onClick={onClick}
      >
        <Icon name={icon} size={15} />
      </button>
      <Tooltip anchorRef={ref} label={label} shortcut={shortcut} />
    </>
  );
}

/**
 * 값 하나를 목록에서 고르는 단추(글꼴, 글자 크기, 줄 간격).
 *
 * <p>폭은 고정이다. 값이 길어도 단추가 늘어나 옆 도구를 밀지 않고, 넘치는 글자는 말줄임한다 —
 * 잘린 이름은 호버 설명에서 다 읽을 수 있다.
 */
function Select({
  label,
  value,
  width,
  entries,
  icon,
  indicator = "chevron-down",
  menuWidth = 160,
  menuClassName,
}: {
  label: string;
  value: string;
  width: number;
  entries: MenuEntry[];
  /** 값 앞에 두는 아이콘. 숫자만으로는 무엇의 값인지 알 수 없을 때 쓴다 */
  icon?: IconName;
  /** 값 뒤의 "고를 수 있다" 표시 */
  indicator?: IconName;
  menuWidth?: number;
  menuClassName?: string;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const name = `${label}: ${value}`;
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.select}
        style={{ width }}
        aria-label={name}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => setOpen((current) => !current)}
      >
        {icon && <Icon name={icon} size={15} />}
        <span>{value}</span>
        <Icon name={indicator} size={13} />
      </button>
      <Tooltip anchorRef={ref} label={name} />
      <Menu
        anchorRef={ref}
        open={open}
        onOpenChange={setOpen}
        label={label}
        width={menuWidth}
        className={menuClassName}
        entries={entries}
      />
    </>
  );
}

function SaveState({
  status,
  tight,
  onRetry,
}: {
  status: SaveStatus;
  /** 도구 줄이 좁아 문구를 숨기고 아이콘만 보이는가. 그때는 문구를 호버 설명으로 보인다 */
  tight: boolean;
  onRetry: () => void;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  if (status === "error" || status === "expired") {
    return (
      <span className={styles.saveError} role="alert">
        <Icon name="cloud-off" size={15} />
        {status === "expired"
          ? t("다시 로그인해 주세요")
          : t("저장하지 못했어요")}
        <button type="button" className={styles.retry} onClick={onRetry}>
          {status === "expired" ? t("다시 저장") : t("다시 시도")}
        </button>
      </span>
    );
  }
  const view: Record<
    Exclude<SaveStatus, "error" | "expired">,
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
    <>
      <span ref={ref} className={styles.saveState} role="status">
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
      {tight && <Tooltip anchorRef={ref} label={label} />}
    </>
  );
}

/**
 * 글자 수. 공백을 넣어 센 것과 뺀 것을 함께 적는다 — 분량을 재는 기준이 곳마다 달라 둘 다 쓴다.
 * 도구 줄이 좁으면 이름을 줄여 적고(CSS 가 `data-short` 를 대신 보인다), 풀어 쓴 문장은 호버
 * 설명으로 보인다.
 */
function Counts({
  withSpaces,
  withoutSpaces,
  tight,
}: {
  withSpaces: number;
  withoutSpaces: number;
  tight: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const included = formatNumber(withSpaces);
  const excluded = formatNumber(withoutSpaces);
  return (
    <>
      <span ref={ref} className={styles.counts}>
        {/*
          이름은 두 벌이다. 온전한 이름이 읽히는 이름이고, 줄인 이름은 좁은 도구 줄에서 눈에만
          보인다(aria-hidden) — 둘 다 읽히면 "공백 포함 포함" 이 된다.
        */}
        <span className={styles.countLabel}>
          <span className={styles.countFull}>{t("공백 포함")}</span>
          <span className={styles.countShort} aria-hidden="true">
            {t("글자 수 줄임::포함")}
          </span>
        </span>
        <span className={styles.countValue}>
          {t("글자 수 줄임::{count}자", { count: included })}
        </span>
        <span className={styles.countLabel}>
          <span className={styles.countFull}>{t("공백 제외")}</span>
          <span className={styles.countShort} aria-hidden="true">
            {t("글자 수 줄임::제외")}
          </span>
        </span>
        <span className={styles.countValue}>
          {t("글자 수 줄임::{count}자", { count: excluded })}
        </span>
      </span>
      {tight && (
        <Tooltip
          anchorRef={ref}
          label={t("공백 포함 {withSpaces}자 · 공백 제외 {withoutSpaces}자", {
            withSpaces: included,
            withoutSpaces: excluded,
          })}
        />
      )}
    </>
  );
}

export function EditorToolbar({
  editor,
  format,
  onFormat,
  status,
  locked,
  onRetry,
  findOpen,
  onFindOpenChange,
  actions,
}: ToolbarProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const moreRef = useRef<HTMLButtonElement>(null);
  const fillRef = useRef<HTMLSpanElement>(null);
  /** 단계마다 도구 줄이 차지하는 너비. 그 단계에 있을 때 잰다. */
  const trackWidthRef = useRef<number[]>([]);
  /** 저장 상태 글자를 다시 보이려면 필요한 툴바 너비. */
  const untightWidthRef = useRef(0);
  const [level, setLevel] = useState(0);
  const [scrolls, setScrolls] = useState(false);
  const [resized, onResize] = useReducer((count: number) => count + 1, 0);
  const [moreOpen, setMoreOpen] = useState(false);

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
    // 도구 줄이 쓸 수 있는 폭. 지금 차지한 폭에, 뒤에 남아 있는 빈 폭을 더한 것이다.
    const space = controls.clientWidth + (fillRef.current?.clientWidth ?? 0);
    const needed = track.scrollWidth;
    trackWidthRef.current[level] = needed;
    if (needed > space && level < STEPS.length) {
      // tight 는 도구 줄이 아니라 상태 칸의 폭을 바꾼다. 되돌아갈 때는 도구 줄의 폭으로 견줄 수
      // 없어, 그 단계로 들어가기 직전에 "툴바가 이만큼이면 넘치지 않는다" 를 적어 둔다.
      if (STEPS[level] === "tight") {
        untightWidthRef.current = root.clientWidth + needed - space;
      }
      setLevel(level + 1);
      return;
    }
    setScrolls(needed > space);
    if (level === 0) return;
    const fitsWider =
      STEPS[level - 1] === "tight"
        ? untightWidthRef.current <= root.clientWidth
        : (trackWidthRef.current[level - 1] ?? 0) <= space;
    if (!fitsWider) return;
    if (level === 1) setMoreOpen(false);
    setLevel(level - 1);
  }, [level, resized]);

  const applied = new Set(STEPS.slice(0, level));
  const shows = (chunk: Chunk) => !applied.has(chunk);

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
        align: alignmentOf(current.state),
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

  const tight = applied.has("tight");
  const mac = isMac();
  const keys = (chord: Chord) => formatChord(chord, mac);
  const font = editorFontOf(format.font);
  /** 고른 글이 없으면 문서 전체, 있으면 그 문단들만 정렬한다(editor/text-align.ts). */
  const align = (alignment: TextAlignment) => {
    if (editor) setAlignment(editor, alignment);
  };

  const fontEntry = (f: EditorFont): MenuEntry => ({
    id: f.id,
    label: f.label,
    checked: f.id === format.font,
    onSelect: () => onFormat({ font: f.id }),
  });
  // 누구에게나 같은 모양으로 보이는 글꼴이 앞, 기기에 깔려 있어야 보이는 글꼴이 뒤다.
  const fontEntries: MenuEntry[] = [
    ...EDITOR_FONTS.filter((f) => !f.device).map(fontEntry),
    { type: "separator", id: "s-device" },
    { type: "group", id: "g-device", label: t("기기에 설치된 글꼴") },
    ...EDITOR_FONTS.filter((f) => f.device).map(fontEntry),
  ];
  const sizeEntries: MenuEntry[] = EDITOR_FONT_SIZES.map((size) => ({
    id: String(size),
    label: `${size}pt`,
    checked: size === format.fontSize,
    onSelect: () => onFormat({ fontSize: size }),
  }));
  const lineEntries: MenuEntry[] = EDITOR_LINE_HEIGHTS.map((height) => ({
    id: String(height),
    label: String(height),
    checked: height === format.lineHeight,
    onSelect: () => onFormat({ lineHeight: height }),
  }));
  const alignEntries: MenuEntry[] = TEXT_ALIGNMENTS.map(({ id }) => ({
    id: `al-${id}`,
    label: ALIGN_VIEW[id].label,
    icon: ALIGN_VIEW[id].icon,
    checked: state?.align === id,
    onSelect: () => align(id),
  }));

  const folded = (chunk: Chunk, entries: MenuEntry[]) =>
    shows(chunk) ? [] : entries;
  const moreEntries = [
    folded("history", [
      {
        id: "undo",
        label: t("되돌리기"),
        icon: "undo-2",
        disabled: !state?.canUndo,
        onSelect: () => run((c) => c.undo()),
      },
      {
        id: "redo",
        label: t("다시 실행"),
        icon: "redo-2",
        disabled: !state?.canRedo,
        onSelect: () => run((c) => c.redo()),
      },
    ]),
    [
      ...folded("lineHeight", [
        { type: "group", id: "g-line", label: t("줄 간격") },
        ...lineEntries.map((entry) => ({ ...entry, id: `lh-${entry.id}` })),
      ]),
      ...folded("align", [
        { type: "group", id: "g-align", label: t("정렬") },
        ...alignEntries,
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
      ...folded("basic", [
        {
          id: "bold",
          label: t("굵게"),
          icon: "bold",
          checked: state?.bold,
          onSelect: () => run((c) => c.toggleBold()),
        },
        {
          id: "italic",
          label: t("기울임"),
          icon: "italic",
          checked: state?.italic,
          onSelect: () => run((c) => c.toggleItalic()),
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
        onSelect: () => onFindOpenChange(true),
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
        data-tight={tight || undefined}
      >
        <div
          ref={controlsRef}
          className={styles.controls}
          data-scrolls={scrolls || undefined}
        >
          <div ref={trackRef} className={styles.track}>
            {shows("history") && (
              <>
                <div className={styles.group}>
                  <Tool
                    icon="undo-2"
                    label={t("되돌리기")}
                    shortcut={keys(FORMAT_KEYS.undo)}
                    disabled={!state?.canUndo}
                    onClick={() => run((c) => c.undo())}
                  />
                  <Tool
                    icon="redo-2"
                    label={t("다시 실행")}
                    shortcut={keys(FORMAT_KEYS.redo)}
                    disabled={!state?.canRedo}
                    onClick={() => run((c) => c.redo())}
                  />
                </div>
                <span className={styles.separator} />
              </>
            )}
            <div className={styles.group}>
              <Select
                label={t("글꼴")}
                value={font.label}
                width={104}
                menuWidth={232}
                menuClassName={styles.longMenu}
                entries={fontEntries}
              />
              <Select
                label={t("글자 크기")}
                value={`${format.fontSize}pt`}
                width={80}
                entries={sizeEntries}
              />
              {shows("lineHeight") && (
                <Select
                  label={t("줄 간격")}
                  value={String(format.lineHeight)}
                  width={84}
                  icon="list-chevrons-up-down"
                  indicator="chevrons-up-down"
                  entries={lineEntries}
                />
              )}
            </div>
            {shows("align") && (
              <>
                <span className={styles.separator} />
                <div
                  className={styles.group}
                  role="group"
                  aria-label={t("정렬")}
                >
                  {TEXT_ALIGNMENTS.map(({ id, key }) => (
                    <Tool
                      key={id}
                      icon={ALIGN_VIEW[id].icon}
                      label={ALIGN_VIEW[id].label}
                      shortcut={keys({
                        mod: true,
                        shift: true,
                        code: `Key${key.toUpperCase()}`,
                      })}
                      pressed={state?.align === id}
                      onClick={() => align(id)}
                    />
                  ))}
                </div>
              </>
            )}
            {shows("indent") && (
              <>
                <span className={styles.separator} />
                <div className={styles.group}>
                  <Tool
                    icon="list-indent-decrease"
                    label={t("내어쓰기")}
                    shortcut={keys(FORMAT_KEYS.outdent)}
                    disabled={!state?.canLift}
                    onClick={() => run((c) => c.liftListItem("listItem"))}
                  />
                  <Tool
                    icon="list-indent-increase"
                    label={t("들여쓰기")}
                    shortcut={keys(FORMAT_KEYS.indent)}
                    disabled={!state?.canSink}
                    onClick={() => run((c) => c.sinkListItem("listItem"))}
                  />
                </div>
              </>
            )}
            {shows("basic") && (
              <>
                <span className={styles.separator} />
                <div className={styles.group}>
                  <Tool
                    icon="bold"
                    label={t("굵게")}
                    shortcut={keys(FORMAT_KEYS.bold)}
                    pressed={state?.bold}
                    onClick={() => run((c) => c.toggleBold())}
                  />
                  <Tool
                    icon="italic"
                    label={t("기울임")}
                    shortcut={keys(FORMAT_KEYS.italic)}
                    pressed={state?.italic}
                    onClick={() => run((c) => c.toggleItalic())}
                  />
                  {shows("marks") && (
                    <>
                      <Tool
                        icon="underline"
                        label={t("밑줄")}
                        shortcut={keys(FORMAT_KEYS.underline)}
                        pressed={state?.underline}
                        onClick={() => run((c) => c.toggleUnderline())}
                      />
                      <Tool
                        icon="strikethrough"
                        label={t("취소선")}
                        shortcut={keys(FORMAT_KEYS.strike)}
                        pressed={state?.strike}
                        onClick={() => run((c) => c.toggleStrike())}
                      />
                    </>
                  )}
                </div>
              </>
            )}
            {shows("lists") && (
              <>
                <span className={styles.separator} />
                <div className={styles.group}>
                  <Tool
                    icon="list"
                    label={t("글머리 목록")}
                    shortcut={keys(FORMAT_KEYS.bulletList)}
                    pressed={state?.bulletList}
                    onClick={() => run((c) => c.toggleBulletList())}
                  />
                  <Tool
                    icon="list-ordered"
                    label={t("번호 목록")}
                    shortcut={keys(FORMAT_KEYS.orderedList)}
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
                  shortcut={shortcutKeys("find", mac)}
                  pressed={findOpen}
                  onClick={() => onFindOpenChange(!findOpen)}
                />
              </>
            )}
          </div>
        </div>
        {/* 더보기는 밀려나는 도구 줄 밖에 둔다. 접힌 도구는 여기로만 닿을 수 있다. */}
        {moreEntries.length > 0 && (
          <>
            <button
              ref={moreRef}
              type="button"
              className={styles.tool}
              aria-label={t("더보기")}
              aria-haspopup="menu"
              aria-expanded={moreOpen}
              onClick={() => setMoreOpen((open) => !open)}
            >
              <Icon name="ellipsis" size={15} />
            </button>
            <Tooltip anchorRef={moreRef} label={t("더보기")} />
            <Menu
              anchorRef={moreRef}
              open={moreOpen}
              onOpenChange={setMoreOpen}
              label={t("더보기")}
              width={200}
              className={styles.longMenu}
              entries={moreEntries}
            />
          </>
        )}
        <span ref={fillRef} className={styles.fill} />
        <div className={styles.status}>
          <SaveState status={status} tight={tight} onRetry={onRetry} />
          <Counts
            withSpaces={state?.withSpaces ?? 0}
            withoutSpaces={state?.withoutSpaces ?? 0}
            tight={tight}
          />
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {findOpen && editor && (
        <FindBar
          editor={editor}
          locked={locked}
          onClose={() => onFindOpenChange(false)}
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

  useEffect(() => {
    // 점검 결과에서 짚어 둔 문장이 칠해져 있을 수 있다. 찾기 막대는 빈 검색어로 시작한다.
    editor.commands.setFindQuery("");
    return () => void editor.commands.setFindQuery("");
  }, [editor]);

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
