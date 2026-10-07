import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeAll, describe, expect, it, vi } from "vitest";

import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { FileTrashView } from "@/features/file-trash/file-trash-view";
import { MemoPanel } from "@/features/memos/memo-panel";
import { MemoView } from "@/features/memos/memo-view";
import { ProjectSettingsView } from "@/features/project-settings/project-settings-view";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { pathOf } from "@/services/mock/tree";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout, type WorkspaceTarget } from "./model/layout";
import { WorkspaceShell } from "./shell/workspace-shell";
import { WorkspaceProvider } from "./workspace-context";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
vi.mock("@/features/projects/user-menu", () => ({ UserMenu: () => null }));
vi.mock("@/features/tour/workspace-tour", () => ({
  WorkspaceTour: () => null,
}));

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

beforeAll(() => {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
});

function Harness({
  target,
  children,
}: {
  target: WorkspaceTarget;
  children: ReactNode;
}) {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return (
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={createLayout(target)}
    >
      {children}
    </WorkspaceProvider>
  );
}

function renderIn(target: WorkspaceTarget, view: ReactNode) {
  return renderWithServices(<Harness target={target}>{view}</Harness>);
}

function untranslatedChrome() {
  const db = getDb();
  const data = [
    ...db.projects.flatMap((project) => [project.title, project.description]),
    ...db.files.map((node) => node.title),
    ...db.files.flatMap((node) => pathOf(db, node)),
    ...db.memos.flatMap((memo) => [memo.title, memo.body]),
    ...Object.values(DOCUMENT_TYPE_META).flatMap((meta) => [
      meta.label,
      meta.relationLabel,
    ]),
  ]
    .map((text) => text.trim())
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const texts: string[] = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) texts.push(walker.currentNode.textContent ?? "");
  document.body.querySelectorAll("*").forEach((element) => {
    for (const name of ["aria-label", "placeholder", "title"]) {
      const value = element.getAttribute(name);
      if (value) texts.push(value);
    }
  });
  return texts
    .map((text) => data.reduce((rest, item) => rest.split(item).join(""), text))
    .filter((text) => /[가-힣]/.test(text));
}

describe("workspace (English build)", () => {
  it("shows the shell, sidebar and new tab in English", async () => {
    const actor = userEvent.setup();
    renderIn({ kind: "new" }, <WorkspaceShell />);

    expect(
      await screen.findByRole("heading", { level: 2, name: "Create new" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("tablist", { name: "Open tabs" })).toBeVisible();
    expect(screen.getByRole("tab", { name: /New tab/ })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Close sidebar" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Recently opened" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Import" })).toBeInTheDocument();

    const nav = screen.getByRole("navigation", { name: "Workspace" });
    for (const label of [
      "Graph",
      "Timeline",
      "Notes",
      "Trash",
      "Settings",
      "Help",
    ]) {
      expect(
        within(nav).getByRole("button", { name: label }),
      ).toBeInTheDocument();
    }
    expect(
      await within(nav).findByRole("button", { name: "Graph refresh" }),
    ).toBeInTheDocument();
    expect(
      within(nav).getByRole("region", { name: "Favorites" }),
    ).toBeInTheDocument();
    expect(within(nav).getByRole("tree", { name: "Files" })).toBeVisible();
    expect(
      within(nav).getByRole("button", { name: /^Switch project, current: / }),
    ).toBeInTheDocument();
    expect(untranslatedChrome()).toEqual([]);

    const characters = document.querySelector<HTMLElement>(
      `[data-node-id="${GLASS_GARDEN_ID}:folder:character"]`,
    )!;
    await actor.click(
      within(characters).getByRole("button", { name: /^More actions for / }),
    );
    expect(
      await screen.findByRole("menuitem", { name: "Add character" }),
    ).toBeInTheDocument();

    await actor.click(within(nav).getByRole("button", { name: "Help" }));
    for (const label of ["User guide", "Tour the workspace", "Send feedback"]) {
      expect(screen.getByRole("menuitem", { name: label })).toBeInTheDocument();
    }
    expect(untranslatedChrome()).toEqual([]);
  });

  it("shows the notes view and panel in English", async () => {
    const actor = userEvent.setup();
    const character = getDb().files.find(
      (node) => node.kind === "document" && node.docType === "character",
    )!;
    renderIn(
      { kind: "memo" },
      <>
        <MemoView />
        <MemoPanel
          projectId={GLASS_GARDEN_ID}
          fileId={character.id}
          fileTitle={character.title}
          docType="character"
          dock="right"
          size={320}
          onResize={() => {}}
          onDock={() => {}}
          onClose={() => {}}
        />
      </>,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: "Notes" }),
    ).toBeInTheDocument();
    const scope = screen.getByRole("radiogroup", { name: "Notes scope" });
    expect(
      within(scope).getByRole("radio", { name: "Document notes" }),
    ).toBeInTheDocument();

    const panel = screen.getByRole("complementary", { name: "Notes" });
    expect(
      within(panel).getByRole("radio", { name: "Character notes" }),
    ).toBeInTheDocument();
    expect(within(panel).getByRole("radio", { name: "Right" })).toBeVisible();
    expect(
      within(panel).getByRole("button", { name: "Add character note" }),
    ).toBeInTheDocument();
    expect(
      within(panel).getByRole("button", { name: "Close notes" }),
    ).toBeInTheDocument();

    await actor.click(
      within(scope).getByRole("radio", { name: "Story notes" }),
    );
    expect(
      await screen.findByRole("button", { name: "Add note" }),
    ).toBeInTheDocument();
    expect(
      (await screen.findAllByRole("button", { name: "Note menu" })).length,
    ).toBeGreaterThan(0);
    expect(untranslatedChrome()).toEqual([]);
  });

  it("shows the trash in English", async () => {
    const actor = userEvent.setup();
    renderIn({ kind: "trash" }, <FileTrashView />);

    expect(await screen.findByText("3 items")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: /Trash/ }),
    ).toBeInTheDocument();
    const list = screen.getByRole("list", { name: "Deleted items" });
    expect(
      within(list).getAllByRole("button", { name: "Restore" }).length,
    ).toBe(3);
    expect(untranslatedChrome()).toEqual([]);

    await actor.click(
      within(list).getAllByRole("button", { name: "Delete permanently" })[0],
    );
    const dialog = await screen.findByRole("dialog");
    expect(
      within(dialog).getByText("Delete this item permanently?"),
    ).toBeInTheDocument();
    expect(untranslatedChrome()).toEqual([]);
  });

  it("shows project settings in English", async () => {
    renderIn(
      { kind: "settings" },
      <ProjectSettingsView
        paneId="pane-1"
        tab={{ id: "settings", target: { kind: "settings" } }}
        active
      />,
    );

    expect(
      await screen.findByRole("textbox", { name: /Project name/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 1, name: "Project settings" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "General" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Danger zone" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Move" })).toBeInTheDocument();
    expect(untranslatedChrome()).toEqual([]);
  });
});
