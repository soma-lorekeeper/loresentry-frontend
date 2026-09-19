import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Menu } from "./menu";

function Harness({ onRename }: { onRename: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <>
      <button ref={ref} onClick={() => setOpen(true)}>
        열기
      </button>
      <Menu
        anchorRef={ref}
        open={open}
        onOpenChange={setOpen}
        label="파일 메뉴"
        entries={[
          { id: "rename", label: "이름 변경", onSelect: onRename },
          { type: "separator", id: "sep" },
          {
            id: "disabled",
            label: "비활성",
            disabled: true,
            onSelect: () => {},
          },
          { id: "trash", label: "휴지통으로 이동", onSelect: () => {} },
        ]}
      />
    </>
  );
}

describe("Menu", () => {
  it("moves focus with arrow keys and skips disabled items", async () => {
    const actor = userEvent.setup();
    render(<Harness onRename={() => {}} />);
    await actor.click(screen.getByRole("button", { name: "열기" }));
    const first = await screen.findByRole("menuitem", { name: "이름 변경" });
    await vi.waitFor(() => expect(first).toHaveFocus());
    await actor.keyboard("{ArrowDown}");
    expect(
      screen.getByRole("menuitem", { name: "휴지통으로 이동" }),
    ).toHaveFocus();
    await actor.keyboard("{Home}");
    expect(first).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const actor = userEvent.setup();
    render(<Harness onRename={() => {}} />);
    const trigger = screen.getByRole("button", { name: "열기" });
    await actor.click(trigger);
    await screen.findByRole("menu");
    await actor.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("runs the selected action and closes", async () => {
    const actor = userEvent.setup();
    const onRename = vi.fn();
    render(<Harness onRename={onRename} />);
    await actor.click(screen.getByRole("button", { name: "열기" }));
    await actor.click(
      await screen.findByRole("menuitem", { name: "이름 변경" }),
    );
    expect(onRename).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
