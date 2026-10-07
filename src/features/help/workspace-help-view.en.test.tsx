import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { renderWithServices } from "@/test/render";

import { WorkspaceHelpView } from "./workspace-help-view";

const HANGUL = /[가-힣]/;
const scrollIntoView = Element.prototype.scrollIntoView;

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  Element.prototype.scrollIntoView = scrollIntoView;
});

describe("WorkspaceHelpView (English build)", () => {
  it("shows the guide and a topic entirely in English", async () => {
    const actor = userEvent.setup();
    renderWithServices(<WorkspaceHelpView />);

    expect(
      screen.getByRole("heading", { level: 1, name: "User guide" }),
    ).toBeInTheDocument();
    const list = await screen.findByRole("list", { name: "Guide topics" });
    expect(within(list).getAllByRole("button")).toHaveLength(6);
    expect(document.body.textContent).not.toMatch(HANGUL);

    await actor.type(
      screen.getByRole("searchbox", { name: "Search the guide" }),
      "trash",
    );
    expect(
      within(screen.getByRole("list", { name: "Guide topics" })).getAllByRole(
        "button",
      ),
    ).toHaveLength(1);
    await actor.click(screen.getByRole("button", { name: "Clear search" }));

    await actor.click(
      within(screen.getByRole("list", { name: "Guide topics" })).getByRole(
        "button",
        { name: /Notes and timeline/ },
      ),
    );
    expect(
      await screen.findByRole("heading", {
        level: 1,
        name: "Notes and timeline",
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Last updated August 30, 2026 · 2 min read"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "On this page" }),
    ).toBeInTheDocument();
    const related = screen.getByRole("navigation", {
      name: "Related articles",
    });
    expect(
      within(related).getByRole("button", { name: "Search and graph" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "All topics" })).toBeVisible();
    expect(document.body.textContent).not.toMatch(HANGUL);
  });
});
