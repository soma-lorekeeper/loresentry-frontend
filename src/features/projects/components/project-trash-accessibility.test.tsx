import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProjectTrashProps } from "./project-trash";
import { ProjectTrash } from "./project-trash";

const states: Array<[string, ProjectTrashProps]> = [
  ["default", {}],
  ["empty", { initialItems: [], initialListStatus: "empty" }],
  ["load error", { initialListStatus: "error" }],
  ["restore error", { initialRestoreState: "error" }],
  ["delete confirmation", { initialPermanentDeleteState: "confirmation" }],
  ["delete error", { initialPermanentDeleteState: "error" }],
  ["light", { theme: "light" }],
];

describe("Project trash accessibility", () => {
  it.each(states)(
    "keeps the %s state free of detectable violations",
    async (_, props) => {
      const { container } = render(<ProjectTrash {...props} />);
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
});
