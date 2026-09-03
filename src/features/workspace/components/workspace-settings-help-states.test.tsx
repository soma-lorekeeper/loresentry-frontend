import axe from "axe-core";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { HELP_SCREEN_STATES } from "@/features/help/help-states";
import { SETTINGS_SCREEN_STATES } from "@/features/settings/settings-states";

import { WorkspaceShell } from "./workspace-shell";

afterEach(cleanup);

const combinedStates = [
  ...SETTINGS_SCREEN_STATES.map((state) => ({
    ...state,
    feature: "settings" as const,
  })),
  ...HELP_SCREEN_STATES.map((state) => ({
    ...state,
    feature: "help" as const,
  })),
];

const accessibilityStates = combinedStates.filter((state) =>
  [
    "settings-default",
    "settings-unsaved-confirmation",
    "help-guide-topics",
    "help-guide-load-error",
  ].includes(state.id),
);

describe("workspace settings and help screen registry", () => {
  it("maps all 14 Pencil screens exactly once", () => {
    expect(combinedStates).toHaveLength(14);
    expect(combinedStates.map((state) => state.screenNumber)).toEqual([
      70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 89, 90,
    ]);
    expect(new Set(combinedStates.map((state) => state.id)).size).toBe(14);
    expect(
      new Set(combinedStates.map((state) => state.pencilNodeId)).size,
    ).toBe(14);
  });

  it.each(SETTINGS_SCREEN_STATES)(
    "renders settings screen $screenNumber ($id)",
    (state) => {
      const { container } = render(
        <WorkspaceShell
          initialProjectId="glass-garden"
          initialSettingsState={state.id}
        />,
      );

      expect(screen.getByRole("tab", { name: "설정" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(
        screen.getByRole("heading", { level: 1, name: "프로젝트 설정" }),
      ).toBeInTheDocument();
      expect(
        container.querySelector("[data-settings-status]"),
      ).toBeInTheDocument();

      if (state.mode === "unsaved-confirmation") {
        expect(
          screen.getByRole("dialog", {
            name: "변경사항을 저장하지 않고 나갈까요?",
          }),
        ).toBeVisible();
      }
      if (state.mode === "trash-confirmation") {
        expect(
          screen.getByRole("dialog", {
            name: "프로젝트를 휴지통으로 이동할까요?",
          }),
        ).toBeVisible();
      }
    },
  );

  it.each(HELP_SCREEN_STATES)(
    "renders help screen $screenNumber ($id)",
    (state) => {
      render(
        <WorkspaceShell
          initialHelpState={state.id}
          initialProjectId="glass-garden"
        />,
      );

      expect(screen.getByRole("tab", { name: "도움말" })).toHaveAttribute(
        "aria-selected",
        "true",
      );

      if (state.mode === "default") {
        expect(
          screen.getByRole("heading", { level: 1, name: "도움말" }),
        ).toBeInTheDocument();
      } else if (state.mode === "topics" || state.mode === "search-empty") {
        expect(
          screen.getByRole("searchbox", { name: "가이드 검색" }),
        ).toBeInTheDocument();
      } else if (state.mode === "article") {
        expect(
          screen.getByRole("navigation", { name: "이 문서의 목차" }),
        ).toBeInTheDocument();
      } else if (state.mode === "feedback-opened") {
        expect(screen.getByRole("status")).toHaveTextContent(
          "피드백 페이지를 새 탭에서 열었습니다",
        );
      } else {
        expect(screen.getByRole("alert")).toBeInTheDocument();
      }
    },
  );
});

describe.each(["dark", "light"] as const)(
  "workspace settings and help accessibility (%s)",
  (theme) => {
    it.each(accessibilityStates)(
      "has no detectable structural violations for screen $screenNumber",
      async (state) => {
        document.documentElement.dataset.theme = theme;
        const { container } = render(
          <WorkspaceShell
            initialHelpState={state.feature === "help" ? state.id : undefined}
            initialProjectId="glass-garden"
            initialSettingsState={
              state.feature === "settings" ? state.id : undefined
            }
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
