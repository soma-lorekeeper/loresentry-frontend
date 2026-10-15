import type { DocumentSession } from "./document-session";

const open = new Set<DocumentSession>();

export function trackSession(session: DocumentSession) {
  open.add(session);
  return () => {
    open.delete(session);
  };
}

export async function saveOpenDocuments() {
  await Promise.allSettled([...open].map((session) => session.save()));
}
