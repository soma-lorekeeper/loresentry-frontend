import axe from "axe-core";
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { ComponentFixture } from "./component-fixture";

const themes = ["dark", "light"] as const;

function normalizeGeneratedIds(markup: string) {
  return markup.replaceAll(/_r_[0-9]+_/g, "generated-id");
}

describe.each(themes)("ComponentFixture (%s)", (theme) => {
  it(`renders every common UI state in the ${theme} theme`, () => {
    document.documentElement.dataset.theme = theme;
    const { container } = render(<ComponentFixture />);

    expect(screen.getByRole("button", { name: "저장 중" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "사용 불가" })).toBeDisabled();
    expect(
      screen
        .getAllByRole("textbox", { name: "프로젝트 이름" })
        .find((field) => field.getAttribute("aria-invalid") === "true"),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(screen.getAllByRole("status")).toHaveLength(2);
    expect(
      `${document.documentElement.dataset.theme}:${normalizeGeneratedIds(container.innerHTML)}`,
    ).toMatchSnapshot();
  });

  it(`has no detectable structural accessibility violations in the ${theme} theme`, async () => {
    document.documentElement.dataset.theme = theme;
    const { container } = render(<ComponentFixture />);
    const results = await axe.run(container, {
      rules: {
        "color-contrast": { enabled: false },
      },
    });

    expect(
      results.violations,
      results.violations
        .map((violation) => `${violation.id}: ${violation.help}`)
        .join("\n"),
    ).toEqual([]);
  });
});
