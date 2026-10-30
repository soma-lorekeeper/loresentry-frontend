import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { StartCheckDialog } from "./start-check-dialog";

describe("StartCheckDialog", () => {
  it("starts only when the author confirms", async () => {
    const onStart = vi.fn();
    const onClose = vi.fn();
    render(
      <StartCheckDialog
        open
        title="12화 · 균열의 밤"
        runningTitle={null}
        onClose={onClose}
        onStart={onStart}
      />,
    );
    expect(screen.getByText("12화 · 균열의 밤")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onStart).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "점검 시작" }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("waits while another chapter is being checked", () => {
    render(
      <StartCheckDialog
        open
        title="12화 · 균열의 밤"
        runningTitle="13화 · 돌아온 목소리"
        onClose={() => {}}
        onStart={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: "점검 시작" })).toBeDisabled();
    expect(screen.getByRole("alert")).toHaveTextContent(
      "13화 · 돌아온 목소리 점검이 끝나면 시작할 수 있어요.",
    );
  });
});
