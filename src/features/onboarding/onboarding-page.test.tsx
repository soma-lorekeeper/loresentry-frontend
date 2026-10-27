import { fireEvent, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithServices, routerMock } from "@/test/render";

import { ACQUISITION_STORAGE_KEY } from "@/features/analytics/acquisition";
import { SessionGate } from "@/features/auth/session-gate";
import { setMockRule } from "@/services/mock/control";
import { getDb } from "@/services/mock/db";

import { OnboardingPage } from "./onboarding-page";

const newcomer = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: false,
};

const signIn = (onboardingCompleted: boolean) => () => {
  const db = getDb();
  db.signedIn = true;
  db.user = { ...db.user, onboardingCompleted };
};

const adClick = {
  utmSource: "google",
  utmMedium: "cpc",
  utmCampaign: null,
  utmTerm: "소설 에디터",
  utmContent: null,
  clickId: "Cj0K",
  clickIdType: "gclid",
  referrerHost: "www.google.com",
  landingPath: "/",
  landedAt: "2026-10-27T01:02:03.000Z",
};

function keepAdClick() {
  localStorage.setItem(
    ACQUISITION_STORAGE_KEY,
    JSON.stringify({ acquisition: adClick, savedAt: Date.now() }),
  );
}

describe("OnboardingPage acquisition", () => {
  it("sends where a newcomer came from once and forgets it after the server keeps it", async () => {
    keepAdClick();
    const recordAcquisition = vi.fn().mockResolvedValue(undefined);
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      account: { recordAcquisition },
    });

    await waitFor(() =>
      expect(localStorage.getItem(ACQUISITION_STORAGE_KEY)).toBeNull(),
    );
    expect(recordAcquisition).toHaveBeenCalledTimes(1);
    expect(recordAcquisition).toHaveBeenCalledWith(adClick);
  });

  it("keeps the source for the next visit when sending fails", async () => {
    keepAdClick();
    const recordAcquisition = vi.fn().mockRejectedValue(new Error("offline"));
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      account: { recordAcquisition },
    });

    await waitFor(() => expect(recordAcquisition).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(localStorage.getItem(ACQUISITION_STORAGE_KEY)).not.toBeNull();
  });

  it("does not send on a replay or for a finished account", () => {
    keepAdClick();
    const recordAcquisition = vi.fn().mockResolvedValue(undefined);
    const { unmount } = renderWithServices(
      <OnboardingPage user={newcomer} replay />,
      { account: { recordAcquisition } },
    );
    unmount();
    renderWithServices(
      <OnboardingPage
        user={{ ...newcomer, onboardingCompleted: true }}
        replay={false}
      />,
      { account: { recordAcquisition } },
    );

    expect(recordAcquisition).not.toHaveBeenCalled();
    expect(localStorage.getItem(ACQUISITION_STORAGE_KEY)).not.toBeNull();
  });
});

describe("OnboardingPage", () => {
  it("walks the four scenes with buttons and keys", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "작업공간 하나",
    );
    expect(screen.getByRole("button", { name: "이전" })).toBeDisabled();

    await actor.click(screen.getByRole("button", { name: "다음" }));
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "여기서 써요",
    );

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "문서를 이어요",
    );
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "여기서 써요",
    );
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "2단계",
    );
  });

  it("introduces AI chat, with drag-to-ask in the stage", () => {
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />);
    for (let i = 0; i < 6; i++)
      fireEvent.keyDown(window, { key: "ArrowRight" });

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "작품을 아는 AI 챗",
    );
    expect(screen.getByText(/원고 문장을 드래그해서/)).toBeInTheDocument();
    expect(screen.getByText("AI에게 묻기")).toBeInTheDocument();
    expect(screen.getByText("설명해 줘")).toBeInTheDocument();
    expect(screen.getAllByText("이 부분을 설명해 줘").length).toBeGreaterThan(
      0,
    );
    expect(screen.getByText("메모 · 균열의 방향")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "작가명을",
    );
  });

  it("skips the tour with Esc but stops at the author name", () => {
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />);
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByRole("textbox", { name: "작가명" })).toHaveValue(
      "서윤주",
    );
    expect(screen.queryByRole("button", { name: "건너뛰기" })).toBeNull();
  });

  it("saves a new author name before the start choices", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      before: signIn(false),
    });
    fireEvent.keyDown(window, { key: "Escape" });
    const field = screen.getByRole("textbox", { name: "작가명" });
    await actor.clear(field);
    expect(
      screen.getByRole("button", { name: "이 이름으로 계속" }),
    ).toBeDisabled();
    await actor.type(field, "  윤슬  {Enter}");

    expect(
      await screen.findByRole("button", { name: /예시 프로젝트 둘러보기/ }),
    ).toBeInTheDocument();
    expect(getDb().user.displayName).toBe("윤슬");
  });

  it("keeps the name step when the name is rejected", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      before: signIn(false),
    });
    fireEvent.keyDown(window, { key: "Escape" });
    const field = screen.getByRole("textbox", { name: "작가명" });
    await actor.clear(field);
    await actor.type(field, "가".repeat(30));
    await actor.click(screen.getByRole("button", { name: "이 이름으로 계속" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("1~20자");
    expect(screen.getByRole("textbox", { name: "작가명" })).toBeInTheDocument();
  });

  it("does not call the server when the name is unchanged", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      before: () => {
        signIn(false)();
        setMockRule("account.update", "fail");
      },
    });
    fireEvent.keyDown(window, { key: "Escape" });
    await actor.click(screen.getByRole("button", { name: "이 이름으로 계속" }));
    expect(
      await screen.findByRole("button", { name: /예시 프로젝트 둘러보기/ }),
    ).toBeInTheDocument();
  });

  it("records completion and opens the sample project", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      before: signIn(false),
    });
    await actor.click(screen.getByRole("button", { name: "건너뛰기" }));
    await actor.click(screen.getByRole("button", { name: "이 이름으로 계속" }));
    await actor.click(
      await screen.findByRole("button", { name: /예시 프로젝트 둘러보기/ }),
    );

    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith(
        expect.stringMatching(/^\/workspace\/\?projectId=/),
      ),
    );
    const db = getDb();
    expect(db.user.onboardingCompleted).toBe(true);
    expect(db.projects.map((p) => p.title)).toContain("유리 정원의 기록 (2)");
  });

  it("keeps the choice open when completion fails", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />, {
      before: () => {
        signIn(false)();
        setMockRule("account.completeOnboarding", "fail");
      },
    });
    fireEvent.keyDown(window, { key: "Escape" });
    await actor.click(screen.getByRole("button", { name: "이 이름으로 계속" }));
    await actor.click(
      await screen.findByRole("button", { name: /나중에 할게요/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "서버에 연결하지 못했어요",
    );
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("replays without touching the server and returns to the guide", async () => {
    const actor = userEvent.setup();
    renderWithServices(
      <OnboardingPage
        user={{ ...newcomer, onboardingCompleted: true }}
        replay
      />,
      { before: () => setMockRule("account.completeOnboarding", "fail") },
    );
    expect(screen.queryByText(/환영해요/)).toBeNull();
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByRole("textbox", { name: "작가명" })).toBeNull();
    await actor.click(
      screen.getByRole("button", { name: "사용 가이드로 돌아가기" }),
    );
    await waitFor(() =>
      expect(routerMock.push).toHaveBeenCalledWith("/projects/guide/"),
    );
  });
});

describe("SessionGate onboarding redirect", () => {
  it("sends a new account to /welcome/ before any protected page", async () => {
    renderWithServices(
      <SessionGate>{() => <p>프로젝트 목록</p>}</SessionGate>,
      { before: signIn(false) },
    );
    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/welcome/"),
    );
    expect(screen.queryByText("프로젝트 목록")).toBeNull();
  });

  it("lets finished accounts and the onboarding page through", async () => {
    renderWithServices(
      <SessionGate>{() => <p>프로젝트 목록</p>}</SessionGate>,
      { before: signIn(true) },
    );
    expect(await screen.findByText("프로젝트 목록")).toBeInTheDocument();

    renderWithServices(
      <SessionGate onboarding>{() => <p>온보딩</p>}</SessionGate>,
      { before: signIn(false) },
    );
    expect(await screen.findByText("온보딩")).toBeInTheDocument();
  });
});
