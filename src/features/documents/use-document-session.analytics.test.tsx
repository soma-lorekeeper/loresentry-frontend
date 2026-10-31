import { renderHook } from "@testing-library/react";
import { expect, it, vi } from "vitest";

import { useDocumentSession } from "./use-document-session";

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  saved: undefined as undefined | ((outcome: unknown) => void),
}));
vi.mock("@/features/analytics/onboarding-analytics", () => ({
  useOnboardingAnalytics: () => mocks.track,
}));
vi.mock("@/services/services-context", () => ({
  useServices: () => ({ documents: {} }),
}));
vi.mock("@tanstack/react-query", () => ({
  useQuery: () => ({}),
  useQueryClient: () => ({ setQueryData: vi.fn(), invalidateQueries: vi.fn() }),
}));
vi.mock("./open-sessions", () => ({ trackSession: () => () => {} }));
vi.mock("./document-session", () => ({
  DocumentSession: class {
    constructor(
      _id: string,
      _documents: unknown,
      saved: (outcome: unknown) => void,
    ) {
      mocks.saved = saved;
    }
    subscribe() {
      return () => {};
    }
    getSnapshot() {
      return null;
    }
    dispose() {}
  },
}));

it("tracks successful editor saves only for manuscripts", () => {
  mocks.track.mockClear();
  renderHook(() => useDocumentSession("file"));
  mocks.saved?.({
    content: { docType: "character", projectId: "p" },
    titleChanged: false,
    relationsChanged: false,
  });
  expect(mocks.track).not.toHaveBeenCalled();
  mocks.saved?.({
    content: { docType: "manuscript", projectId: "p" },
    titleChanged: false,
    relationsChanged: false,
  });
  expect(mocks.track).toHaveBeenCalledExactlyOnceWith("manuscript_saved");
});
