import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

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
  it("walks the four steps in English", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
    renderWithServices(
      <WorkspaceProvider
        project={project}
        user={user}
        initialLayout={createLayout({ kind: "new" })}
      >
        {["editor", "properties", "refresh", "timeline"].map((name) => (
          <div key={name} data-tour={name} />
        ))}
        <WorkspaceTour />
      </WorkspaceProvider>,
    );

    const first = await screen.findByRole("dialog", {
      name: "Write your chapters here",
    });
    expect(screen.getByRole("list", { name: "Step 1 of 4" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(first.textContent).not.toMatch(/[가-힣]/);

    for (const title of [
      "Link documents in the property table",
      "After you write a new chapter",
      "Track appearances in the timeline",
    ]) {
      await actor.click(screen.getByRole("button", { name: "Next" }));
      const dialog = await screen.findByRole("dialog", { name: title });
      expect(dialog.textContent).not.toMatch(/[가-힣]/);
    }
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "Done" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
