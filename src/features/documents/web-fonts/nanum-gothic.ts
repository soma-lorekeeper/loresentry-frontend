import { Nanum_Gothic } from "next/font/google";

// 나눔고딕(SIL OFL). next/font 가 빌드 때 글꼴 파일을 받아 우리 자산으로 함께 올리므로, 브라우저는
// Google 에 요청하지 않는다. 한글 글꼴은 수십 조각으로 나뉘어 있고 그 글자가 쓰인 조각만 받는다 —
// 미리 받을 조각을 정할 수 없어 preload 를 끈다. 굵게(700)를 함께 받아야 굵은 글씨가 뭉개지지 않는다.
const font = Nanum_Gothic({
  weight: ["400", "700"],
  display: "swap",
  preload: false,
});

/** `font-family` 에 적을 이름. 이 파일을 불러오는 것이 곧 이 글꼴의 CSS 를 받는 일이다(editor-fonts.ts). */
export default font.style.fontFamily;
