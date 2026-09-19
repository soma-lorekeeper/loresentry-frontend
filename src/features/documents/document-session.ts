import type { DocumentContent, DocumentDraft } from "@/domain/models";
import { isServiceError } from "@/services/errors";
import { ConflictError, type DocumentService } from "@/services/ports";

import { mergeParagraphs } from "./merge-text";

// DOCUMENT_EDITING_PROPOSAL §5.1: 0.8초 무입력 또는 첫 입력 후 5초 중 먼저 오는 쪽에 저장한다.
export const SAVE_IDLE_MS = 800;
export const SAVE_MAX_WAIT_MS = 5000;

export type SaveStatus =
  "loading" | "saved" | "dirty" | "saving" | "error" | "conflict" | "locked";

export interface DocumentSessionSnapshot {
  draft: DocumentDraft | null;
  status: SaveStatus;
  contentVersion: number;
}

export interface SaveOutcome {
  content: DocumentContent;
  titleChanged: boolean;
  relationsChanged: boolean;
}

function toDraft(content: DocumentContent): DocumentDraft {
  return {
    title: content.title,
    bodyMd: content.bodyMd,
    properties: content.properties,
  };
}

function sameDraft(a: DocumentDraft, b: DocumentDraft) {
  return (
    a.title === b.title &&
    a.bodyMd === b.bodyMd &&
    JSON.stringify(a.properties) === JSON.stringify(b.properties)
  );
}

function relationSignature(draft: DocumentDraft) {
  return JSON.stringify(
    draft.properties.flatMap((p) =>
      p.kind === "relation" ? [[p.key, [...p.targetIds].sort()]] : [],
    ),
  );
}

export class DocumentSession {
  private snapshot: DocumentSessionSnapshot = {
    draft: null,
    status: "loading",
    contentVersion: 0,
  };
  private listeners = new Set<() => void>();
  private base: DocumentDraft | null = null;
  private revision = 0;
  private inFlight: Promise<void> | null = null;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private maxTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly fileId: string,
    private readonly documents: DocumentService,
    private readonly onSaved: (outcome: SaveOutcome) => void,
    private readonly newSaveId: () => string = () => crypto.randomUUID(),
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.snapshot;

  private set(patch: Partial<DocumentSessionSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    this.listeners.forEach((listener) => listener());
  }

  private get dirty() {
    return (
      !!this.snapshot.draft &&
      !!this.base &&
      !sameDraft(this.snapshot.draft, this.base)
    );
  }

  hydrate(content: DocumentContent) {
    if (content.revisionNo < this.revision) return;
    const incoming = toDraft(content);
    if (this.snapshot.draft && sameDraft(incoming, this.snapshot.draft)) {
      this.revision = content.revisionNo;
      this.base = incoming;
      const status = content.locked
        ? "locked"
        : this.snapshot.status === "locked"
          ? "saved"
          : this.snapshot.status;
      if (status !== this.snapshot.status) this.set({ status });
      return;
    }
    if (this.dirty || this.inFlight) {
      if (content.revisionNo > this.revision)
        this.revision = content.revisionNo;
      return;
    }
    this.replace(content);
  }

  replace(content: DocumentContent) {
    this.clearTimers();
    this.revision = content.revisionNo;
    this.base = toDraft(content);
    this.set({
      draft: toDraft(content),
      status: content.locked ? "locked" : "saved",
      contentVersion: this.snapshot.contentVersion + 1,
    });
  }

  update(patch: Partial<DocumentDraft>) {
    const current = this.snapshot.draft;
    if (!current || this.snapshot.status === "locked") return;
    const draft = { ...current, ...patch };
    if (sameDraft(draft, current)) return;
    if (this.base && sameDraft(draft, this.base) && !this.inFlight) {
      this.clearTimers();
      this.set({ draft, status: "saved" });
      return;
    }
    this.set({ draft, status: this.inFlight ? "saving" : "dirty" });
    this.schedule();
  }

  private schedule() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.idleTimer = setTimeout(() => void this.save(), SAVE_IDLE_MS);
    this.maxTimer ??= setTimeout(() => void this.save(), SAVE_MAX_WAIT_MS);
  }

  private clearTimers() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.maxTimer) clearTimeout(this.maxTimer);
    this.idleTimer = null;
    this.maxTimer = null;
  }

  save(): Promise<void> {
    this.clearTimers();
    if (this.inFlight) {
      return this.inFlight.then(() => (this.dirty ? this.save() : undefined));
    }
    if (!this.dirty || !this.snapshot.draft || !this.base) {
      return Promise.resolve();
    }
    this.inFlight = this.send(this.snapshot.draft, this.base).finally(() => {
      this.inFlight = null;
    });
    return this.inFlight.then(() => {
      const settled = ["error", "conflict", "locked"].includes(
        this.snapshot.status,
      );
      return this.dirty && !settled ? this.save() : undefined;
    });
  }

  private async send(pending: DocumentDraft, saved: DocumentDraft) {
    this.set({ status: "saving" });
    try {
      const content = await this.documents.save(this.fileId, {
        draft: pending,
        ifMatchRevision: this.revision,
        saveId: this.newSaveId(),
      });
      this.revision = content.revisionNo;
      this.base = pending;
      this.onSaved({
        content,
        titleChanged: saved.title !== pending.title,
        relationsChanged:
          relationSignature(saved) !== relationSignature(pending),
      });
      this.set({ status: this.dirty ? "dirty" : "saved" });
    } catch (error) {
      if (error instanceof ConflictError) {
        this.resolveConflict(error, pending, saved);
        return;
      }
      if (isServiceError(error) && error.code === "locked") {
        this.set({ status: "locked" });
        return;
      }
      this.set({ status: "error" });
    }
  }

  private resolveConflict(
    error: ConflictError,
    pending: DocumentDraft,
    saved: DocumentDraft,
  ) {
    const theirs = toDraft(error.current);
    this.revision = error.current.revisionNo;
    const merged = mergeParagraphs(saved.bodyMd, pending.bodyMd, theirs.bodyMd);
    if (!merged.ok) {
      this.set({ status: "conflict" });
      return;
    }
    const propertiesChanged =
      JSON.stringify(pending.properties) !== JSON.stringify(saved.properties);
    this.base = theirs;
    this.set({
      draft: {
        title: pending.title !== saved.title ? pending.title : theirs.title,
        bodyMd: merged.text,
        properties: propertiesChanged ? pending.properties : theirs.properties,
      },
      status: "dirty",
      contentVersion: this.snapshot.contentVersion + 1,
    });
  }

  keepMine() {
    this.set({ status: "dirty" });
    return this.save();
  }

  async takeTheirs() {
    const fresh = await this.documents.get(this.fileId);
    this.replace(fresh);
    return fresh;
  }

  retry() {
    this.set({ status: "dirty" });
    return this.save();
  }

  dispose() {
    return this.save();
  }
}
