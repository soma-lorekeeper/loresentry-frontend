import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { ProjectListPage } from "./project-list";

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "yunju@lore.kr",
  onboardingCompleted: true,
};

function withoutMockData(text: string) {
  const data = getDb().projects.flatMap((project) => [
    project.title,
    project.description ?? "",
    project.lastFile?.title ?? "",
  ]);
  return data
    .filter(Boolean)
    .sort((a, b) => b.length - a.length)
    .reduce((rest, value) => rest.split(value).join(""), text)
    .replace("한국어", "");
}

describe("ProjectListPage (English build)", () => {
  it("shows the project screen chrome in English", async () => {
    const actor = userEvent.setup();
    renderWithServices(<ProjectListPage user={user} />);

    expect(
      await screen.findByRole("heading", { level: 1, name: /Projects/ }),
    ).toBeVisible();
    await screen.findAllByRole("heading", { level: 3 });
    expect(screen.getByRole("button", { name: "New project" })).toBeVisible();
    const nav = screen.getByRole("navigation", { name: "Project navigation" });
    expect(within(nav).getByRole("link", { name: "Trash" })).toBeVisible();
    expect(
      within(nav).getByRole("button", { name: "Send feedback" }),
    ).toBeVisible();
    expect(screen.getByRole("button", { name: "한국어" })).toHaveAttribute(
      "lang",
      "ko",
    );
    expect(withoutMockData(document.body.textContent!)).not.toMatch(/[가-힣]/);

    await actor.click(screen.getByRole("button", { name: "New project" }));
    const dialog = await screen.findByRole("dialog", { name: "New project" });
    expect(
      within(dialog).getByRole("textbox", { name: "Project title" }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Create project" }),
    ).toBeDisabled();
    expect(
      within(dialog).getByRole("button", { name: "Cancel" }),
    ).toBeVisible();
    expect(dialog.textContent).not.toMatch(/[가-힣]/);
  });
});
