import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { createLayout } from "../model/layout";
import { useWorkspace, WorkspaceProvider } from "../workspace-context";
import { HelpMenu } from "./help-menu";

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

function ActiveTab() {
  const { activePane } = useWorkspace();
  return <output aria-label="활성 탭">{activePane.activeTabId}</output>;
}

function renderHelpMenu() {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return renderWithServices(
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={createLayout({ kind: "new" })}
    >
      <HelpMenu selected={false} />
      <ActiveTab />
    </WorkspaceProvider>,
  );
}

describe("HelpMenu", () => {
  it("opens the guide tab from the help menu", async () => {
    const actor = userEvent.setup();
    renderHelpMenu();
    const trigger = screen.getByRole("button", { name: "도움말" });
    expect(trigger).toHaveAttribute("aria-haspopup", "menu");

    await actor.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    const menu = await screen.findByRole("menu", { name: "도움말 메뉴" });
    await actor.click(
      within(menu).getByRole("menuitem", { name: "사용 가이드" }),
    );

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(screen.getByLabelText("활성 탭")).toHaveTextContent("help");
    expect(trigger).toHaveFocus();
  });

  it("opens the feedback dialog from the help menu", async () => {
    const actor = userEvent.setup();
    renderHelpMenu();
    await actor.click(screen.getByRole("button", { name: "도움말" }));
    const menu = await screen.findByRole("menu", { name: "도움말 메뉴" });
    await actor.click(
      within(menu).getByRole("menuitem", { name: "피드백 보내기" }),
    );

    expect(
      await screen.findByRole("dialog", { name: /피드백 보내기/ }),
    ).toBeInTheDocument();
    expect(screen.getByLabelText("활성 탭")).toHaveTextContent("new");
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const actor = userEvent.setup();
    renderHelpMenu();
    const trigger = screen.getByRole("button", { name: "도움말" });
    await actor.click(trigger);
    await screen.findByRole("menu", { name: "도움말 메뉴" });

    await actor.keyboard("{Escape}");
    await waitFor(() =>
      expect(screen.queryByRole("menu")).not.toBeInTheDocument(),
    );
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(trigger).toHaveFocus();
  });
});
