import { useEffect, useSyncExternalStore } from "react";

import { t } from "@/i18n";

/**
 * 에디터에서 고를 수 있는 글꼴.
 *
 * <p>세 갈래다.
 * <ul>
 *   <li><b>기본</b> — 화면과 함께 이미 받은 글꼴(Pretendard, 고정폭).
 *   <li><b>웹 글꼴</b>(`load` 가 있는 것) — 누구에게나 같은 모양으로 보인다. 처음 고를 때 받는다.
 *   <li><b>기기 글꼴</b>(`device`) — 이름만 가리킨다. 그 기기에 깔려 있어야 그 글꼴로 보이고,
 *       없으면 `stack` 의 뒤쪽 글꼴로 보인다. 맑은 고딕·바탕·굴림·돋움은 Windows 에만 있다.
 *       이름은 영문으로 적는다 — 한글 Windows 에서도 영문 이름으로 찾아진다.
 * </ul>
 *
 * <p><b>웹 글꼴을 고를 때 받는 이유.</b> 한글 글꼴 하나의 CSS 는 조각 백여 개의 `@font-face` 다.
 * 셋을 작업공간과 함께 받으면 쓰지 않는 사람도 그만큼을 먼저 받는다. 그래서 글꼴마다 파일을 나눠
 * 두고(web-fonts/), 고른 글꼴의 파일만 그때 불러온다.
 */
interface EditorFontSpec {
  id: string;
  label: string;
  /** `font-family` 값. 웹 글꼴은 받기 전(또는 받지 못했을 때) 이 값으로 그린다 */
  stack: string;
  /** 기기에 깔린 글꼴을 이름으로 가리킨다 */
  device?: true;
  /** 웹 글꼴의 CSS 를 받아 `font-family` 에 적을 이름을 돌려준다 */
  load?: () => Promise<string>;
}

const KOREAN_SANS = '"Apple SD Gothic Neo", "Malgun Gothic", sans-serif';
const KOREAN_SERIF = '"AppleMyungjo", "Batang", serif';

const FONTS = [
  { id: "inter", label: "Pretendard", stack: "var(--lk-font-stack-ui)" },
  {
    id: "nanum-gothic",
    label: t("나눔고딕"),
    stack: `"Nanum Gothic", ${KOREAN_SANS}`,
    load: () => import("./web-fonts/nanum-gothic").then((font) => font.default),
  },
  {
    id: "nanum-myeongjo",
    label: t("나눔명조"),
    stack: `"Nanum Myeongjo", ${KOREAN_SERIF}`,
    load: () =>
      import("./web-fonts/nanum-myeongjo").then((font) => font.default),
  },
  {
    id: "noto-serif-kr",
    label: t("본명조"),
    stack: `"Noto Serif KR", "Noto Serif CJK KR", ${KOREAN_SERIF}`,
    load: () =>
      import("./web-fonts/noto-serif-kr").then((font) => font.default),
  },
  { id: "mono", label: t("고정폭"), stack: "var(--lk-font-stack-mono)" },
  {
    id: "malgun-gothic",
    label: t("맑은 고딕"),
    stack: `"Malgun Gothic", ${KOREAN_SANS}`,
    device: true,
  },
  {
    id: "batang",
    label: t("바탕"),
    stack: `"Batang", ${KOREAN_SERIF}`,
    device: true,
  },
  {
    id: "gulim",
    label: t("굴림"),
    stack: `"Gulim", ${KOREAN_SANS}`,
    device: true,
  },
  {
    id: "dotum",
    label: t("돋움"),
    stack: `"Dotum", ${KOREAN_SANS}`,
    device: true,
  },
  {
    id: "arial",
    label: "Arial",
    stack: `Arial, Helvetica, ${KOREAN_SANS}`,
    device: true,
  },
  {
    id: "times-new-roman",
    label: "Times New Roman",
    stack: `"Times New Roman", Times, ${KOREAN_SERIF}`,
    device: true,
  },
  {
    id: "georgia",
    label: "Georgia",
    stack: `Georgia, "Times New Roman", ${KOREAN_SERIF}`,
    device: true,
  },
  {
    id: "courier-new",
    label: "Courier New",
    stack: '"Courier New", Courier, monospace',
    device: true,
  },
] as const satisfies readonly EditorFontSpec[];

export type EditorFontId = (typeof FONTS)[number]["id"];
export type EditorFont = EditorFontSpec & { id: EditorFontId };

/** 메뉴에 보이는 순서 그대로다. 늘 같은 모양으로 보이는 글꼴이 앞, 기기 글꼴이 뒤다. */
export const EDITOR_FONTS: readonly EditorFont[] = FONTS;

/** 그 id 의 글꼴. 목록에 없으면 첫 번째(Pretendard)다 */
export function editorFontOf(id: string): EditorFont {
  return EDITOR_FONTS.find((font) => font.id === id) ?? EDITOR_FONTS[0];
}

/** 받아 둔 웹 글꼴의 이름. 한 번 받으면 탭을 옮겨도 다시 받지 않는다. */
const loaded = new Map<EditorFontId, string>();
const listeners = new Set<() => void>();

/**
 * 고른 글꼴의 `font-family` 값.
 *
 * <p>웹 글꼴이면 그 글꼴을 받아 오고, 오기 전에는 `stack`(기기에 같은 글꼴이 있으면 그것, 없으면
 * 비슷한 글꼴)으로 그린다. 받지 못해도(오프라인 등) 그 상태로 계속 쓸 수 있다.
 */
export function useEditorFontStack(id: EditorFontId): string {
  const font = editorFontOf(id);
  const family = useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => loaded.get(font.id),
    () => undefined,
  );

  useEffect(() => {
    if (!font.load || loaded.has(font.id)) return;
    void font
      .load()
      .then((name) => {
        loaded.set(font.id, name);
        listeners.forEach((listener) => listener());
      })
      .catch(() => {});
  }, [font]);

  return family ? `${family}, ${font.stack}` : font.stack;
}
