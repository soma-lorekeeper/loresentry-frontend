export type AccessibilityGuarantee =
  | "automated-audit"
  | "focus-return"
  | "focus-trap"
  | "focus-visible"
  | "keyboard-only"
  | "non-color-cue"
  | "screen-reader-status";

export interface AccessibilityCoverageEntry {
  evidence: ReadonlyArray<{
    file: string;
    testNames: readonly string[];
  }>;
  flow: string;
  guarantees: readonly AccessibilityGuarantee[];
}

export const ACCESSIBILITY_COVERAGE: readonly AccessibilityCoverageEntry[] = [
  {
    flow: "global-navigation",
    guarantees: ["automated-audit", "keyboard-only", "focus-visible"],
    evidence: [
      {
        file: "src/features/projects/components/project-list-accessibility.test.tsx",
        testNames: ["keeps the %s state free of detectable violations"],
      },
      {
        file: "src/features/workspace/components/workspace-core-flow.test.tsx",
        testNames: [
          "maps the route project and supports keyboard-first manuscript creation in ${theme}",
        ],
      },
    ],
  },
  {
    flow: "menu",
    guarantees: [
      "automated-audit",
      "keyboard-only",
      "focus-visible",
      "focus-return",
      "non-color-cue",
    ],
    evidence: [
      {
        file: "src/components/ui/menu.test.tsx",
        testNames: [
          "opens from the keyboard, skips disabled items, wraps, and restores focus",
        ],
      },
      {
        file: "src/features/projects/components/project-list.test.tsx",
        testNames: [
          "supports keyboard menu traversal and restores focus on Escape",
        ],
      },
    ],
  },
  {
    flow: "dialog",
    guarantees: [
      "automated-audit",
      "keyboard-only",
      "focus-visible",
      "focus-trap",
      "focus-return",
      "screen-reader-status",
    ],
    evidence: [
      {
        file: "src/components/ui/dialog.test.tsx",
        testNames: ["moves, traps, and restores focus"],
      },
      {
        file: "src/features/account/components/logout-dialog-accessibility.test.tsx",
        testNames: ["keeps %s structurally accessible"],
      },
      {
        file: "src/features/projects/components/project-trash.test.tsx",
        testNames: ["cycles keyboard focus within the permanent-delete dialog"],
      },
    ],
  },
  {
    flow: "form",
    guarantees: [
      "automated-audit",
      "keyboard-only",
      "focus-visible",
      "non-color-cue",
      "screen-reader-status",
    ],
    evidence: [
      {
        file: "src/app/design-system/component-fixture.test.tsx",
        testNames: [
          "has no detectable structural accessibility violations in the ${theme} theme",
        ],
      },
      {
        file: "src/features/auth/components/login-page.test.tsx",
        testNames: [
          "keeps focus context and blocks duplicate execution while processing",
        ],
      },
    ],
  },
  {
    flow: "async-status",
    guarantees: ["automated-audit", "non-color-cue", "screen-reader-status"],
    evidence: [
      {
        file: "src/components/ui/status-notice.test.tsx",
        testNames: [
          "uses an assertive alert for an error",
          "uses a polite status for non-error feedback",
        ],
      },
      {
        file: "src/features/property/components/property-document.test.tsx",
        testNames: [
          "announces changed, saving, saved, and recoverable error states",
        ],
      },
    ],
  },
  {
    flow: "destructive-action",
    guarantees: [
      "automated-audit",
      "keyboard-only",
      "focus-trap",
      "focus-return",
      "non-color-cue",
      "screen-reader-status",
    ],
    evidence: [
      {
        file: "src/features/projects/components/project-trash-accessibility.test.tsx",
        testNames: ["keeps the %s state free of detectable violations"],
      },
      {
        file: "src/features/projects/components/project-trash.test.tsx",
        testNames: [
          "explains permanent deletion, starts on cancel, and restores trigger focus",
          "blocks closing and duplicate execution while permanently deleting",
          "keeps permanent-delete context for retry after failure",
        ],
      },
    ],
  },
] as const;
