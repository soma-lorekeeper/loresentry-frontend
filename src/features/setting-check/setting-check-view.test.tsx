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

/** 요약 → 점검 → 원고를 차례로 읽어야 결과가 보인다. 느린 기계에서도 기다리게 넉넉히 둔다 */
const LOADED = { timeout: 4000 };

function openCard(name: RegExp) {
  return screen.getByRole("button", { name, expanded: true });
}

describe("setting check view", () => {
  beforeEach(() => focusChapter(GLASS_GARDEN_ID, null));

  it("is a workspace view with its own tab", () => {
    expect(WORKSPACE_VIEWS["setting-check"]).toMatchObject({
      icon: "scan-text",
      title: "설정 오류 점검",
    });
  });

  it("opens on a chapter picker with the latest check of each checked chapter", async () => {
    renderWithServices(<Harness />);
    expect(
      await screen.findByRole(
        "heading",
        { name: "설정 오류 점검", level: 1 },
        LOADED,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "점검할 원고: 14화 · 축제의 정전" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "점검" })).toBeEnabled();

    const history = screen.getByRole("list");
    const rows = within(history).getAllByRole("button");
    expect(rows[0]).toHaveTextContent(/^12화 · 균열의 밤어긋남 6/);
    expect(
      within(history).getByRole("button", {
        name: /^11화 · 유리 정원어긋남 없음/,
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText("점검 안 함")).not.toBeInTheDocument();
  });

  it("puts the sources beside the manuscript and opens the first in reading order", async () => {
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /^12화 · 균열의 밤어긋남 6/ },
        LOADED,
      ),
    );

    expect(
      await screen.findByRole(
        "heading",
        { name: "12화 · 균열의 밤", level: 1 },
        LOADED,
      ),
    ).toBeInTheDocument();
    const sources = await screen.findByRole("list", { name: "근거" }, LOADED);
    const heads = within(sources).getAllByRole("button", { expanded: false });
    expect(heads.map((head) => head.textContent)).toEqual([
      "하린확신 낮음 · 매일 새벽 북쪽 온실을 돈다",
      "북쪽 온실낡은 열쇠 없이는 열리지 않는다",
      "낡은 열쇠한 번도 정원 안에 들어온 적이 없다",
      "북쪽 온실정원 기록단만 손볼 수 있다",
      "북쪽 온실낡은 열쇠 없이는 열리지 않는다",
    ]);
    expect(openCard(/^9화다섯 번째 순찰/)).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "확인할 것6" })).toBeChecked();

    const manuscript = screen.getByLabelText("대상 원고");
    const marks = [...manuscript.querySelectorAll("mark")];
    expect(marks.map((mark) => mark.textContent)).toEqual([
      "서윤은 그 선들이 모두 한곳을 가리키고 있다는 사실을 세 번째 순찰에서야 알아차렸다",
      "오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다",
      "서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다",
      "카이론이 금이 간 창에 손바닥을 대고, 튀어나온 조각을 도로 밀어 넣고 있었다",
      "서윤이 손잡이를 다시 잡기도 전에, 문은 저절로 열렸다",
    ]);
    expect(marks[0]).toHaveAttribute("data-on");

    const fold = screen.getByRole("button", { name: "문단 8개 펼치기" });
    expect(manuscript).not.toHaveTextContent("기억 유리병이야");
    await userEvent.click(fold);
    expect(manuscript).toHaveTextContent("기억 유리병이야");
    await userEvent.click(screen.getByRole("button", { name: "다시 접기" }));
    expect(
      screen.getByRole("button", { name: "문단 8개 펼치기" }),
    ).toBeInTheDocument();

    await userEvent.click(marks[1]);
    expect(openCard(/^하린확신 낮음/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "다음 어긋남" }));
    expect(openCard(/^북쪽 온실.*낡은 열쇠/)).toBeInTheDocument();
    expect(
      screen.getByText(
        "북쪽 문은 낡은 열쇠로만 열리는데, 서윤이 열쇠 없이 문을 밀어요",
      ),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole("button", { name: "같은 근거와 부딪히는 곳 1" }),
    );
    expect(openCard(/^북쪽 온실.*낡은 열쇠/)).toBeInTheDocument();
    expect(
      screen.getByText("북쪽 문은 낡은 열쇠로만 열리는데, 문이 저절로 열려요"),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "설정 오류 점검" }),
    );
    expect(
      await screen.findByRole("heading", { name: "설정 오류 점검", level: 1 }),
    ).toBeInTheDocument();
  });

  it("moves a finding to intended with a reason and back again", async () => {
    focusChapter(GLASS_GARDEN_ID, "glass-garden:ch-12");
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole("button", { name: "의도한 거예요" }, LOADED),
    );
    const reason = screen.getByRole("textbox", { name: "의도한 이유" });
    await userEvent.type(reason, "그날 밤 세 번째 순찰이에요");
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
    expect(screen.getByRole("radio", { name: "확인할 것5" })).toBeChecked();
    expect(screen.getByText("의도함으로 옮겼어요.")).toBeInTheDocument();
    expect(screen.getByLabelText("확인할 것 5개")).toHaveTextContent("5");

    await userEvent.click(screen.getByRole("radio", { name: "의도함2" }));
    await userEvent.click(await screen.findByRole("button", { name: /^9화/ }));
    expect(
      await screen.findByText("그날 밤 세 번째 순찰이에요", {}, LOADED),
    ).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "되돌리기" }));

    await waitFor(
      () =>
        expect(
          screen.getByRole("radio", { name: "확인할 것6" }),
        ).toBeInTheDocument(),
      LOADED,
    );
    expect(screen.getByText("확인할 것으로 되돌렸어요.")).toBeInTheDocument();
  });

  it("starts a check on the picked chapter and can cancel it", async () => {
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: "점검할 원고: 14화 · 축제의 정전" },
        LOADED,
      ),
    );
    await userEvent.click(
      screen.getByRole("menuitemradio", { name: "13화 · 돌아온 목소리" }),
    );
    await userEvent.click(screen.getByRole("button", { name: "점검" }));

    expect(
      await screen.findByRole(
        "heading",
        { name: "13화 · 돌아온 목소리", level: 1 },
        LOADED,
      ),
    ).toBeInTheDocument();
    expect(
      await screen.findByText("어긋나 보이는 곳을 찾고 있어요", {}, LOADED),
    ).toBeInTheDocument();
    expect(screen.getByText(/보통 1–3분 걸려요/)).toBeInTheDocument();

    await userEvent.click(
      await screen.findByRole("button", { name: "취소" }, LOADED),
    );
    expect(
      await screen.findByText("점검을 취소했어요", {}, LOADED),
    ).toBeInTheDocument();

    await userEvent.click(
      screen.getByRole("button", { name: "설정 오류 점검" }),
    );
    expect(
      await screen.findByRole(
        "button",
        { name: /^13화 · 돌아온 목소리취소함/ },
        LOADED,
      ),
    ).toBeInTheDocument();
  });

  it("opens the source beside the report and asks it to show the sentence", async () => {
    focusChapter(GLASS_GARDEN_ID, "glass-garden:ch-12");
    renderWithServices(<Harness />);
    await userEvent.click(
      await screen.findByRole(
        "button",
        { name: /^9화 · 각성에서 보기: 다섯 번째 순찰/ },
        LOADED,
      ),
    );
    expect(screen.getByLabelText("창")).toHaveTextContent(
      "setting-check,file:glass-garden:ch-9",
    );
    expect(takeReveal("glass-garden:ch-9")).toBe(
      "다섯 번째 순찰을 마친 새벽이었다.",
    );
  });

  it("shows a chapter that was never checked with a way to start", async () => {
    focusChapter(GLASS_GARDEN_ID, "glass-garden:ch-14");
    renderWithServices(<Harness />);
    expect(
      await screen.findByText("아직 점검하지 않았어요", {}, LOADED),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "점검" })).toBeInTheDocument();
  });

  it("explains a failed check", async () => {
    focusChapter(GLASS_GARDEN_ID, "glass-garden:ch-12");
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
  });
});
