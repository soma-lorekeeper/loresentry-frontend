import { describe, expect, it, vi } from "vitest";

import {
  onHelpRequest,
  requestHelpTopic,
  sectionAnchor,
  takeHelpRequest,
} from "./help-request";

describe("help requests", () => {
  it("hands a pending request to whoever asks first", () => {
    requestHelpTopic("writing", "import");
    expect(takeHelpRequest()).toEqual({ topic: "writing", section: "import" });
    expect(takeHelpRequest()).toBeNull();
  });

  it("delivers to a mounted listener and stops after unsubscribing", () => {
    const handler = vi.fn();
    const stop = onHelpRequest(handler);
    requestHelpTopic("refresh");
    expect(handler).toHaveBeenCalledWith({ topic: "refresh", section: null });
    expect(takeHelpRequest()).toBeNull();
    stop();
    requestHelpTopic("start");
    expect(handler).toHaveBeenCalledTimes(1);
    expect(takeHelpRequest()).toEqual({ topic: "start", section: null });
  });

  it("builds the same anchor the guide article uses", () => {
    expect(sectionAnchor("writing", "import")).toBe("guide-writing-import");
  });
});
