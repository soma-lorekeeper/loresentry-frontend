import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { untranslatedText } from "@/features/documents/untranslated.test-util";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { GraphView } from "./graph-view";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

vi.mock("./graph-canvas", () => ({ default: () => null }));

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

describe("GraphView (English build)", () => {
  it("shows the graph tools, filters and node panel in English", async () => {
    const actor = userEvent.setup();
    const { container } = renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout({ kind: "graph" })}
      >
        <GraphView />
      </WorkspaceProvider>,
    );

    const toolbar = await screen.findByRole("toolbar", { name: "Graph tools" });
    expect(
      within(toolbar).getByRole("button", { name: /^Episode\s*All/ }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Fit to screen" }),
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole("button", { name: "Zoom in" }),
    ).toBeInTheDocument();
    const legend = await screen.findByRole("list", { name: "Legend" });
    expect(within(legend).getByText("Favorites")).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "Category filter" }));
    const filter = screen.getByRole("group", { name: "Category filter" });
    expect(
      within(filter).getByRole("button", { name: "Select all" }),
    ).toBeInTheDocument();
    expect(
      within(filter).getByRole("button", { name: "Clear all" }),
    ).toBeInTheDocument();
    await actor.keyboard("{Escape}");

    await actor.click(screen.getByRole("button", { name: "Find a node" }));
    const search = screen.getByRole("combobox", {
      name: "Find a node by name",
    });
    await actor.type(search, "zzz");
    expect(screen.getByText("No matching nodes")).toBeInTheDocument();

    const lena = getDb().files.find((f) => f.id === "glass-garden:c-lena")!;
    await actor.clear(search);
    await actor.type(search, lena.title);
    await actor.keyboard("{Enter}");
    const panel = await screen.findByRole("complementary", {
      name: "Selected node",
    });
    expect(
      within(panel).getByRole("button", { name: "Clear selection" }),
    ).toBeInTheDocument();

    const chooseEpisode = async (index: number) => {
      await actor.click(
        within(toolbar).getByRole("button", { name: /^Episode/ }),
      );
      const menu = await screen.findByRole("menu", { name: "Choose episodes" });
      await actor.click(within(menu).getAllByRole("menuitemradio")[index]);
    };
    await chooseEpisode(1);
    if (screen.queryByRole("menu")) await actor.keyboard("{Escape}");
    await chooseEpisode(2);
    expect(
      within(toolbar).getByRole("button", { name: /2 selected/ }),
    ).toBeInTheDocument();

    expect(untranslatedText(container)).toEqual([]);
  });
});
