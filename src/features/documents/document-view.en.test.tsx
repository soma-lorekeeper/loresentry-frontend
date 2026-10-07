import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { DocumentView } from "./document-view";
import { untranslatedText } from "./untranslated.test-util";

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

function renderDocument(fileId: string) {
  return renderWithServices(
    <WorkspaceProvider
      project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={user}
      initialLayout={createLayout({ kind: "file", fileId })}
    >
      <DocumentView fileId={fileId} paneId="pane-1" active />
    </WorkspaceProvider>,
  );
}

describe("DocumentView (English build)", () => {
  it("shows the editor chrome in English", async () => {
    const { container } = renderDocument("glass-garden:ch-12");

    const toolbar = await screen.findByRole("toolbar", {
      name: "Editing tools",
    });
    for (const name of ["Undo", "Redo", "Bold", "Italic", "Find and replace"])
      expect(within(toolbar).getByRole("button", { name })).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Font: Pretendard" }),
    ).toBeInTheDocument();
    expect(within(toolbar).getByText(/^[\d,]+ characters$/)).toBeVisible();
    expect(
      within(toolbar).getByRole("button", { name: "Version history" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Title" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Add property" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Category")).toBeInTheDocument();
    expect(screen.getByText("Episode")).toBeInTheDocument();

    expect(untranslatedText(container)).toEqual([]);
  });

  it("opens find and replace, the export menu and version history in English", async () => {
    const actor = userEvent.setup();
    const { container } = renderDocument("glass-garden:c-lena");

    await actor.click(
      await screen.findByRole("button", { name: "Find and replace" }),
    );
    const search = screen.getByRole("search", { name: "Find and replace" });
    expect(
      within(search).getByRole("textbox", { name: "Find" }),
    ).toBeInTheDocument();
    expect(
      within(search).getByRole("button", { name: "Replace all" }),
    ).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Export" }));
    const menu = await screen.findByRole("menu", { name: "Export format" });
    expect(
      within(menu).getByRole("menuitem", { name: /Export as PDF/ }),
    ).toBeInTheDocument();
    await actor.keyboard("{Escape}");

    await actor.click(screen.getByRole("button", { name: "Version history" }));
    const dialog = await screen.findByRole("dialog");
    expect(
      await within(dialog).findByRole("navigation", {
        name: "Version history",
      }),
    ).toBeInTheDocument();
    expect(
      await within(dialog).findByRole("heading", { name: "Selected version" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("button", { name: "Restore this version" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByText(/^(Autosave|Saved manually)$/),
    ).not.toEqual([]);

    expect(untranslatedText(container)).toEqual([]);
    expect(untranslatedText(dialog)).toEqual([]);
  });
});
