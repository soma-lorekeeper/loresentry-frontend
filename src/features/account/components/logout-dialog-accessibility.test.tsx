import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { defaultAccountProfile } from "../account-model";
import { LogoutDialog, type LogoutState } from "./logout-dialog";

describe.each(["dark", "light"] as const)(
  "Logout dialog accessibility (%s)",
  (theme) => {
    it.each([
      "confirmation",
      "processing",
      "error",
      "complete",
    ] as LogoutState[])("keeps %s structurally accessible", async (state) => {
      document.documentElement.dataset.theme = theme;
      const { container } = render(
        <LogoutDialog
          initialState={state}
          onOpenChange={() => undefined}
          open
          profile={defaultAccountProfile}
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
    });
  },
);
