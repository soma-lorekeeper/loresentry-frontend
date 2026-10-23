// 검색창의 검색어는 SearchView 내부 상태이며 페이지 주소의 일부가 아니다.
// GA4 자동 검색 측정은 page_location 재정의와 별개로 실제 URL을 읽는다.
const SEARCH_PARAMS = new Set([
  "q",
  "s",
  "search",
  "query",
  "keyword",
  "search_term",
]);

export function withoutSearchTerms(href: string) {
  const url = new URL(href);
  let changed = false;
  for (const key of [...url.searchParams.keys()]) {
    if (!SEARCH_PARAMS.has(key.toLowerCase())) continue;
    url.searchParams.delete(key);
    changed = true;
  }
  return changed ? url.href : href;
}

let removeRedaction: (() => void) | undefined;

/** 태그를 읽기 전에 적용하고 같은 페이지의 이후 이동에도 원문을 남기지 않는다. */
export function installSearchUrlRedaction() {
  if (removeRedaction) return removeRedaction;

  const originalPush = window.history.pushState;
  const originalReplace = window.history.replaceState;
  const redactCurrent = () => {
    const clean = withoutSearchTerms(window.location.href);
    if (clean !== window.location.href) {
      window.history.replaceState(window.history.state, "", clean);
    }
  };
  const wrap = (original: History["pushState"]): History["pushState"] =>
    function (this: History, data, unused, url) {
      let target = url;
      if (url !== undefined && url !== null) {
        try {
          const resolved = new URL(url, window.location.href);
          const clean = withoutSearchTerms(resolved.href);
          if (clean !== resolved.href) target = clean;
        } catch {
          // 잘못된 주소는 원래 History API가 같은 방식으로 거절한다.
        }
      }
      return original.call(this, data, unused, target);
    };

  redactCurrent();
  const push = wrap(originalPush);
  const replace = wrap(originalReplace);
  window.history.pushState = push;
  window.history.replaceState = replace;
  window.addEventListener("popstate", redactCurrent, true);
  removeRedaction = () => {
    if (window.history.pushState === push)
      window.history.pushState = originalPush;
    if (window.history.replaceState === replace)
      window.history.replaceState = originalReplace;
    window.removeEventListener("popstate", redactCurrent, true);
    removeRedaction = undefined;
  };
  return removeRedaction;
}
