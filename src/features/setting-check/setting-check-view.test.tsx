import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { takeReveal } from "@/features/documents/reveal-request";
import { createLayout } from "@/features/workspace/model/layout";
import { WORKSPACE_VIEWS } from "@/features/workspace/views/registry";
import {
  useWorkspace,
  WorkspaceProvider,
} from "@/features/workspace/workspace-context";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { focusChapter } from "./focus";
import { SettingCheckItem } from "./setting-check-item";
import { SettingCheckView } from "./setting-check-view";

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

function Panes() {
  const { layout } = useWorkspace();
  return (
    <output aria-label="창">
      {layout.panes.map((pane) => pane.activeTabId).join(",")}
    </output>
  );
}

function Harness() {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  const layout = createLayout({ kind: "setting-check" });
  return (
    <WorkspaceProvider project={project} user={user} initialLayout={layout}>
      <SettingCheckItem />
      <SettingCheckView paneId="pane-1" tab={layout.panes[0].tabs[0]} active />
      <Panes />
    </WorkspaceProvider>
  );
}

/** 요약 → 기록 → 결과를 차례로 읽어야 결과가 보인다. 느린 기계에서도 기다리게 넉넉히 둔다 */
const LOADED = { timeout: 4000 };

function row(title: string) {
  return screen.getByRole("button", { name: new RegExp(`^${title}`) });
}

describe("setting check view", () => {
  beforeEach(() => focusChapter(GLASS_GARDEN_ID, "glass-garden:ch-12"));

  it("is a workspace view with its own tab", () => {
    expect(WORKSPACE_VIEWS["setting-check"]).toMatchObject({
      icon: "scan-text",
      title: "설정 오류 점검",
    });
  });

  it("lists chapters by episode with their last check and opens the latest result", async () => {
    renderWithServices(<Harness />);
    const ledger = await screen.findByRole(
      "navigation",
      { name: "회차" },
      LOADED,
    );

    await waitFor(
      () =>
        expect(within(ledger).getByText(/^어긋남 3 · /)).toBeInTheDocument(),
      LOADED,
    );
    expect(within(ledger).getByText(/^어긋남 없음 · /)).toBeInTheDocument();
    expect(within(ledger).getByText(/^점검 뒤 고침 · /)).toBeInTheDocument();
    expect(within(ledger).getByText(/^의도함 1 · /)).toBeInTheDocument();
    expect(within(ledger).getAllByText("점검 안 함").length).toBeGreaterThan(0);
    expect(
      within(ledger)
        .getAllByRole("heading", { level: 2 })
        .map((heading) => heading.textContent),
    ).toEqual([
      "Episode 4. 새 원고",
      "Episode 3. 기억 항로",
      "Episode 2. 북쪽 문",
      "Episode 1. 유리의 계절",
    ]);
    expect(
      within(ledger).getByRole("button", { name: "13화 · 돌아온 목소리 점검" }),
    ).toBeInTheDocument();

    expect(screen.getByLabelText("확인할 것 3개")).toHaveTextContent("3");
    expect(
      screen.getByRole("heading", { name: "12화 · 균열의 밤", level: 2 }),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        /점검 · 1–11화와 설정 문서 \d+개를 읽었어요/,
        {},
        LOADED,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole("radio", { name: "확인할 것3" }, LOADED),
    ).toBeChecked();
    expect(
      screen.getByText("서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다."),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "기록 3" })).toBeInTheDocument();
  });

  it("moves a finding to intended with a reason and back again", async () => {
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole("button", { name: "의도한 거예요" }, LOADED),
    );
    const reason = screen.getByRole("textbox", { name: "의도한 이유" });
    await userEvent.type(reason, "9화에서 열쇠를 받은 뒤예요");
    await userEvent.click(
      screen.getByRole("button", { name: "의도한 거예요" }),
    );

    await waitFor(
      () =>
        expect(
          screen.getByRole("radio", { name: "의도함2" }),
        ).toBeInTheDocument(),
      LOADED,
    );
    expect(screen.getByRole("radio", { name: "확인할 것2" })).toBeChecked();
    expect(screen.getByText("의도함으로 옮겼어요.")).toBeInTheDocument();
    expect(screen.getByLabelText("확인할 것 2개")).toHaveTextContent("2");

    await userEvent.click(screen.getByRole("radio", { name: "의도함2" }));
    const reasons = await screen.findByText(
      "9화에서 열쇠를 받은 뒤예요",
      {},
      LOADED,
    );
    expect(reasons).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    await waitFor(
      () =>
        expect(
          screen.getByRole("radio", { name: "확인할 것3" }),
        ).toBeInTheDocument(),
      LOADED,
    );
    expect(screen.getByText("확인할 것으로 되돌렸어요.")).toBeInTheDocument();
  });

  it("starts a check from a chapter row and can cancel it", async () => {
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: "13화 · 돌아온 목소리 점검" },
        LOADED,
      ),
    );

    expect(
      await screen.findByRole(
        "heading",
        { name: "13화 · 돌아온 목소리", level: 2 },
        LOADED,
      ),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(
          screen.getAllByText("점검 중 · 앞 회차 읽는 중").length,
        ).toBeGreaterThan(0),
      LOADED,
    );
    expect(screen.getByText(/보통 1–3분 걸려요/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "취소" }));
    expect(
      await screen.findByText("점검을 취소했어요", {}, LOADED),
    ).toBeInTheDocument();
    expect(row("13화 · 돌아온 목소리")).toHaveTextContent(/취소함 · /);
  });

  it("opens the quoted chapter beside the report and asks it to show the sentence", async () => {
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /^12화 · 균열의 밤에서 보기: 서윤은 등불을/ },
        LOADED,
      ),
    );
    expect(screen.getByLabelText("창")).toHaveTextContent(
      "setting-check,file:glass-garden:ch-12",
    );
    expect(takeReveal("glass-garden:ch-12")).toBe(
      "서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다.",
    );
  });

  it("shows a chapter that was never checked with a way to start", async () => {
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /^14화 · 축제의 정전점검 안 함/ },
        LOADED,
      ),
    );
    expect(
      await screen.findByText("아직 점검하지 않았어요", {}, LOADED),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "점검" })).toBeInTheDocument();
  });

  it("explains a failed check without hiding the previous one", async () => {
    renderWithServices(<Harness />, {
      before: () => {
        const db = getDb();
        const latest = db.settingChecks.runs.find(
          (stored) => stored.run.id === "check-ch-12-18",
        )!;
        latest.run.status = "FAILED";
        latest.run.failureCode = "CHAT_CONTEXT_TOO_LARGE";
        latest.findings = [];
      },
    });
    expect(
      await screen.findByText("점검하지 못했어요", {}, LOADED),
    ).toBeInTheDocument();
    expect(screen.getByText(/다시 시도해도 같아요/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "다시 시도" })).toBeNull();
    expect(
      await screen.findByText(/^지난 점검 · /, {}, LOADED),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(
        "북쪽 문은 낡은 열쇠로만 열리는데, 서윤이 열쇠 없이 문을 밀어요",
        {},
        LOADED,
      ),
    ).toBeInTheDocument();
  });
});
