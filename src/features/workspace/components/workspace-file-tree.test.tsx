import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "./workspace-shell";

function createDataTransfer() {
  const data = new Map<string, string>();
  return {
    getData: (type: string) => data.get(type) ?? "",
    setData: (type: string, value: string) => data.set(type, value),
  };
}

function fileRegion() {
  return screen.getByRole("region", { name: "파일" });
}

describe("Workspace file tree", () => {
  it("creates files through the shared inline editor and opens the result", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "파일 메뉴" }));
    await user.click(
      within(screen.getByRole("menu", { name: "파일 메뉴" })).getByRole(
        "menuitem",
        { name: "원고" },
      ),
    );
    const input = screen.getByRole("textbox", { name: "새 항목 이름" });
    await user.clear(input);
    await user.type(input, "13화 · 돌아온 빛{Enter}");

    expect(
      within(fileRegion()).getByRole("button", { name: "13화 · 돌아온 빛" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "13화 · 돌아온 빛" }),
    ).toHaveAttribute("aria-selected", "true");
  });

  it("renames an item inline and keeps its open tab in sync", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    const files = fileRegion();
    await user.dblClick(
      within(files).getByRole("button", {
        name: "제17장 · 돌아오지 않는 밤",
      }),
    );
    const input = screen.getByRole("textbox", {
      name: "제17장 · 돌아오지 않는 밤 새 이름",
    });
    await user.clear(input);
    await user.type(input, "12화 · 새벽의 균열{Enter}");

    expect(
      screen.getByRole("tab", { name: "12화 · 새벽의 균열" }),
    ).toBeInTheDocument();
    expect(
      within(files).getByRole("button", { name: "12화 · 새벽의 균열" }),
    ).toBeInTheDocument();
  });

  it("cancels a new folder without leaving an empty item", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(screen.getByRole("button", { name: "파일 메뉴" }));
    await user.click(screen.getByRole("menuitem", { name: "새 폴더" }));
    const input = screen.getByRole("textbox", { name: "새 항목 이름" });
    await user.clear(input);
    await user.keyboard("{Escape}");

    expect(
      screen.queryByRole("textbox", { name: "새 항목 이름" }),
    ).not.toBeInTheDocument();
    expect(
      within(fileRegion()).queryByRole("button", { name: "새 폴더" }),
    ).not.toBeInTheDocument();
  });

  it("shows a non-color folder drop target and moves an item", () => {
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    const files = fileRegion();
    const source = within(files).getByRole("button", {
      name: "서윤",
    }).parentElement;
    const target = within(files).getByRole("button", {
      name: "원고",
    }).parentElement;
    const dataTransfer = createDataTransfer();

    fireEvent.dragStart(source!, { dataTransfer });
    fireEvent.dragOver(target!, { dataTransfer });
    expect(within(files).getByText("이 폴더로 이동")).toBeInTheDocument();
    fireEvent.drop(target!, { dataTransfer });

    expect(
      within(files).getByRole("button", { name: "서윤" }).parentElement,
    ).toHaveAttribute("data-parent-id", "folder-glass-manuscripts");
  });

  it("creates one favorite shortcut without moving or duplicating the source", () => {
    render(<WorkspaceShell initialProjectId="glass-garden" />);
    const files = fileRegion();
    const favorites = screen.getByRole("region", { name: "즐겨찾기" });
    const source = within(files).getByRole("button", {
      name: "제16장 · 유리 정원",
    }).parentElement;

    for (let index = 0; index < 2; index += 1) {
      const dataTransfer = createDataTransfer();
      fireEvent.dragStart(source!, { dataTransfer });
      fireEvent.dragOver(favorites, { dataTransfer });
      expect(
        within(favorites).getByText("여기에 놓아 즐겨찾기에 추가"),
      ).toBeInTheDocument();
      fireEvent.drop(favorites, { dataTransfer });
    }

    expect(
      within(files).getByRole("button", { name: "제16장 · 유리 정원" }),
    ).toBeInTheDocument();
    expect(within(favorites).getAllByText("제16장 · 유리 정원")).toHaveLength(
      1,
    );
  });

  it("moves an item to trash once and removes only its related tab and favorite", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(
      screen.getByRole("button", {
        name: "제17장 · 돌아오지 않는 밤 더보기",
      }),
    );
    await user.click(
      within(
        screen.getByRole("menu", {
          name: "제17장 · 돌아오지 않는 밤 더보기",
        }),
      ).getByRole("menuitem", { name: "휴지통으로 이동" }),
    );

    expect(
      screen.queryByRole("tab", { name: "제17장 · 돌아오지 않는 밤" }),
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "제16장 · 유리 정원" }),
    ).toBeInTheDocument();
    expect(screen.queryAllByText("제17장 · 돌아오지 않는 밤")).toHaveLength(0);
  });
});
