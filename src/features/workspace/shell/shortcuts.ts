import { t } from "@/i18n";

/**
 * 작업공간의 단축키 표.
 *
 * <p><b>한 곳에 두는 이유.</b> 키를 알아보는 곳(use-workspace-shortcuts.ts), 메뉴 옆에 적는 곳,
 * 도움말의 단축키 목록이 같은 표를 읽는다. 따로 적으면 화면에 적힌 키와 실제로 듣는 키가
 * 어긋난다.
 *
 * <p><b>키를 고른 기준.</b>
 * <ul>
 *   <li>브라우저가 페이지에 넘기지 않는 조합은 쓸 수 없다. Cmd/Ctrl + W·T·N 은 브라우저가
 *       먼저 가져가 탭을 닫거나 연다. 그래서 탭 닫기·새 탭은 Option/Alt 조합이 기본이다.
 *       탭 닫기에는 Cmd/Ctrl+W 도 함께 걸어 둔다 — 브라우저가 넘겨 주는 환경(설치형 앱 창 등)
 *       에서는 그 키로도 닫힌다.
 *   <li>에디터(Tiptap)가 쓰는 조합(Cmd+B·I·U·Z, Cmd+Enter 등)은 피한다.
 *   <li>Mac 의 Option + 문장부호는 작가가 쓰는 글자(굽은 따옴표, 줄표, 말줄임표)를 낸다.
 *       그래서 Option 조합에는 글자 키만 쓴다.
 * </ul>
 *
 * <p><b>`code` 로 맞춘다.</b> `event.key` 는 입력기가 켜져 있으면 "ㄴ" 처럼 한글이 된다.
 * 자판의 물리 위치인 `event.code`("KeyS")로 맞춰야 한글을 쓰는 중에도 저장이 된다.
 */
export type ShortcutId =
  | "save"
  | "find"
  | "exportPdf"
  | "search"
  | "toggleSidebar"
  | "closeTab"
  | "newTab"
  | "nextTab"
  | "previousTab"
  | "placeTab"
  | "focusOtherPane";

/** 키 조합 하나. 적지 않은 보조 키는 **누르지 않아야** 맞는다 */
export interface Chord {
  /** 자판의 물리 위치(`KeyboardEvent.code`) */
  code: string;
  /** 주 보조 키. Mac 은 Command, 그 밖은 Control */
  mod?: true;
  /** 물리 Control 키. Mac 에서 Command 와 따로 쓸 때만 적는다 */
  ctrl?: true;
  alt?: true;
  shift?: true;
}

export interface Shortcut {
  id: ShortcutId;
  label: string;
  /** 같은 일을 하는 조합들. 화면에는 첫 번째만 적는다 */
  chords: Chord[];
}

export const SHORTCUTS: Shortcut[] = [
  {
    id: "save",
    label: t("단축키::지금 저장"),
    chords: [{ mod: true, code: "KeyS" }],
  },
  {
    id: "find",
    label: t("단축키::문서에서 찾기"),
    chords: [{ mod: true, code: "KeyF" }],
  },
  {
    id: "exportPdf",
    label: t("단축키::PDF로 내보내기"),
    chords: [{ mod: true, code: "KeyP" }],
  },
  {
    id: "search",
    label: t("단축키::프로젝트 검색"),
    chords: [{ mod: true, shift: true, code: "KeyF" }],
  },
  {
    id: "toggleSidebar",
    label: t("단축키::사이드바 여닫기"),
    chords: [{ mod: true, code: "Backslash" }],
  },
  {
    id: "closeTab",
    label: t("단축키::탭 닫기"),
    chords: [
      { alt: true, code: "KeyW" },
      // 브라우저가 넘겨 줄 때만 닿는다. 보통의 브라우저 탭에서는 브라우저 탭이 닫힌다.
      { mod: true, code: "KeyW" },
    ],
  },
  {
    id: "newTab",
    label: t("단축키::새 탭"),
    chords: [{ alt: true, code: "KeyT" }],
  },
  {
    id: "nextTab",
    label: t("단축키::다음 탭"),
    chords: [{ ctrl: true, shift: true, code: "BracketRight" }],
  },
  {
    id: "previousTab",
    label: t("단축키::이전 탭"),
    chords: [{ ctrl: true, shift: true, code: "BracketLeft" }],
  },
  {
    id: "placeTab",
    label: t("단축키::탭 옮기기·창 나누기"),
    chords: [{ alt: true, code: "KeyM" }],
  },
  {
    id: "focusOtherPane",
    label: t("단축키::다른 창으로 이동"),
    chords: [{ alt: true, code: "KeyP" }],
  },
];

/** 이 기기가 Command 를 주 보조 키로 쓰는가 */
export function isMac() {
  return (
    typeof navigator !== "undefined" &&
    /Mac|iPhone|iPad|iPod/.test(navigator.platform)
  );
}

type KeyLike = Pick<
  KeyboardEvent,
  "code" | "metaKey" | "ctrlKey" | "altKey" | "shiftKey"
>;

function matches(chord: Chord, event: KeyLike, mac: boolean) {
  // Mac 에서는 Command 가 주 보조 키라 Control 은 따로 센다. 그 밖에서는 둘이 같은 키다.
  const meta = mac && Boolean(chord.mod);
  const ctrl = Boolean(chord.ctrl) || (!mac && Boolean(chord.mod));
  return (
    event.code === chord.code &&
    event.metaKey === meta &&
    event.ctrlKey === ctrl &&
    event.altKey === Boolean(chord.alt) &&
    event.shiftKey === Boolean(chord.shift)
  );
}

/** 이 키 입력이 가리키는 단축키. 보조 키가 하나라도 다르면 맞지 않는다 */
export function matchShortcut(event: KeyLike, mac: boolean): ShortcutId | null {
  for (const shortcut of SHORTCUTS) {
    if (shortcut.chords.some((chord) => matches(chord, event, mac))) {
      return shortcut.id;
    }
  }
  return null;
}

const KEY_NAMES: Record<string, string> = {
  Backslash: "\\",
  BracketLeft: "[",
  BracketRight: "]",
};

function keyName(code: string) {
  return KEY_NAMES[code] ?? code.replace(/^Key/, "");
}

/** 화면에 적을 조합. Mac 은 기호를 붙여 쓰고(⌘S), 그 밖은 이름을 + 로 잇는다(Ctrl+S) */
export function formatChord(chord: Chord, mac: boolean) {
  if (mac) {
    return [
      chord.ctrl ? "⌃" : "",
      chord.alt ? "⌥" : "",
      chord.shift ? "⇧" : "",
      chord.mod ? "⌘" : "",
      keyName(chord.code),
    ].join("");
  }
  return [
    chord.mod || chord.ctrl ? "Ctrl" : "",
    chord.alt ? "Alt" : "",
    chord.shift ? "Shift" : "",
    keyName(chord.code),
  ]
    .filter(Boolean)
    .join("+");
}

/** 그 단축키를 화면에 적을 때의 글자. 조합이 여럿이면 첫 번째를 적는다 */
export function shortcutKeys(id: ShortcutId, mac = isMac()) {
  const shortcut = SHORTCUTS.find((candidate) => candidate.id === id);
  return shortcut ? formatChord(shortcut.chords[0], mac) : "";
}
