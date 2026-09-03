import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { AccountSettingsState } from "@/features/account/components/account-settings-dialog";
import { longAccountProfile } from "@/features/account/account-model";

import { ProjectSidebar } from "./project-sidebar";

const states: Array<
  [string, AccountSettingsState | "user-menu-open", boolean]
> = [
  ["user menu", "user-menu-open", false],
  ["default", "default", false],
  ["edited", "edited", false],
  ["validation", "validation-error", false],
  ["saving", "saving", false],
  ["saved", "saved", false],
  ["error", "error", false],
  ["long values", "default", true],
];

describe.each(["dark", "light"] as const)(
  "Project sidebar account accessibility (%s)",
  (theme) => {
    it.each(states)(
      "keeps the %s state structurally accessible",
      async (_, state, long) => {
        document.documentElement.dataset.theme = theme;
        const { container } = render(
          <ProjectSidebar
            initialAccountState={state}
            initialProfile={long ? longAccountProfile : undefined}
          />,
        );
        const results = await axe.run(container, {
          rules: { "color-contrast": { enabled: false } },
        });

        expect(
          results.violations,
          results.violations
            .map((violation) => `${violation.id}: ${violation.help}`)
            .join("\n"),
        ).toEqual([]);
      },
    );
  },
);
