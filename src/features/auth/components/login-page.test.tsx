import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

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

describe("Google authentication action", () => {
  it("keeps focus context and blocks duplicate execution while processing", async () => {
    const user = userEvent.setup();
    const startGoogleOAuth = vi.fn(() => new Promise<never>(() => undefined));
    render(
      <LoginPage
        privacyUrl="https://policy.example/privacy"
        startGoogleOAuth={startGoogleOAuth}
        termsUrl="https://policy.example/terms"
      />,
    );

    const action = screen.getByRole("button", {
      name: "Google로 계속하기",
    });
    await user.click(action);

    expect(startGoogleOAuth).toHaveBeenCalledOnce();
    expect(action).toHaveFocus();
    expect(action).toHaveAttribute("aria-disabled", "true");
    expect(action).toHaveAttribute("aria-busy", "true");
    expect(action).toHaveTextContent("Google 로그인으로 이동 중…");

    await user.click(action);
    expect(startGoogleOAuth).toHaveBeenCalledOnce();
    expect(screen.getByRole("link", { name: "이용약관" })).toHaveAttribute(
      "href",
      "https://policy.example/terms",
    );
    expect(
      screen.getByRole("link", { name: "개인정보처리방침" }),
    ).toHaveAttribute("href", "https://policy.example/privacy");
  });
});

describe("authentication outcomes", () => {
  it.each([
    ["canceled", "status", "Google 로그인이 취소됐어요."],
    ["failed", "alert", "로그인을 완료하지 못했어요."],
  ] as const)(
    "announces %s and returns focus to its title",
    async (outcome, role, copy) => {
      const user = userEvent.setup();
      render(
        <LoginPage
          startGoogleOAuth={vi.fn().mockResolvedValue({ status: outcome })}
        />,
      );

      await user.click(
        screen.getByRole("button", { name: "Google로 계속하기" }),
      );

      const notice = await screen.findByRole(role);
      expect(notice).toHaveTextContent(copy);
      expect(screen.getByRole("button", { name: "다시 시도" })).toBeEnabled();
      expect(screen.getByRole("heading", { level: 2 })).toHaveFocus();
    },
  );

  it("reports a missing or failed backend adapter without pretending to authenticate", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<LoginPage onNavigate={onNavigate} />);

    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(onNavigate).not.toHaveBeenCalled();
  });

  it("does not report success without a navigation handoff", async () => {
    const user = userEvent.setup();
    render(
      <LoginPage
        startGoogleOAuth={vi.fn().mockResolvedValue({ status: "success" })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
  });

  it("navigates ordinary success to the project list", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <LoginPage
        onNavigate={onNavigate}
        startGoogleOAuth={vi.fn().mockResolvedValue({
          status: "success",
          verifiedReturnPath: "/workspace?projectId=glass-garden",
        })}
      />,
    );

    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));
    expect(onNavigate).toHaveBeenCalledWith("/projects");
  });

  it("returns an expired session only to a server-verified internal workspace", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(
      <LoginPage
        initialState="session-expired"
        onNavigate={onNavigate}
        startGoogleOAuth={vi.fn().mockResolvedValue({
          status: "success",
          verifiedReturnPath: "/workspace?projectId=glass-garden",
        })}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("세션이 만료됐어요.");
    expect(document.body).toHaveFocus();
    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));
    expect(onNavigate).toHaveBeenCalledWith(
      "/workspace?projectId=glass-garden",
    );
  });
});
