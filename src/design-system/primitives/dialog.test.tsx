import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { Modal } from "./dialog";

describe("Modal Escape isolation", () => {
  it.each([true, false])(
    "keeps Escape inside a dialog (dismissible=%s)",
    (dismissible) => {
      const parentClose = vi.fn(),
        dialogClose = vi.fn();
      render(
        <aside
          onKeyDown={(e) => {
            if (e.key === "Escape") parentClose();
          }}
        >
          <Modal
            open
            label="삭제 확인"
            dismissible={dismissible}
            onClose={dialogClose}
          >
            <button>삭제</button>
          </Modal>
        </aside>,
      );
      fireEvent.keyDown(screen.getByRole("button"), { key: "Escape" });
      expect(parentClose).not.toHaveBeenCalled();
      expect(screen.getByRole("dialog")).toBeVisible();
      fireEvent(
        screen.getByRole("dialog"),
        new Event("cancel", { cancelable: true }),
      );
      expect(dialogClose).toHaveBeenCalledTimes(dismissible ? 1 : 0);
    },
  );
});
