import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { untranslatedText } from "@/features/documents/untranslated.test-util";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { chapterLabel } from "./timeline-rows";
import { TimelineView } from "./timeline-view";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

describe("TimelineView (English build)", () => {
  it("labels chapters as Ch. N, including stored Korean titles", () => {
    expect(chapterLabel("12화 · 균열의 밤")).toBe("Ch. 12");
    expect(chapterLabel("Ch. 3 · The Cracked Lens")).toBe("Ch. 3");
    expect(chapterLabel("프롤로그")).toBe("프롤로그");
  });

  it("shows the timeline chrome in English", async () => {
    const actor = userEvent.setup();
    const { container } = renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout({ kind: "timeline" })}
      >
        <TimelineView />
      </WorkspaceProvider>,
    );

    const toolbar = await screen.findByRole("toolbar", {
      name: "Timeline tools",
    });
    expect(
      within(toolbar).getByRole("button", { name: "Next chapter" }),
    ).toBeInTheDocument();
    const headers = screen.getAllByRole("columnheader");
    expect(headers.length).toBeGreaterThan(0);
    for (const header of headers)
      expect(header.textContent).toMatch(/^Ch\. \d+$/);
    expect(
      screen
        .getAllByRole("row")
        .some((row) =>
          / · appears in \d+ chapters?$/.test(row.getAttribute("title") ?? ""),
        ),
    ).toBe(true);

    await actor.click(screen.getByRole("button", { name: "Rows to show" }));
    await actor.type(
      screen.getByRole("textbox", { name: "Find by name" }),
      "zzz",
    );
    expect(screen.getByText("No matches")).toBeInTheDocument();
    await actor.keyboard("{Escape}");

    expect(untranslatedText(container)).toEqual([]);

    await actor.click(
      within(toolbar).getByRole("button", { name: /^Episode\s*All/ }),
    );
    await actor.click(screen.getByRole("button", { name: "Clear all" }));
    expect(
      within(toolbar).getByRole("button", { name: /^Episode\s*None/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("No chapters to show")).toBeInTheDocument();
  });
});
