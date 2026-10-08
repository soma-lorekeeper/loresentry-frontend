import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";
import { TourStage } from "@/test/tour-stage";

import { WorkspaceTour } from "./workspace-tour";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "yunju@example.com",
  onboardingCompleted: true,
};

afterEach(() => window.localStorage.clear());

describe("WorkspaceTour (English)", () => {
  it("walks the tour in English, pressing the controls on Next", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
    renderWithServices(
      <WorkspaceProvider
        project={project}
        user={user}
        initialLayout={createLayout({ kind: "new" })}
      >
        <TourStage refreshDelay={50} />
        <WorkspaceTour />
      </WorkspaceProvider>,
    );

    const first = await screen.findByRole("dialog", {
      name: "Write your chapters here",
    });
    expect(screen.getByRole("list", { name: "Step 1 of 14" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(first.textContent).not.toMatch(/[가-힣]/);

    for (const title of [
      "Link documents in the property table",
      "See your links as a graph",
      "Focus on one document",
      "Track appearances in the timeline",
      "Rows are documents, columns are chapters",
      "After you write a new chapter",
      "Changes found",
      "Changed documents are listed here",
      "Current on the left, proposed on the right",
      "Apply once everything is settled",
    ]) {
      await actor.click(screen.getByRole("button", { name: /^(Next|Done)$/ }));
      const dialog = await screen.findByRole(
        "dialog",
        { name: title },
        { timeout: 4000 },
      );
      expect(dialog.textContent).not.toMatch(/[가-힣]/);
    }
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  }, 15_000);
});
