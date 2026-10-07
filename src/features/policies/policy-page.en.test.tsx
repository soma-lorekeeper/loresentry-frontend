import { screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithServices } from "@/test/render";

import { PolicyPage } from "./policy-page";

const hangul = /[가-힣]/;

describe("PolicyPage (English)", () => {
  it("shows the English terms with no Korean apart from the language switch", () => {
    renderWithServices(<PolicyPage kind="terms" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Terms of Service" }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Effective September 30, 2026"),
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Contents" })).getAllByRole(
        "link",
      ),
    ).toHaveLength(10);
    const text = document.body.textContent!.replace("한국어", "");
    expect(hangul.test(text)).toBe(false);
  });

  it("shows the English privacy policy with its tables", () => {
    renderWithServices(<PolicyPage kind="privacy" />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Privacy Policy" }),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("table")).toHaveLength(5);
    const text = document.body.textContent!.replace("한국어", "");
    expect(hangul.test(text)).toBe(false);
  });
});
