import { act, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createLayout } from "@/features/workspace/model/layout";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/features/workspace/workspace-context";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";
import { TourStage } from "@/test/tour-stage";
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

function SidebarProbe() {
  const { layout } = useWorkspace();
  return <output data-testid="sidebar">{String(layout.sidebarOpen)}</output>;
}

function renderTour(
  options: Parameters<typeof renderWithServices>[1] = {},
  stage: Parameters<typeof TourStage>[0] = {},
  sidebarOpen = true,
) {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return renderWithServices(
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={{ ...createLayout({ kind: "new" }), sidebarOpen }}
    >
      <SidebarProbe />
      <TourStage {...stage} />
      <WorkspaceTour />
    </WorkspaceProvider>,
    options,
  );
}

const card = (name: string) =>
  screen.findByRole("dialog", { name }, { timeout: 4000 });

afterEach(() => window.localStorage.clear());

describe("WorkspaceTour", () => {
  it("walks writing, viewing and refreshing as the writer presses the real controls", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour();

    await card("원고는 여기서 써요");
    expect(screen.getByRole("list", { name: "14단계 중 1단계" })).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("속성 표로 문서를 이어요");
    await actor.click(screen.getByRole("button", { name: "다음" }));

    await card("이은 관계는 그래프로 봐요");
    expect(screen.getByText("‘그래프’를 눌러 보세요.")).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "stage graph" }));
    await card("한 문서에 집중해요");
    await actor.click(screen.getByRole("button", { name: "stage node" }));
    await card("이어진 문서가 모여요");
    await actor.click(screen.getByRole("button", { name: "다음" }));

    await card("회차별 등장은 타임라인에서");
    await actor.click(screen.getByRole("button", { name: "stage timeline" }));
    await card("줄은 문서, 칸은 회차예요");
    await actor.click(screen.getByRole("button", { name: "다음" }));

    await card("새 회차를 쓴 다음엔");
    await actor.click(screen.getByRole("button", { name: "stage refresh" }));
    await card("원고를 읽고 있어요");
    expect(screen.queryByRole("button", { name: "다음" })).toBeNull();
    expect(screen.getByRole("button", { name: "건너뛰기" })).toBeVisible();
    await card("바뀔 점을 찾았어요");
    await actor.click(screen.getByRole("button", { name: "stage review" }));
    await card("달라진 문서가 모여요");
    await actor.click(screen.getByRole("button", { name: "stage document" }));
    await card("왼쪽은 지금, 오른쪽은 제안");
    await actor.click(screen.getByRole("button", { name: "다음" }));

    await card("다 정하면 반영해요");
    expect(screen.queryByRole("button", { name: "건너뛰기" })).toBeNull();
    await actor.click(screen.getByRole("button", { name: "완료" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.localStorage.getItem("loresentry.tour.workspace")).toBe(
      "done",
    );
  }, 15_000);

  it("presses the control itself on 다음, and skips what was never opened", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour();

    await card("원고는 여기서 써요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("속성 표로 문서를 이어요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("이은 관계는 그래프로 봐요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("한 문서에 집중해요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("회차별 등장은 타임라인에서");
    await actor.click(screen.getByRole("button", { name: "이전" }));
    await card("한 문서에 집중해요");
  });

  it("opens a closed sidebar only for the steps that point into it", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour({}, {}, false);
    const sidebar = () => screen.getByTestId("sidebar").textContent;

    await card("원고는 여기서 써요");
    expect(sidebar()).toBe("false");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("속성 표로 문서를 이어요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("이은 관계는 그래프로 봐요");
    expect(sidebar()).toBe("true");
    await actor.click(screen.getByRole("button", { name: "stage graph" }));
    await card("한 문서에 집중해요");
    await waitFor(() => expect(sidebar()).toBe("false"));
    await actor.click(screen.getByRole("button", { name: "stage node" }));
    await card("이어진 문서가 모여요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("회차별 등장은 타임라인에서");
    expect(sidebar()).toBe("true");
  }, 15_000);

  it("leaves out graph refresh while the server has no refresh", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour(
      {
        refresh: {
          current: () =>
            Promise.reject(new ServiceError("unavailable", "준비 중")),
        },
      },
      { refresh: false },
    );

    await card("원고는 여기서 써요");
    expect(screen.getByRole("list", { name: "7단계 중 1단계" })).toBeVisible();
    for (const next of [
      "속성 표로 문서를 이어요",
      "이은 관계는 그래프로 봐요",
      "한 문서에 집중해요",
      "회차별 등장은 타임라인에서",
      "줄은 문서, 칸은 회차예요",
    ]) {
      await actor.click(screen.getByRole("button", { name: "다음" }));
      await card(next);
    }
    expect(screen.getByRole("button", { name: "완료" })).toBeVisible();
  });

  it("stays away once done, skips with Esc, and replays on request", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "done");
    const actor = userEvent.setup();
    renderTour();
    await new Promise((resolve) => setTimeout(resolve, 700));
    expect(screen.queryByRole("dialog")).toBeNull();

    act(() => requestTour());
    await card("원고는 여기서 써요");
    await actor.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });
});
