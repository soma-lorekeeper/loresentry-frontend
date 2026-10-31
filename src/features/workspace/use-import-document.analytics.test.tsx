import { renderHook } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";

import { useImportDocument } from "./use-import-document";

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  get: vi.fn(),
  save: vi.fn(),
}));
vi.mock("@/features/analytics/onboarding-analytics", () => ({
  useOnboardingAnalytics: () => mocks.track,
}));
vi.mock("@/services/services-context", () => ({
  useServices: () => ({ documents: { get: mocks.get, save: mocks.save } }),
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.get.mockResolvedValue({ title: "test", properties: [], revisionNo: 1 });
  mocks.save.mockResolvedValue({});
});

it("tracks imported manuscripts only after a successful save", async () => {
  const { result } = renderHook(() => useImportDocument("project"));
  const file = { name: "test.txt", text: async () => "content" } as File;
  await result.current.fill("file", file);
  expect(mocks.track).toHaveBeenCalledExactlyOnceWith("manuscript_saved");

  mocks.track.mockClear();
  mocks.save.mockRejectedValueOnce(new Error("save failed"));
  await expect(result.current.fill("file", file)).rejects.toThrow(
    "save failed",
  );
  expect(mocks.track).not.toHaveBeenCalled();
});
