import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ProjectGuide } from "./project-guide";

describe.each(["dark", "light"] as const)(
  "Project guide accessibility (%s)",
  (theme) => {
    it.each([
      ["topics", undefined],
      ["article", "workspace-start"],
    ] as const)("keeps %s structurally accessible", async (_, topicId) => {
      document.documentElement.dataset.theme = theme;
      const { container } = render(<ProjectGuide topicId={topicId} />);
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
