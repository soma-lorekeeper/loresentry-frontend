import { expect, it, vi } from "vitest";

import { mockAccount } from "./account";
import { clearMockRules, setMockLatency } from "./control";
import { resetDb } from "./db";

it("persists a locale before the caller can navigate away, without waiting for the DB debounce", async () => {
  vi.useFakeTimers();
  try {
    resetDb();
    clearMockRules();
    setMockLatency(0);
    await mockAccount.updateLocale("en");
    const stored = JSON.parse(localStorage.getItem("loresentry.mock.db")!);
    expect(stored.user.locale).toBe("en");
    vi.advanceTimersByTime(1000);
    expect(
      JSON.parse(localStorage.getItem("loresentry.mock.db")!).user.locale,
    ).toBe("en");
  } finally {
    vi.clearAllTimers();
    vi.useRealTimers();
  }
});
