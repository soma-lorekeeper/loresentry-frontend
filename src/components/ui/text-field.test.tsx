import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TextField } from "./text-field";

describe("TextField", () => {
  it("associates its label, required state, and error message", () => {
    render(
      <TextField
        error="프로젝트 이름을 입력해 주세요."
        id="project-name"
        label="프로젝트 이름"
        required
      />,
    );

    const input = screen.getByRole("textbox", { name: "프로젝트 이름" });
    expect(input).toBeRequired();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("프로젝트 이름을 입력해 주세요.");
  });
});
