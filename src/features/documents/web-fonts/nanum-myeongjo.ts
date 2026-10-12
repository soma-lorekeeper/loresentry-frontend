import { Nanum_Myeongjo } from "next/font/google";

// 나눔명조(SIL OFL). 받는 방식과 preload 를 끄는 이유는 nanum-gothic.ts 와 같다.
const font = Nanum_Myeongjo({
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

/** `font-family` 에 적을 이름. 이 파일을 불러오는 것이 곧 이 글꼴의 CSS 를 받는 일이다(editor-fonts.ts). */
export default font.style.fontFamily;
