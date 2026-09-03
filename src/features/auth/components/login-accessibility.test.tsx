import axe from "axe-core";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LOGIN_SCREEN_STATES } from "../auth-states";
import { LoginPage } from "./login-page";

describe.each(LOGIN_SCREEN_STATES)(
  "Login accessibility ($screenNumber · $name)",
  (scenario) => {
    it("has no automated structural accessibility violations", async () => {
      document.documentElement.dataset.theme = scenario.theme;
      const { container } = render(
        <LoginPage
          initialState={scenario.loginState}
          privacyUrl="https://policy.example/privacy"
          termsUrl="https://policy.example/terms"
          theme={scenario.theme}
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
