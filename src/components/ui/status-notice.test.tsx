import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { StatusNotice } from "./status-notice";

describe("StatusNotice", () => {
  it("uses an assertive alert for an error", () => {
    render(<StatusNotice variant="error">저장하지 못했어요.</StatusNotice>);

    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
  });

  it("uses a polite status for non-error feedback", () => {
    render(<StatusNotice>저장했어요.</StatusNotice>);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");
  });
});
