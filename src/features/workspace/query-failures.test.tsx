import { screen, within, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, expect, it, vi } from "vitest";

import { setMockRule } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, setSearchParams } from "@/test/render";

import { createLayout } from "./model/layout";
import { WorkspaceSidebar } from "./sidebar/workspace-sidebar";
import { NewTabView } from "./views/new-tab-view";
import { WorkspaceProvider } from "./workspace-context";
import { WorkspacePage } from "./workspace-page";

vi.mock("./shell/workspace-shell", () => ({
  WorkspaceShell: () => <p>작업공간 내용</p>,
}));

const user = {
  id: "qa-user",
  displayName: "QA",
  email: "qa@example.test",
  onboardingCompleted: true,
};

afterEach(() => setSearchParams(""));

it("recovers a failed workspace layout load from its error screen", async () => {
  const actor = userEvent.setup();
  setSearchParams(`projectId=${GLASS_GARDEN_ID}`);
  renderWithServices(<WorkspacePage user={user} />, {
    before: () => setMockRule("workspace.load", "once"),
  });
  const alert = await screen.findByRole("alert");
  expect(alert).toHaveTextContent("작업공간 배치를 불러오지 못했어요");
  await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
  expect(await screen.findByText("작업공간 내용")).toBeInTheDocument();
});

function SidebarAndNewTab() {
  return (
    <WorkspaceProvider
      project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={user}
      initialLayout={createLayout()}
    >
      <WorkspaceSidebar />
      <NewTabView />
    </WorkspaceProvider>
  );
}

it.each(["create", "rename"] as const)(
  "preserves a failed tree %s name for retry",
  async (operation) => {
    const actor = userEvent.setup();
    renderWithServices(<SidebarAndNewTab />, {
      before: () => setMockRule(`files.${operation}`, "once"),
    });
    const files = screen.getByRole("region", { name: "파일" });
    await within(files).findByRole("tree");
    const episode = getDb().files.find(
      (n) =>
        n.projectId === GLASS_GARDEN_ID &&
        n.kind === "folder" &&
        n.role === "episode",
    )!;
    if (operation === "rename") {
      await actor.click(within(files).getByRole("treeitem", { name: "원고" }));
    }
    await actor.click(
      within(files).getByRole("button", {
        name:
          operation === "create" ? "원고 더보기" : `${episode.title} 더보기`,
      }),
    );
    await actor.click(
      screen.getByRole("menuitem", {
        name: operation === "create" ? "에피소드 추가" : "이름 변경",
      }),
    );
    let input = within(files).getByRole("textbox", { name: "이름" });
    await actor.clear(input);
    await actor.type(input, "QA 유지할 이름");
    await actor.keyboard("{Enter}");
    input = await within(files).findByRole("textbox", { name: "이름" });
    expect(input).toHaveValue("QA 유지할 이름");
    expect(getDb().files.some((n) => n.title === "QA 유지할 이름")).toBe(false);
    await actor.keyboard("{Enter}");
    await waitFor(() =>
      expect(getDb().files.some((n) => n.title === "QA 유지할 이름")).toBe(
        true,
      ),
    );
    expect(within(files).queryByRole("textbox", { name: "이름" })).toBeNull();
  },
);

it("shows a tree failure without claiming the existing project has no files", async () => {
  const actor = userEvent.setup();
  renderWithServices(<SidebarAndNewTab />, {
    before: () => setMockRule("files.tree", "once"),
  });
  const files = screen.getByRole("region", { name: "파일" });
  const alert = await within(files).findByRole("alert");
  expect(alert).toHaveTextContent("파일 목록을 불러오지 못했어요");
  expect(screen.queryByText("첫 파일을 만들어 시작하세요")).toBeNull();
  expect(
    screen.queryByText("문서의 별을 눌러 즐겨찾기에 추가하세요."),
  ).toBeNull();
  await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
  expect(
    await within(files).findByRole("tree", { name: "파일" }),
  ).toBeInTheDocument();
  expect(
    await screen.findByRole("heading", { name: "유리 정원의 기록" }),
  ).toBeInTheDocument();
});

it("shows a favorites failure and recovers the original favorites on retry", async () => {
  const actor = userEvent.setup();
  renderWithServices(<SidebarAndNewTab />, {
    before: () => setMockRule("files.favorites", "once"),
  });
  const favorites = screen.getByRole("region", { name: "즐겨찾기" });
  const alert = await within(favorites).findByRole("alert");
  expect(alert).toHaveTextContent("즐겨찾기를 불러오지 못했어요");
  expect(
    within(favorites).queryByText("문서의 별을 눌러 즐겨찾기에 추가하세요."),
  ).toBeNull();
  await actor.click(within(alert).getByRole("button", { name: "다시 시도" }));
  expect(
    await within(favorites).findByRole("button", { name: /12화/ }),
  ).toBeInTheDocument();
});
