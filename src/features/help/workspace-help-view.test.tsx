import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithServices } from "@/test/render";

import { WorkspaceHelpView } from "./workspace-help-view";

const scrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

describe("WorkspaceHelpView", () => {
  it("dates a topic in Korean", async () => {
    const actor = userEvent.setup();
    renderWithServices(<WorkspaceHelpView />);

    const list = await screen.findByRole("list", { name: "가이드 주제" });
    await actor.click(
      within(list).getByRole("button", { name: /메모와 타임라인/ }),
    );
    expect(
      await screen.findByText("마지막 업데이트 2026년 8월 30일 · 읽는 데 2분"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "관련 문서" }),
    ).toHaveTextContent("관련 문서원고 작성검색과 그래프");
  });
});
