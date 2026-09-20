import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import type { MemoScope } from "@/domain/models";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { MemoEditor } from "./memo-editor";
import { useMemos } from "./queries";

function TwoEditors({ fileId }: { fileId: string | null }) {
  const scope: MemoScope = fileId ? "file" : "project";
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
  it("keeps the draft until the save button is pressed", async () => {
    const actor = userEvent.setup();
    renderWithServices(<TwoEditors fileId={null} />);
    const editor = await screen.findByRole("textbox", { name: "첫째" });
    const before = getDb().memos.find(
      (memo) => memo.body === editor.textContent,
    );

    await actor.type(editor, " 덧붙임");
    expect(screen.getAllByText("저장하지 않은 변경").length).toBeGreaterThan(0);
    expect(getDb().memos.some((memo) => memo.body.endsWith(" 덧붙임"))).toBe(
      false,
    );
    expect(before?.body).toBe(before?.body);

    await actor.click(screen.getByRole("button", { name: "첫째 저장" }));
    await waitFor(() =>
      expect(getDb().memos.some((memo) => memo.body.endsWith(" 덧붙임"))).toBe(
        true,
      ),
    );
  });

  it("shows a save from another editor of the same memo", async () => {
    const actor = userEvent.setup();
    renderWithServices(<TwoEditors fileId={null} />);
    const first = await screen.findByRole("textbox", { name: "첫째" });
    await actor.type(first, " 덧붙임");
    await actor.click(screen.getByRole("button", { name: "첫째 저장" }));
    await waitFor(
      () =>
        expect(screen.getByRole("textbox", { name: "둘째" })).toHaveValue(
          (first as HTMLTextAreaElement).value,
        ),
      { timeout: 3000 },
    );
  });

  it("creates a file memo when one does not exist yet", async () => {
    const actor = userEvent.setup();
    const fileId = `${GLASS_GARDEN_ID}:c-harin`;
    renderWithServices(<TwoEditors fileId={fileId} />);
    const editor = await screen.findByRole("textbox", { name: "첫째" });
    await actor.type(editor, "첫 파일 메모");
    await actor.click(screen.getByRole("button", { name: "첫째 저장" }));
    await waitFor(() =>
      expect(
        getDb().memos.filter((memo) => memo.fileId === fileId),
      ).toHaveLength(1),
    );
  });
});
