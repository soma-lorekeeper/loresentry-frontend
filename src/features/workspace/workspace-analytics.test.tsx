import { render, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, expect, it, vi } from "vitest";

import { WorkspacePage } from "./workspace-page";

const mocks = vi.hoisted(() => ({
  track: vi.fn(),
  project: vi.fn(),
  layout: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("projectId=p1"),
}));
vi.mock("@tanstack/react-query", () => ({ useQuery: () => mocks.layout() }));
vi.mock("./queries", () => ({ useProject: () => mocks.project() }));
vi.mock("@/services/services-context", () => ({ useServices: () => ({}) }));
vi.mock("@/features/analytics/onboarding-analytics", () => ({
  useOnboardingAnalytics: () => mocks.track,
}));
vi.mock("./workspace-context", () => ({
  WorkspaceProvider: ({ children }: { children: ReactNode }) => children,
}));
vi.mock("./shell/workspace-shell", () => ({
  WorkspaceShell: () => <div>workspace</div>,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mocks.project.mockReturnValue({ data: { id: "p1" } });
  mocks.layout.mockReturnValue({ data: {} });
});

it("records one entry only once the project and layout are ready", async () => {
  mocks.layout.mockReturnValueOnce({ data: undefined });
  const user = {
    id: "u",
    displayName: "test",
    email: "",
    onboardingCompleted: true,
  };
  const view = render(<WorkspacePage user={user} />);
  expect(mocks.track).not.toHaveBeenCalled();
  view.rerender(<WorkspacePage user={user} />);
  await waitFor(() =>
    expect(mocks.track).toHaveBeenCalledExactlyOnceWith("workspace_entered"),
  );
  view.rerender(<WorkspacePage user={user} />);
  expect(mocks.track).toHaveBeenCalledTimes(1);
});

it("does not record entry when the project cannot be opened", () => {
  mocks.project.mockReturnValue({ data: { id: "p1" }, isError: true });
  const user = {
    id: "u",
    displayName: "test",
    email: "",
    onboardingCompleted: true,
  };
  render(<WorkspacePage user={user} />);
  expect(mocks.track).not.toHaveBeenCalled();
});
