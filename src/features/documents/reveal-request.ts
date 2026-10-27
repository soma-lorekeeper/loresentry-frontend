/**
 * 다른 화면이 문서 속 문장 하나를 짚어 달라는 요청(설정 오류 점검의 인용). 문서가 아직 열리지
 * 않았을 수 있어, 그 문서 화면이 보일 때 꺼내 간다. 오래된 요청은 버린다 — 한참 뒤에 다른 일로
 * 그 문서를 열었는데 엉뚱한 문장이 칠해지면 안 된다.
 */
const EXPIRES_MS = 15_000;

const pending = new Map<string, { text: string; at: number }>();
const listeners = new Set<(fileId: string) => void>();

export function requestReveal(fileId: string, text: string) {
  pending.set(fileId, { text, at: Date.now() });
  listeners.forEach((listener) => listener(fileId));
}

export function takeReveal(fileId: string): string | null {
  const request = pending.get(fileId);
  pending.delete(fileId);
  if (!request || Date.now() - request.at > EXPIRES_MS) return null;
  return request.text;
}

export function onRevealRequest(listener: (fileId: string) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
