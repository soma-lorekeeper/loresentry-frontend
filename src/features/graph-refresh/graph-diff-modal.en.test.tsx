import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { untranslatedText } from "@/features/documents/untranslated.test-util";
import { setMockLatency } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb, resetDb } from "@/services/mock/db";
import { mockRefresh } from "@/services/mock/refresh";
import { renderWithServices, routerMock } from "@/test/render";
import type { RefreshRun } from "@/domain/models";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { GraphDiffModal } from "./graph-diff-modal";

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

async function readyRun(): Promise<RefreshRun> {
  resetDb();
  setMockLatency(0);
  await mockRefresh.start(GLASS_GARDEN_ID);
  (
    getDb().refreshRuns[GLASS_GARDEN_ID] as unknown as { readyAt: number }
  ).readyAt = 0;
  return mockRefresh.current(GLASS_GARDEN_ID);
}

describe("GraphDiffModal (English build)", () => {
  it("compares current and proposed versions in English", async () => {
    const actor = userEvent.setup();
    const run = await readyRun();
    const count = run.proposals.length;
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <GraphDiffModal run={run} open onClose={() => {}} />
      </WorkspaceProvider>,
    );

    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByRole("heading", {
        name: `Changes ${count} documents`,
      }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(`${count} documents changed`),
    ).toBeInTheDocument();
    expect(within(dialog).getByText(`Changed ${count}`)).toBeInTheDocument();
    for (const name of [
      "Apply changes",
      "Use current for all",
      "Use proposed for all",
      "Reset",
    ])
      expect(within(dialog).getByRole("button", { name })).toBeInTheDocument();

    const modified = run.proposals.find((p) => p.kind === "modified")!;
    const list = within(dialog).getByRole("navigation", {
      name: "Changed documents",
    });
    await actor.click(
      within(list).getByRole("button", { name: new RegExp(modified.title) }),
    );
    expect(within(dialog).getByText("Modified")).toBeInTheDocument();
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      /^\d+ differences? left/,
    );
    expect(within(dialog).getByText("Current")).toBeInTheDocument();
    expect(within(dialog).getByText("Proposed")).toBeInTheDocument();
    expect(
      within(dialog).getByRole("textbox", { name: "Body (proposed)" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getAllByRole("button", {
        name: /: copy current into proposed$/,
      }).length,
    ).toBeGreaterThan(0);

    await actor.click(
      within(dialog).getByRole("button", { name: "Use proposed" }),
    );
    expect(within(dialog).getByRole("status")).toHaveTextContent(
      "Both versions match",
    );

    expect(untranslatedText(dialog, [run])).toEqual([]);
  });
});
