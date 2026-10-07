import { screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { untranslatedText } from "@/features/documents/untranslated.test-util";
import { indexNodes } from "@/features/workspace/model/tree";
import { getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { VersionHistoryModal } from "./version-history-modal";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const FILE_ID = "glass-garden:c-lena";

describe("VersionHistoryModal (English build)", () => {
  it("names the server's pre-restore version in English", async () => {
    renderWithServices(<History />, {
      before: () => {
        const db = getDb();
        const latest = db.versions.find((v) => v.fileId === FILE_ID)!;
        db.versions.push({
          ...latest,
          id: "ver-before-restore",
          kind: "PRE_RESTORE",
          label: "복원 전",
          createdAt: new Date().toISOString(),
        });
      },
    });

    const dialog = await screen.findByRole("dialog");
    const list = await within(dialog).findByRole("navigation", {
      name: "Version history",
    });
    const first = within(list).getAllByRole("button")[0];
    expect(first).toHaveTextContent("Before restore");
    expect(first).toHaveTextContent("State before restore");
    expect(first).not.toHaveTextContent("복원 전");
    expect(
      within(dialog).getByRole("button", { name: "Save version" }),
    ).toBeInTheDocument();
    expect(
      within(dialog).getByRole("heading", { name: "Current document" }),
    ).toBeInTheDocument();
    expect(untranslatedText(dialog)).toEqual([]);
  });
});

function History() {
  const db = getDb();
  const version = db.versions.find((v) => v.fileId === FILE_ID)!;
  return (
    <VersionHistoryModal
      open
      fileId={FILE_ID}
      title="Lena Arbel"
      current={version.snapshot}
      locked={false}
      unsaved={false}
      index={indexNodes(db.files)}
      onClose={() => {}}
      beforeSave={async () => {}}
      currentRevision={() => 1}
      onRestored={() => {}}
    />
  );
}
