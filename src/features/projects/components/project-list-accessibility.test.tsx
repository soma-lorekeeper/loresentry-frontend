import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { ProjectListProps } from "./project-list";
import { ProjectList } from "./project-list";

const states: Array<[string, ProjectListProps]> = [
  ["default", {}],
  ["list error", { initialListStatus: "error" }],
  ["create", { initialCreateState: "ready" }],
  ["rename", { initialRenameState: "ready" }],
  ["trash", { initialTrashState: "confirmation" }],
];

describe("Project list accessibility", () => {
  it.each(states)(
    "keeps the %s state free of detectable violations",
    async (_, props) => {
      const { container } = render(<ProjectList {...props} />);
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
