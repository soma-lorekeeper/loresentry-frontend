import { fireEvent, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { ImportDialog } from "./import-dialog";
import { createLayout } from "./model/layout";
import { WorkspaceProvider } from "./workspace-context";

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

function Harness() {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return (
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={createLayout({ kind: "new" })}
    >
      <ImportDialog onClose={() => {}} />
    </WorkspaceProvider>
  );
}

function file(name: string) {
  return new File(["text"], name, { type: "text/plain", lastModified: 1 });
}

describe("ImportDialog in English", () => {
  it("names the dialog, the list and the guidance in English", async () => {
    renderWithServices(<Harness />);
    const dialog = await screen.findByRole("dialog", {
      name: "Import manuscripts",
    });
    expect(
      within(dialog).getByRole("button", { name: "Choose files" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "They're created as new manuscripts in the Manuscripts folder.",
      ),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByText(
        "Files you add wait here and become manuscripts only when you press Import.",
      ),
    ).toBeInTheDocument();

    // 수에 따라 낱말이 달라진다(file / files).
    const dataTransfer = {
      types: ["Files"],
      files: [file("Chapter 1.md"), file("Chapter 2.txt"), file("cover.png")],
    };
    fireEvent.dragEnter(window, { dataTransfer });
    fireEvent.drop(window, { dataTransfer });

    const rows = within(
      within(dialog).getByRole("list", { name: "Files to import" }),
    ).getAllByRole("listitem");
    expect(rows[0]).toHaveTextContent("Chapter 1");
    expect(rows[0]).toHaveTextContent("Markdown");
    expect(rows[1]).toHaveTextContent("Text");
    expect(within(dialog).getByText("2 files")).toBeInTheDocument();
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "‘cover.png’ wasn't added. Only .txt and .md files can be added.",
    );
    expect(
      within(dialog).getByRole("button", { name: "Remove Chapter 1" }),
    ).toBeInTheDocument();
    // 다른 화면의 한글이 섞여 들어오지 않았다.
    expect(dialog.textContent).not.toMatch(/[가-힣]/);
  });
});
