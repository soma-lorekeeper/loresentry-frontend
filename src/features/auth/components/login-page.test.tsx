import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { LoginPage } from "./login-page";

describe.each(["dark", "light"] as const)("LoginPage (%s)", (theme) => {
  it("uses the same semantic structure without forcing entry focus", async () => {
    const user = userEvent.setup();
    const { container } = render(
      <LoginPage
        privacyUrl="https://policy.example/privacy"
        termsUrl="https://policy.example/terms"
        theme={theme}
      />,
    );

    expect(document.documentElement).toHaveAttribute("data-theme", theme);
    expect(screen.getByRole("main")).toContainElement(
      screen.getByRole("heading", { level: 1 }),
    );
    expect(document.body).toHaveFocus();

    await user.tab();
    expect(
      screen.getByRole("button", { name: "Google로 계속하기" }),
    ).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveFocus();
    await user.tab();
    expect(
      screen.getByRole("link", { name: "개인정보처리방침" }),
    ).toHaveFocus();

    expect(container.querySelector("input")).not.toBeInTheDocument();
    expect(
      screen.queryByText(/회원가입|비밀번호 찾기/),
    ).not.toBeInTheDocument();
  });
});
