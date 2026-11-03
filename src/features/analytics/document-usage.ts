import type { DocumentType } from "@/domain/document-types";
import { elapsedSeconds, trackUsage } from "./usage-analytics";

export interface DocumentUsageObserver {
  loaded?(type: DocumentType): void;
  changed?(fields: {
    body: boolean;
    title: boolean;
    properties: boolean;
  }): void;
  saving?(): void;
  saved?(): void;
  issue?(kind: "error" | "conflict" | "locked" | "expired"): void;
  recovering?(resolution: "retry_saved" | "keep_mine_saved"): void;
  adopted?(): void;
}

/** One recorder belongs to one editor session, not to its React renders. */
export class DocumentUsageRecorder implements DocumentUsageObserver {
  private type?: DocumentType;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private lastEdit: number | null = null;
  private activeUntil = 0;
  private windowStart = performance.now();
  private flags = { body: false, title: false, properties: false };
  private attempts = 0;
  private successes = 0;
  private issues = 0;
  private activeMs = 0;
  private episode: number | null = null;
  private attempting = false;
  private resolution: "retry_saved" | "keep_mine_saved" = "retry_saved";

  loaded(type: DocumentType) {
    this.type = type;
  }
  private schedule() {
    this.timer ??= setTimeout(() => this.flush(true), 60_000);
  }
  private accrue(continueActivity = false) {
    const now = performance.now();
    if (this.lastEdit !== null)
      this.activeMs += Math.max(
        0,
        Math.min(now, this.activeUntil) - this.lastEdit,
      );
    this.lastEdit = continueActivity && now < this.activeUntil ? now : null;
  }
  changed(fields: { body: boolean; title: boolean; properties: boolean }) {
    this.accrue();
    if (
      typeof document === "undefined" ||
      document.visibilityState !== "hidden"
    ) {
      this.lastEdit = performance.now();
      this.activeUntil = this.lastEdit + 30_000;
    }
    for (const field of ["body", "title", "properties"] as const)
      this.flags[field] ||= fields[field];
    this.schedule();
  }
  saving() {
    this.attempting = true;
    this.attempts++;
    this.schedule();
  }
  saved() {
    this.attempting = false;
    this.successes++;
    if (this.episode !== null) {
      trackUsage("document_save_recovered", {
        document_type: this.type,
        resolution: this.resolution,
        duration_seconds: elapsedSeconds(this.episode),
      });
      this.episode = null;
    }
    this.resolution = "retry_saved";
    this.schedule();
  }
  issue(kind: "error" | "conflict" | "locked" | "expired") {
    if (!this.attempting) return;
    this.attempting = false;
    if (this.episode !== null) return;
    this.episode = performance.now();
    this.issues++;
    trackUsage("document_save_issue", {
      document_type: this.type,
      issue_kind: kind,
      error_category:
        kind === "expired" ? "auth" : kind === "error" ? "other" : kind,
    });
    this.schedule();
  }
  recovering(resolution: "retry_saved" | "keep_mine_saved") {
    this.resolution = resolution;
  }
  adopted() {
    if (this.episode === null) return;
    trackUsage("document_save_recovered", {
      document_type: this.type,
      resolution: "take_theirs_loaded",
      duration_seconds: elapsedSeconds(this.episode),
    });
    this.episode = null;
  }
  flush(continueActivity = false) {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;
    this.accrue(continueActivity);
    if (
      this.type &&
      (Object.values(this.flags).some(Boolean) ||
        this.attempts ||
        this.successes ||
        this.issues ||
        this.activeMs)
    ) {
      trackUsage("document_edit_summary", {
        document_type: this.type,
        body_changed: this.flags.body ? 1 : 0,
        title_changed: this.flags.title ? 1 : 0,
        properties_changed: this.flags.properties ? 1 : 0,
        save_attempt_count: this.attempts,
        save_success_count: this.successes,
        save_issue_count: this.issues,
        active_edit_seconds:
          Math.min(
            this.activeMs,
            Math.max(0, performance.now() - this.windowStart),
          ) / 1000,
      });
    }
    this.flags = { body: false, title: false, properties: false };
    this.attempts = this.successes = this.issues = this.activeMs = 0;
    this.windowStart = performance.now();
    if (this.lastEdit !== null) this.schedule();
  }
}
