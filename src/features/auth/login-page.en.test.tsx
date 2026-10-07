import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { renderWithServices } from "@/test/render";

import { LoginPage } from "./login-page";

describe("LoginPage (English build)", () => {
  it("shows its chrome in English with a way back to Korean", async () => {
    renderWithServices(<LoginPage />);

    expect(
      await screen.findByRole("heading", { name: "Log in" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Terms of Service" }),
    ).toBeVisible();
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toBeVisible();
    expect(
      screen.getByRole("link", { name: "About Lore Sentry" }),
    ).toBeVisible();

    const korean = screen.getByRole("button", { name: "한국어" });
    expect(korean).toHaveAttribute("lang", "ko");
    const chrome = document.body.textContent!.replace("한국어", "");
    expect(chrome).not.toMatch(/[가-힣]/);
  });
});
