import { useRef, useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { Button } from "./button";
import { Dialog, DialogActions } from "./dialog";

function TestDialog() {
  const [open, setOpen] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <Button onClick={() => setOpen(true)}>삭제 열기</Button>
      <Dialog
        description="삭제한 항목은 복원할 수 없습니다."
        initialFocusRef={cancelRef}
        onOpenChange={setOpen}
        open={open}
        title="영구 삭제할까요?"
      >
        <DialogActions>
          <Button onClick={() => setOpen(false)} ref={cancelRef}>
            취소
          </Button>
          <Button variant="primary">영구 삭제</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("moves, traps, and restores focus", async () => {
    const user = userEvent.setup();
    render(<TestDialog />);
    const trigger = screen.getByRole("button", { name: "삭제 열기" });

    await user.click(trigger);
    const dialog = screen.getByRole("dialog", { name: "영구 삭제할까요?" });
    const cancel = screen.getByRole("button", { name: "취소" });
    const confirm = screen.getByRole("button", { name: "영구 삭제" });
    await waitFor(() => expect(cancel).toHaveFocus());

    confirm.focus();
    fireEvent.keyDown(confirm, { key: "Tab" });
    expect(cancel).toHaveFocus();

    await user.click(cancel);
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(dialog).not.toHaveAttribute("open");
  });
});
