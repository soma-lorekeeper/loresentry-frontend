import type { DocumentDraft } from "@/domain/models";
export interface RecoveryDraft {
  draft: DocumentDraft;
  base: DocumentDraft;
  revision: number;
  saveId?: string;
}
export interface DraftRecovery {
  load(): RecoveryDraft | null;
  save(value: RecoveryDraft): void;
  clear(): void;
}
export function draftRecovery(userId: string, fileId: string): DraftRecovery {
  const key = `loresentry.draft:${userId}:${fileId}`;
  return {
    load() {
      try {
        const value = JSON.parse(
          window.sessionStorage.getItem(key) ?? "null",
        ) as RecoveryDraft | null;
        const valid = (draft: DocumentDraft | undefined) =>
          draft &&
          typeof draft.title === "string" &&
          typeof draft.bodyMd === "string" &&
          Array.isArray(draft.properties);
        return value &&
          valid(value.draft) &&
          valid(value.base) &&
          Number.isSafeInteger(value.revision) &&
          value.revision >= 0
          ? value
          : null;
      } catch {
        return null;
      }
    },
    save(value) {
      window.sessionStorage.setItem(key, JSON.stringify(value));
    },
    clear() {
      window.sessionStorage.removeItem(key);
    },
  };
}
const sources = new Map<string, () => RecoveryDraft | null>();
export function registerDraft(key: string, read: () => RecoveryDraft | null) {
  sources.set(key, read);
  return () => {
    if (sources.get(key) === read) sources.delete(key);
  };
}
export function unsavedDrafts() {
  return [...sources].flatMap(([file, read]) => {
    const value = read();
    return value ? [{ file, ...value }] : [];
  });
}
export function downloadDrafts() {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(unsavedDrafts(), null, 2)], {
      type: "application/json",
    }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = "loresentry-unsaved.json";
  link.click();
  URL.revokeObjectURL(url);
}
