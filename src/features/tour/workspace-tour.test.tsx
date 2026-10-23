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
  const tabs = layout.panes.flatMap((pane) => pane.tabs);
  return (
    <>
      <output data-testid="sidebar">{String(layout.sidebarOpen)}</output>
      <output data-testid="tabs">
        {tabs.map((tab) => tab.target.kind).join(",")}
      </output>
    </>
  );
}

function renderTour(
  options: Parameters<typeof renderWithServices>[1] = {},
  stage: Parameters<typeof TourStage>[0] = {},
  sidebarOpen = true,
  launcher = true,
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
      {launcher && (
        <button type="button" data-tour="ai-chat">
          stage chat
        </button>
      )}
      <WorkspaceTour />
    </WorkspaceProvider>,
    options,
  );
}

const card = (name: string) =>
  screen.findByRole("dialog", { name }, { timeout: 4000 });

/**
 * 가져오기 두 단계를 지난다. 첫 단계의 `다음` 은 가져오기 단추를 대신 눌러 창을 열고, 둘째 단계의
 * `다음` 은 그 창을 닫으며 넘어간다.
 */
async function throughImport(actor: ReturnType<typeof userEvent.setup>) {
  await card("쓰던 원고는 가져와요");
  await actor.click(screen.getByRole("button", { name: "다음" }));
  await card("올려 두고, 확인하고, 가져와요");
  await actor.click(screen.getByRole("button", { name: "다음" }));
}

afterEach(() => window.localStorage.clear());

describe("WorkspaceTour", () => {
  it("walks writing, viewing and refreshing as the writer presses the real controls", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour();

    await card("원고는 여기서 써요");
    expect(screen.getByRole("list", { name: "14단계 중 1단계" })).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await throughImport(actor);
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

    const chat = await card("작품을 아는 AI 챗");
    expect(chat).toHaveTextContent("원고 문장을 드래그하면");
    await actor.click(screen.getByRole("button", { name: "다음" }));

    // 실제 최신화를 시작하지 않는다. 단추를 가리킨 뒤 예시 검토 창을 띄운다.
    await card("새 회차를 쓴 다음엔");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("달라진 문서가 모여요");
    expect(
      screen.getByText("투어용 예시 · 실제 문서에는 반영되지 않음"),
    ).toBeInTheDocument();
    await actor.click(screen.getByRole("button", { name: "다음" }));
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
    await throughImport(actor);
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
    // 가져오기 단추는 사이드바에 있다. 그 단계와 창을 보여 주는 단계 동안만 열려 있다.
    await card("쓰던 원고는 가져와요");
    expect(sidebar()).toBe("true");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("올려 두고, 확인하고, 가져와요");
    expect(screen.getByRole("button", { name: "stage cancel" })).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("속성 표로 문서를 이어요");
    // 넘어가면서 창을 닫았고, 사이드바도 도로 접혔다.
    expect(screen.queryByRole("button", { name: "stage cancel" })).toBeNull();
    await waitFor(() => expect(sidebar()).toBe("false"));
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

  it("reaches graph refresh when the sidebar is a drawer that unmounts when closed", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour({}, { drawer: true }, false);

    await card("원고는 여기서 써요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await throughImport(actor);
    await card("속성 표로 문서를 이어요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("이은 관계는 그래프로 봐요");
    await actor.click(screen.getByRole("button", { name: "stage graph" }));
    await card("한 문서에 집중해요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("회차별 등장은 타임라인에서");
    await actor.click(screen.getByRole("button", { name: "stage timeline" }));
    await card("줄은 문서, 칸은 회차예요");
    expect(screen.queryByRole("button", { name: "stage refresh" })).toBeNull();
    expect(screen.getByRole("button", { name: "다음" })).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("작품을 아는 AI 챗");
    expect(screen.getByRole("button", { name: "다음" })).toBeVisible();
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("새 회차를 쓴 다음엔");
    expect(
      screen.getByRole("button", { name: "stage refresh" }),
    ).toBeInTheDocument();
  }, 15_000);

  it("puts the workspace back as it was and never starts a real refresh", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    const start = vi.fn();
    renderTour({ refresh: { start } });

    await card("원고는 여기서 써요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await throughImport(actor);
    await card("속성 표로 문서를 이어요");
    expect(screen.getByTestId("tabs").textContent).toBe("file,file");
    await actor.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.getByTestId("tabs").textContent).toBe("new");
    expect(start).not.toHaveBeenCalled();
  });

  it("closes the example review and ends the tour once it is applied", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    const start = vi.fn();
    renderTour({ refresh: { start } });

    await card("원고는 여기서 써요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await throughImport(actor);
    await card("속성 표로 문서를 이어요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("이은 관계는 그래프로 봐요");
    await actor.click(screen.getByRole("button", { name: "stage graph" }));
    await card("한 문서에 집중해요");
    await actor.click(screen.getByRole("button", { name: "stage node" }));
    await card("이어진 문서가 모여요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("회차별 등장은 타임라인에서");
    await actor.click(screen.getByRole("button", { name: "stage timeline" }));
    await card("줄은 문서, 칸은 회차예요");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("작품을 아는 AI 챗");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("새 회차를 쓴 다음엔");
    await actor.click(screen.getByRole("button", { name: "다음" }));
    await card("달라진 문서가 모여요");

    // 예시 창의 화살표와 확정은 실제처럼 움직이고, 확정하면 투어가 끝난다.
    await actor.click(
      screen.getByRole("button", { name: "신규 버전 전체 반영" }),
    );
    await actor.click(screen.getByRole("button", { name: "반영 확정" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(window.localStorage.getItem("loresentry.tour.workspace")).toBe(
      "done",
    );
    expect(start).not.toHaveBeenCalled();
  }, 15_000);

  it("leaves out graph refresh while the server has no refresh", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour(
      {
        refresh: {
          latest: () =>
            Promise.reject(new ServiceError("unavailable", "준비 중")),
        },
      },
      { refresh: false },
    );

    await card("원고는 여기서 써요");
    expect(screen.getByRole("list", { name: "10단계 중 1단계" })).toBeVisible();
    for (const next of [
      "쓰던 원고는 가져와요",
      "올려 두고, 확인하고, 가져와요",
      "속성 표로 문서를 이어요",
      "이은 관계는 그래프로 봐요",
      "한 문서에 집중해요",
      "회차별 등장은 타임라인에서",
      "줄은 문서, 칸은 회차예요",
      "작품을 아는 AI 챗",
    ]) {
      await actor.click(screen.getByRole("button", { name: "다음" }));
      await card(next);
    }
    expect(screen.getByRole("button", { name: "완료" })).toBeVisible();
  });

  it("leaves out the AI chat step when there is no chat launcher", async () => {
    window.localStorage.setItem("loresentry.tour.workspace", "pending");
    const actor = userEvent.setup();
    renderTour(
      {
        refresh: {
          latest: () =>
            Promise.reject(new ServiceError("unavailable", "준비 중")),
        },
      },
      { refresh: false },
      true,
      false,
    );

    await card("원고는 여기서 써요");
    for (const next of [
      "쓰던 원고는 가져와요",
      "올려 두고, 확인하고, 가져와요",
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
    await actor.click(screen.getByRole("button", { name: "완료" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(screen.queryByText("작품을 아는 AI 챗")).toBeNull();
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
