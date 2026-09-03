import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { GlobalFeedback, type GlobalFeedbackState } from "./global-feedback";

describe.each(["dark", "light"] as const)(
  "Global feedback accessibility (%s)",
  (theme) => {
    it.each([
      ["idle", undefined],
      ["opened", "opened"],
      ["error", "error"],
    ] as const)("keeps %s structurally accessible", async (_, state) => {
      document.documentElement.dataset.theme = theme;
      const { container } = render(
        <GlobalFeedback
          feedbackUrl="https://feedback.example/form"
          initialState={state as GlobalFeedbackState | undefined}
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
