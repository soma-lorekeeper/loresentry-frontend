/**
 * 웹 글꼴(Pretendard, Wanted Sans)을 언제부터 쓸지 정한다.
 *
 * <p><b>왜 미루는가.</b> 브라우저는 화면에 보이는 글자에 필요한 글꼴을 가장 먼저 받고, 스크립트는
 * 그 뒤로 미룬다. 본문이 HTML 에 들어 있으면 글꼴 스물몇 개(약 690KB)가 스크립트(약 370KB)를
 * 앞질러, 화면이 동작하기 시작하는 때가 늦어진다 — 느린 모바일에서 약 3초, 빠른 모바일에서 약 0.5초.
 * 그동안 "Google로 시작하기"는 보이지만 눌리지 않는다. 본문이 비어 있던 때에는 글꼴이 필요한
 * 글자가 없어 스크립트가 먼저 왔다. 그 순서를 지킨다.
 *
 * <p><b>어떻게.</b> `<html>` 에 `data-fonts` 가 없는 동안에는 글꼴 묶음에서 웹 글꼴 이름을 뺀 값을
 * 쓴다(app/globals.css). 브라우저는 쓰이지 않는 글꼴을 받지 않으므로 요청이 나가지 않는다.
 * 화면이 동작하기 시작하면 {@link enableWebFonts} 가 표시를 붙이고, 그때부터 글꼴을 받아 바꾼다.
 * 글꼴이 오기 전에 기기의 글꼴로 먼저 보이는 것은 예전에도 같았다(`font-display: swap`).
 *
 * <p><b>다시 온 사람은 미루지 않는다.</b> 글꼴은 한 번 받으면 브라우저에 일 년 남는다. 그런데도
 * 미루면 올 때마다 기기의 글꼴이 잠깐 보였다가 바뀐다. 그래서 다 받은 적이 있으면 기억해 두고,
 * 다음부터는 {@link createWebFontScript} 가 그리기 전에 표시를 붙인다.
 */
export const WEB_FONTS_STORAGE_KEY = "loresentry.fonts";

/** `<head>` 에서 그리기 전에 돈다. 글꼴을 받은 적이 있는 브라우저는 처음부터 웹 글꼴로 그린다. */
export function createWebFontScript() {
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(WEB_FONTS_STORAGE_KEY)})==="1"){document.documentElement.dataset.fonts="web"}}catch(e){}})();`;
}

/** 스크립트가 다 와서 화면이 동작하기 시작한 뒤에 부른다. 이때부터 웹 글꼴을 받는다. */
export function enableWebFonts() {
  const root = document.documentElement;
  // 다시 온 사람은 그리기 전에 이미 붙어 있다.
  if (root.dataset.fonts) return;
  root.dataset.fonts = "web";
  // 이 화면에 필요한 글꼴을 다 받으면 기억해 둔다. 받다가 떠나면 기억하지 않으므로, 다음에도
  // 스크립트가 먼저 온다.
  document.fonts?.addEventListener(
    "loadingdone",
    () => {
      try {
        window.localStorage.setItem(WEB_FONTS_STORAGE_KEY, "1");
      } catch {
        // 기억하지 못하는 환경(사생활 보호 모드 등)에서는 올 때마다 처음 온 것처럼 미룬다.
      }
    },
    { once: true },
  );
}
