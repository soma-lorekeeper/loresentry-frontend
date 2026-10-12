/**
 * 이 브라우저에서 로그인한 적이 있는지의 표시.
 *
 * <p><b>왜 필요한가.</b> 랜딩의 HTML 은 빌드 때 한 장으로 만들어져, 누구에게나 로그아웃 모습이다
 * ("로그인", "Google로 시작하기"). 로그인한 사람에게는 서버가 로그인 여부를 대답한 뒤에야
 * "내 프로젝트" 로 바뀌므로, 그 사이에 틀린 버튼이 보였다가 바뀐다. 세션 쿠키는 스크립트가 읽을 수
 * 없어, 대답이 오기 전에는 로그인 여부를 알 방법이 없다.
 *
 * <p><b>어떻게 쓰는가.</b> 로그인이 확인되면 표시를 남긴다. 다음에 올 때 `<head>` 의 스크립트가
 * 화면을 그리기 전에 `<html data-session="pending">` 을 붙이고, 랜딩의 CSS 가 그동안 로그인에 따라
 * 달라지는 버튼을 숨긴다(features/landing/landing.module.css). 로그인 여부가 확인되면
 * {@link settleSessionHint} 가 속성을 지워 맞는 버튼을 드러낸다.
 *
 * <p><b>표시는 힌트일 뿐이다.</b> 값은 "1" 하나이고 로그인 증명이 아니다. 들어갈 수 있는지는 늘
 * 서버가 쿠키로 판단한다. 표시가 틀리면 버튼이 잠깐 늦게 보일 뿐이다. 처음 온 사람과 검색 로봇에게는
 * 표시가 없으므로, 버튼이 지금처럼 처음부터 보인다.
 */
export const SESSION_HINT_STORAGE_KEY = "loresentry.session";

/** `<head>` 에 넣는 스크립트. 표시가 있으면 화면을 그리기 전에 버튼을 숨길 속성을 붙인다. */
export function createSessionHintScript() {
  return `(function(){try{if(localStorage.getItem(${JSON.stringify(SESSION_HINT_STORAGE_KEY)})==="1"){document.documentElement.dataset.session="pending"}}catch(e){}})();`;
}

/**
 * 로그인 여부가 확인됐을 때 부른다. 숨겨 둔 버튼을 드러내고, 다음 방문을 위해 표시를 맞춘다.
 *
 * @param signedIn 로그인 상태면 true, 로그아웃 상태면 false. 확인하지 못했으면(네트워크 오류) null 을
 *   준다 — 버튼은 드러내되 표시는 그대로 둔다.
 */
export function settleSessionHint(signedIn: boolean | null) {
  delete document.documentElement.dataset.session;
  if (signedIn === null) return;
  try {
    if (signedIn) window.localStorage.setItem(SESSION_HINT_STORAGE_KEY, "1");
    else window.localStorage.removeItem(SESSION_HINT_STORAGE_KEY);
  } catch {
    // 저장하지 못하는 환경(사생활 보호 모드)에서는 표시 없이 지낸다. 버튼이 지금처럼 보인다.
  }
}
