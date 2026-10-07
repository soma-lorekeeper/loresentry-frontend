import { screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { renderWithServices } from "@/test/render";

import { LandingPage } from "./landing-page";

beforeAll(() => {
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

function chromeText() {
  const copy = document.body.cloneNode(true) as HTMLElement;
  // 창 안의 장면(목업 작업공간)과 문서 종류 이름은 다른 영역의 데이터라 따로 번역된다.
  copy
    .querySelectorAll(
      'figure > [aria-hidden="true"], ul[aria-label="Document kinds"], button[lang="ko"]',
    )
    .forEach((node) => node.remove());
  return copy.textContent ?? "";
}

describe("LandingPage (English build)", () => {
  it("shows the landing copy in English", async () => {
    renderWithServices(<LandingPage />);

    expect(
      await screen.findAllByRole("button", { name: "Start with Google" }),
    ).toHaveLength(2);
    expect(
      screen.getByRole("button", { name: "Get started" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /AI guards your lore/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /When you're writing/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("We're still building this")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Log in" })).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Privacy policy" }),
    ).toBeInTheDocument();
    expect(chromeText()).not.toMatch(/[가-힣]/);
  });

  it("offers Korean in the header as one quiet word", async () => {
    renderWithServices(<LandingPage />);

    const header = (await screen.findByRole("banner")) as HTMLElement;
    const toKorean = screen.getByRole("button", { name: "한국어" });
    expect(header).toContainElement(toKorean);
    expect(toKorean).toHaveAttribute("lang", "ko");
  });
});
