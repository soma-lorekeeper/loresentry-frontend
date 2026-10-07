import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLayout } from "@/features/workspace/model/layout";
import { WorkspaceProvider } from "@/features/workspace/workspace-context";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";
import { ServiceError } from "@/services/errors";

import { requestTour } from "./tour-state";
import { WorkspaceTour } from "./workspace-tour";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

function renderTour(options: Parameters<typeof renderWithServices>[1] = {}) {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return renderWithServices(
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={createLayout({ kind: "new" })}
    >
      {["editor", "properties", "refresh", "timeline"].map((name) => (
        <div key={name} data-tour={name} />
      ))}
      <WorkspaceTour />
    </WorkspaceProvider>,
    options,
  );
}

afterEach(() => window.localStorage.clear());

describe("WorkspaceTour", () => {
  it("walks a first-time project through four steps and remembers it", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour();

    const dialog = await screen.findByRole("dialog", {
      name: "원고는 여기서 써요",
    });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "4단계 중 1단계" })).toBeVisible();

    await actor.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("dialog", { name: "속성 표로 문서를 이어요" });
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("dialog", { name: "새 회차를 쓴 다음엔" });
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("dialog", { name: "회차별 등장은 타임라인에서" });
    await actor.click(screen.getByRole("button", { name: "완료" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.localStorage.getItem("loresentry.tour.workspace")).toBe(
      "done",
    );
  });

  it("leaves out the graph refresh step while the server has no refresh", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour({
      refresh: {
        current: () =>
          Promise.reject(new ServiceError("unavailable", "준비 중")),
      },
    });

    await screen.findByRole("dialog", { name: "원고는 여기서 써요" });
    expect(screen.getByRole("list", { name: "3단계 중 1단계" })).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("dialog", { name: "속성 표로 문서를 이어요" });
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await screen.findByRole("dialog", { name: "회차별 등장은 타임라인에서" });
  });

  it("stays away once done, skips with Esc, and replays on request", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "done");
    const actor = userEvent.setup();
    renderTour();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => requestTour());
    await screen.findByRole("dialog", { name: "원고는 여기서 써요" });
    await actor.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
