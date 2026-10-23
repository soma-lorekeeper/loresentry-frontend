/**
 * 검토 창을 열어 달라는 요청. 창은 작업공간에 하나(RefreshWatcher)만 있고, 사이드바 단추·알림의
 * "검토하기"·편집기의 잠금 안내가 모두 이 요청으로 연다. 좁은 화면에서 사이드바가 닫혀 있어도 열린다.
 */
const REVIEW_EVENT = "loresentry:refresh-review";

export function requestRefreshReview() {
  window.dispatchEvent(new Event(REVIEW_EVENT));
}

export function onRefreshReviewRequest(handler: () => void) {
  window.addEventListener(REVIEW_EVENT, handler);
  return () => window.removeEventListener(REVIEW_EVENT, handler);
}
