export type RegressionGuarantee =
  | "duplicate-prevention"
  | "error"
  | "focus-return"
  | "input-retention"
  | "processing"
  | "recovery"
  | "success";

export interface RegressionCoverageEntry {
  evidence: ReadonlyArray<{
    file: string;
    testNames: readonly string[];
  }>;
  feature: string;
  guarantees: readonly RegressionGuarantee[];
}

export const INTERACTION_REGRESSION_COVERAGE: readonly RegressionCoverageEntry[] =
  [
    {
      feature: "file",
      guarantees: [
        "success",
        "recovery",
        "duplicate-prevention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/workspace/components/workspace-file-tree.test.tsx",
          testNames: [
            "creates files through the shared inline editor and opens the result",
            "cancels a new folder without leaving an empty item",
            "creates one favorite shortcut without moving or duplicating the source",
            "moves an item to trash once and removes only its related tab and favorite",
          ],
        },
      ],
    },
    {
      feature: "tab",
      guarantees: ["success", "input-retention", "focus-return"],
      evidence: [
        {
          file: "src/features/workspace/components/workspace-tabs.test.tsx",
          testNames: [
            "closes tabs and preserves a non-closable new-tab context",
            "keeps file actions in context and returns focus after closing the memo",
            "restores the manuscript caret after tab and memo round trips",
          ],
        },
      ],
    },
    {
      feature: "memo",
      guarantees: [
        "success",
        "processing",
        "error",
        "recovery",
        "duplicate-prevention",
        "input-retention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/memo/components/project-memos.test.tsx",
          testNames: [
            "queues the latest edit while one save request is in flight",
            "keeps failed input and retries the same latest memo",
            "keeps a memo when deletion is disconnected and restores menu focus",
            "removes a confirmed memo and focuses the next card",
          ],
        },
      ],
    },
    {
      feature: "property",
      guarantees: [
        "success",
        "processing",
        "error",
        "recovery",
        "input-retention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/property/components/property-document.test.tsx",
          testNames: [
            "supports arrow navigation and returns focus on Escape",
            "announces changed, saving, saved, and recoverable error states",
            "does not report a successful save without a backend adapter",
            "preserves edits through a failed save and retries the backend adapter",
          ],
        },
      ],
    },
    {
      feature: "timeline",
      guarantees: [
        "success",
        "processing",
        "error",
        "recovery",
        "input-retention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/timeline/components/event-timeline.test.tsx",
          testNames: [
            "does not report a save when the backend adapter is disconnected",
            "preserves failed input and retries the same timeline item",
            "selects and edits an existing item, then restores focus on Escape",
            "deletes only after backend confirmation and focuses the next item",
          ],
        },
      ],
    },
    {
      feature: "project",
      guarantees: [
        "success",
        "processing",
        "error",
        "recovery",
        "duplicate-prevention",
        "input-retention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/projects/components/project-list.test.tsx",
          testNames: [
            "blocks duplicate project entry while the access adapter is pending",
            "preserves the rename draft and dialog after a backend failure",
            "keeps trash context and supports retry after a backend failure",
          ],
        },
        {
          file: "src/features/projects/components/project-trash.test.tsx",
          testNames: [
            "blocks closing and duplicate execution while permanently deleting",
            "keeps permanent-delete context for retry after failure",
            "removes a permanently deleted project and focuses the next row",
          ],
        },
      ],
    },
    {
      feature: "account",
      guarantees: [
        "success",
        "processing",
        "error",
        "recovery",
        "duplicate-prevention",
        "input-retention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/projects/components/project-sidebar.test.tsx",
          testNames: [
            "validates, trims, persists, and updates the visible profile",
            "preserves edited values and exposes retry after backend failure",
            "returns focus to logout in the reopened user menu after cancel",
          ],
        },
        {
          file: "src/features/account/components/logout-dialog.test.tsx",
          testNames: [
            "blocks duplicate actions and navigates only after adapter success",
            "keeps the current account and offers retry after failure",
          ],
        },
      ],
    },
    {
      feature: "auth",
      guarantees: [
        "success",
        "processing",
        "error",
        "recovery",
        "duplicate-prevention",
        "focus-return",
      ],
      evidence: [
        {
          file: "src/features/auth/components/login-page.test.tsx",
          testNames: [
            "keeps focus context and blocks duplicate execution while processing",
            "reports a missing or failed backend adapter without pretending to authenticate",
            "navigates ordinary success to the project list",
            "returns an expired session only to a server-verified internal workspace",
          ],
        },
      ],
    },
  ] as const;
