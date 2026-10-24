import type { DocumentSession } from "./document-session";

const open = new Set<DocumentSession>();

export function trackSession(session: DocumentSession) {
  open.add(session);
  return () => {
    open.delete(session);
  };
}

export async function saveOpenDocuments() {
  const sessions = [...open];
  const results = await Promise.allSettled(
    sessions.map((session) => session.save()),
  );
  // save()는 실패를 상태로 알린다. 완료된 Promise만으로 저장 성공을 판단하지 않는다.
  return (
    results.every((result) => result.status === "fulfilled") &&
    [...new Set([...sessions, ...open])].every(
      (session) => !session.hasUnsavedChanges,
    )
  );
}
