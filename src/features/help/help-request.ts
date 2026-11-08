/**
 * 다른 곳(AI 챗의 바로가기)이 사용 가이드의 특정 주제·절을 열어 달라고 부탁하는 통로.
 * 가이드 탭이 아직 없으면 탭이 열리며 꺼내 가고, 이미 열려 있으면 그 자리에서 이벤트로 받는다.
 */
const EVENT = "loresentry:help-topic";

export interface HelpRequest {
  topic: string;
  section: string | null;
}

let pending: HelpRequest | null = null;

export function requestHelpTopic(topic: string, section: string | null = null) {
  pending = { topic, section };
  if (typeof window !== "undefined") window.dispatchEvent(new Event(EVENT));
}

export function takeHelpRequest(): HelpRequest | null {
  const request = pending;
  pending = null;
  return request;
}

export function onHelpRequest(handler: (request: HelpRequest) => void) {
  const listener = () => {
    const request = takeHelpRequest();
    if (request) handler(request);
  };
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}

export function sectionAnchor(topic: string, section: string) {
  return `guide-${topic}-${section}`;
}
