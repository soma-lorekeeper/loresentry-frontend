export type ChatView = { kind: "home" } | { kind: "session"; id: string };

export function selectionTarget(open: boolean, view: ChatView) {
  return open && view.kind === "session" ? view.id : null;
}
