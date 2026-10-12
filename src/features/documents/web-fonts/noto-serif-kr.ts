import { Noto_Serif_KR } from "next/font/google";

// 본명조(Noto Serif KR, SIL OFL). 굵기가 이어진 가변 글꼴이라 굵기를 따로 적지 않는다 — 파일 하나가
// 보통과 굵게를 함께 낸다. 받는 방식과 preload 를 끄는 이유는 nanum-gothic.ts 와 같다.
const font = Noto_Serif_KR({
  display: "swap",
  preload: false,
});

/** `font-family` 에 적을 이름. 이 파일을 불러오는 것이 곧 이 글꼴의 CSS 를 받는 일이다(editor-fonts.ts). */
export default font.style.fontFamily;
