import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { MemoEditor } from "./memo-editor";
import { useMemos } from "./queries";

function TwoEditors({ fileId }: { fileId: string | null }) {
  const scope = fileId ? "file" : "project";
  const memos = useMemos(GLASS_GARDEN_ID, scope, fileId);
  if (memos.isPending) return null;
  const memo = memos.data?.[0] ?? null;
  return (
    <>
      {["첫째", "둘째"].map((name) => (
        <MemoEditor
          key={name}
          projectId={GLASS_GARDEN_ID}
          scope={scope}
          fileId={fileId}
          memo={memo}
          label={name}
          placeholder=""
        />
      ))}
    </>
  );
}

describe("MemoEditor", () => {
  it("shows a save from another editor of the same memo", async () => {
    const actor = userEvent.setup();
    renderWithServices(<TwoEditors fileId={null} />);
    const first = await screen.findByRole("textbox", { name: "첫째" });
    await actor.type(first, " 덧붙임");
    await waitFor(
      () =>
        expect(screen.getByRole("textbox", { name: "둘째" })).toHaveValue(
          (first as HTMLTextAreaElement).value,
        ),
      { timeout: 3000 },
    );
  });

  it("creates a file memo only once when two editors start it together", async () => {
    const actor = userEvent.setup();
    const fileId = `${GLASS_GARDEN_ID}:c-harin`;
    renderWithServices(<TwoEditors fileId={fileId} />);
    const first = await screen.findByRole("textbox", { name: "첫째" });
    const second = screen.getByRole("textbox", { name: "둘째" });
    await actor.type(first, "가");
    await actor.type(second, "나");
    await waitFor(
      () =>
        expect(getDb().memos.filter((m) => m.fileId === fileId)).toHaveLength(
          1,
        ),
      { timeout: 3000 },
    );
    await new Promise((resolve) => setTimeout(resolve, 1200));
    expect(getDb().memos.filter((m) => m.fileId === fileId)).toHaveLength(1);
  });
});
