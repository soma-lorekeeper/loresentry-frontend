import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { ShutdownNotice } from "./shutdown-notice";

beforeEach(() => {
  window.sessionStorage.clear();
});

describe("ShutdownNotice", () => {
  it("announces the closing date, the export path and the request address", async () => {
    render(<ShutdownNotice contactEmail="contact@loresentry.com" />);

    expect(
      await screen.findByRole("heading", { name: "서비스 종료 안내" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/2026년 11월 29일에 서비스를 종료/)).toBeVisible();
    expect(screen.getByText(/'내보내기'/)).toBeVisible();
    expect(
      screen.getByText(/2026년 12월 29일까지는.*contact@loresentry\.com/),
    ).toBeVisible();
  });

  it("stays closed for the rest of the tab session once confirmed", async () => {
    const actor = userEvent.setup();
    const first = render(<ShutdownNotice contactEmail="" />);
    await actor.click(await screen.findByRole("button", { name: "확인" }));
    expect(
      screen.queryByRole("heading", { name: "서비스 종료 안내" }),
    ).toBeNull();
    first.unmount();

    render(<ShutdownNotice contactEmail="" />);
    expect(
      screen.queryByRole("heading", { name: "서비스 종료 안내" }),
    ).toBeNull();
  });
});
