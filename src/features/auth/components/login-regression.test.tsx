import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LOGIN_SCREEN_STATES } from "../auth-states";
import { LoginPage } from "./login-page";

afterEach(() => cleanup());

function normalizedText(node: Element) {
  return node.textContent?.replace(/\s+/g, " ").trim() ?? "";
}

describe("login visual state regression", () => {
  it("locks the semantic signatures for all six Pencil screens", () => {
    const signatures = LOGIN_SCREEN_STATES.map((scenario) => {
      const view = render(
        <LoginPage
          initialState={scenario.loginState}
          privacyUrl="https://policy.example/privacy"
          termsUrl="https://policy.example/terms"
          theme={scenario.theme}
        />,
      );
      const signature = {
        action: normalizedText(view.getByRole("button")),
        id: scenario.id,
        notice:
          view.queryByRole("alert")?.textContent ??
          view.queryByRole("status")?.textContent ??
          null,
        pencilNodeId: scenario.pencilNodeId,
        policyLinks: view.getAllByRole("link").map(normalizedText),
        screenNumber: scenario.screenNumber,
        theme: document.documentElement.dataset.theme,
      };
      view.unmount();
      return signature;
    });

    expect(signatures).toEqual([
      {
        action: "Google로 계속하기",
        id: "login-default",
        notice: null,
        pencilNodeId: "EwUtO",
        policyLinks: ["이용약관", "개인정보처리방침"],
        screenNumber: 139,
        theme: "dark",
      },
      {
        action: "Google 로그인으로 이동 중…",
        id: "login-processing",
        notice: null,
        pencilNodeId: "F4Qlk",
        policyLinks: ["이용약관", "개인정보처리방침"],
        screenNumber: 140,
        theme: "dark",
      },
      {
        action: "다시 시도",
        id: "login-oauth-canceled",
        notice: "로그인이 취소됐어요Google 로그인이 취소됐어요.",
        pencilNodeId: "rENHC",
        policyLinks: ["이용약관", "개인정보처리방침"],
        screenNumber: 141,
        theme: "dark",
      },
      {
        action: "다시 시도",
        id: "login-oauth-failed",
        notice:
          "로그인을 완료하지 못했어요로그인을 완료하지 못했어요. 다시 시도해 주세요.",
        pencilNodeId: "vJY2I",
        policyLinks: ["이용약관", "개인정보처리방침"],
        screenNumber: 142,
        theme: "dark",
      },
      {
        action: "Google로 계속하기",
        id: "login-session-expired",
        notice:
          "세션이 만료됐어요세션이 만료됐어요. 계속하려면 다시 로그인해 주세요.",
        pencilNodeId: "y578o",
        policyLinks: ["이용약관", "개인정보처리방침"],
        screenNumber: 143,
        theme: "dark",
      },
      {
        action: "Google로 계속하기",
        id: "login-default-light",
        notice: null,
        pencilNodeId: "sSVhG",
        policyLinks: ["이용약관", "개인정보처리방침"],
        screenNumber: 144,
        theme: "light",
      },
    ]);
  });

  it("keeps excluded authentication controls out of every state", () => {
    for (const scenario of LOGIN_SCREEN_STATES) {
      const view = render(<LoginPage initialState={scenario.loginState} />);
      expect(view.container.querySelector("input")).toBeNull();
      expect(view.queryByText(/회원가입|비밀번호 찾기/)).toBeNull();
      expect(view.getAllByRole("button")).toHaveLength(1);
      view.unmount();
    }
  });
});
