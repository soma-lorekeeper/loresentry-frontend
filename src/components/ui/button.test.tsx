import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Button, IconButton } from "./button";

describe("Button", () => {
  it("announces processing and prevents repeat activation", () => {
    render(<Button isProcessing>저장</Button>);

    const button = screen.getByRole("button", { name: "저장" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("requires an accessible icon-button name", () => {
    render(<IconButton aria-label="메모 추가">+</IconButton>);

    expect(screen.getByRole("button", { name: "메모 추가" })).toBeEnabled();
  });
});
