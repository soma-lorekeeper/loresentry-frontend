import { act, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mockAuth, resetMockTerms } from "@/services/mock/account";
import { renderWithServices, routerMock, setSearchParams } from "@/test/render";
import { LoginPage } from "./login-page";

beforeEach(() => {
  resetMockTerms();
  setSearchParams("result=terms_required");
});
afterEach(() => {
  vi.restoreAllMocks();
  setSearchParams("");
});
const submit = () => screen.getByRole("button", { name: "동의하고 계속" });
const check = () => screen.getByRole("checkbox");

describe("terms login", () => {
  it("queries terms before any session and renders literal text with required consent", async () => {
    resetMockTerms({ content: "<script>secret()</script>\n둘째 줄" });
    const session = vi.spyOn(mockAuth, "getSession");
    renderWithServices(<LoginPage />);
    expect(await screen.findByRole("dialog")).toBeVisible();
    expect(
      screen.getByRole("region", { name: "서비스 이용약관 전문" }),
    ).toHaveTextContent("<script>secret()</script>");
    expect(
      screen.getByRole("link", { name: "개인정보 처리방침" }),
    ).toHaveAttribute("href", "/policies/privacy.html");
    expect(screen.getByText(/시행일 2026년 9월 30일/)).toBeVisible();
    expect(check()).not.toBeChecked();
    expect(submit()).toBeDisabled();
    expect(session).not.toHaveBeenCalled();
    expect(routerMock.replace).not.toHaveBeenCalled();
    fireEvent.click(check());
    expect(submit()).toBeEnabled();
  });
  it("closes without completing and does not query on ordinary login", async () => {
    const accept = vi.spyOn(mockAuth, "acceptTerms");
    const query = vi.spyOn(mockAuth, "getTerms");
    const view = renderWithServices(<LoginPage />);
    await screen.findByRole("dialog");
    fireEvent.click(screen.getByRole("button", { name: "약관 닫기" }));
    expect(routerMock.replace).toHaveBeenCalledWith("/login");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(accept).not.toHaveBeenCalled();
    view.unmount();
    query.mockClear();
    setSearchParams("");
    renderWithServices(<LoginPage />);
    expect(query).not.toHaveBeenCalled();
  });
  it("ignores a query that completes after the user closes", async () => {
    const terms = await mockAuth.getTerms();
    let resolve!: (value: typeof terms) => void;
    vi.spyOn(mockAuth, "getTerms").mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    renderWithServices(<LoginPage />);
    fireEvent.click(screen.getByRole("button", { name: "닫기" }));
    await act(async () => resolve(terms));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(routerMock.replace).toHaveBeenCalledTimes(1);
  });
  it("blocks double submit and a new login while completion is pending", async () => {
    vi.spyOn(mockAuth, "getSession").mockResolvedValue({
      id: "new-user",
      displayName: "새 계정",
      email: "new@example.com",
    });
    let finish!: () => void;
    const accept = vi.spyOn(mockAuth, "acceptTerms").mockReturnValue(
      new Promise<void>((r) => {
        finish = r;
      }),
    );
    renderWithServices(<LoginPage />);
    await screen.findByRole("dialog");
    fireEvent.click(check());
    fireEvent.click(submit());
    fireEvent.click(submit());
    expect(accept).toHaveBeenCalledTimes(1);
    expect(submit()).toBeDisabled();
    expect(screen.getByRole("button", { name: "약관 닫기" })).toBeDisabled();
    await act(async () => finish());
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/projects"),
    );
  });
  it("reloads a changed original with the checkbox cleared", async () => {
    renderWithServices(<LoginPage />);
    await screen.findByRole("dialog");
    fireEvent.click(check());
    resetMockTerms({
      termsVersionId: "00000000-0000-4000-8000-000000000002",
      content: "새로운 원문",
    });
    fireEvent.click(submit());
    await screen.findByText("새로운 원문");
    expect(check()).not.toBeChecked();
    expect(submit()).toBeDisabled();
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
