import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../model/layout";
import { WorkspaceProvider } from "../workspace-context";
import { WorkspaceSidebar } from "./workspace-sidebar";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

describe("file tree locks", () => {
  it("marks locked documents and says when a refresh lock lifts", async () => {
    const actor = userEvent.setup();
    renderWithServices(
      <WorkspaceProvider
        project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
        user={user}
        initialLayout={createLayout()}
      >
        <WorkspaceSidebar />
      </WorkspaceProvider>,
      {
        before: () => {
          for (const node of getDb().files) {
            if (node.kind !== "document") continue;
            // 하린은 그래프 최신화가, 테오는 작가가 잠갔다.
            if (node.id === `${GLASS_GARDEN_ID}:c-harin`)
              node.refreshLocked = true;
            if (node.id === `${GLASS_GARDEN_ID}:c-teo`) node.locked = true;
          }
        },
      },
    );

    const tree = await screen.findByRole("tree", { name: "파일" });
    await actor.click(within(tree).getByRole("treeitem", { name: /캐릭터/ }));

    expect(
      await within(tree).findByRole("img", {
        name: "설정 문서 최신화로 잠김",
      }),
    ).toBeInTheDocument();
    expect(within(tree).getByRole("img", { name: "잠김" })).toBeInTheDocument();
  });
});
