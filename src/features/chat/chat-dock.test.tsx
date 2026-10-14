import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/services/errors";
import { setMockChatLimit } from "@/services/mock/chat";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { ChatDock } from "./chat-dock";

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

function renderDock(options: Parameters<typeof renderWithServices>[1] = {}) {
  return renderWithServices(<Dock />, options);
}

function Dock() {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return (
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={createLayout()}
    >
      <ChatDock />
    </WorkspaceProvider>
  );
}

async function flush(ms = 0) {
  await act(() => vi.advanceTimersByTimeAsync(ms));
}

describe("ChatDock", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    window.matchMedia = ((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    })) as unknown as typeof window.matchMedia;
  });

  afterEach(() => {
    setMockChatLimit(null);
    vi.useRealTimers();
  });

  it("opens to the home view with this project's conversations", async () => {
    renderDock();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "AI 챗 열기" }));
    await flush();

    const chat = screen.getByRole("dialog", { name: "AI 챗" });
    expect(
      within(chat).getByRole("heading", {
        name: "서윤주 님, 무엇이 궁금하세요?",
      }),
    ).toBeInTheDocument();
    expect(within(chat).getByText("북쪽 문 장면 확인")).toBeInTheDocument();
  });

  it("answers a suggested question in a new conversation with cited sources", async () => {
    renderDock();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "AI 챗 열기" }));
    await flush();
    fireEvent.click(
      screen.getByRole("button", {
        name: "주요 인물과 연결된 설정을 정리해 줘",
      }),
    );
    await flush(400);
    expect(screen.getByText("원고와 설정을 모으는 중")).toBeInTheDocument();

    await flush(20_000);
    const chat = screen.getByRole("dialog", { name: "AI 챗" });
    expect(
      within(chat).getAllByRole("button", {
        name: "근거 문서 ‘레나 아르벨’ 열기",
      }).length,
    ).toBeGreaterThan(0);
    expect(
      within(chat).getByRole("button", { name: "답변 복사" }),
    ).toBeVisible();
  });

  it("stops an answer, keeps nothing unfinished and offers to ask again", async () => {
    renderDock();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "AI 챗 열기" }));
    await flush();
    fireEvent.click(
      screen.getByRole("button", {
        name: "가장 최근 회차에서 무슨 일이 있었어?",
      }),
    );
    await flush(1500);
    fireEvent.click(screen.getByRole("button", { name: "응답 멈추기" }));
    await flush(100);

    expect(
      screen.getByText("응답을 멈췄어요. 끝나지 않은 답은 남기지 않아요."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "다시 묻기" }),
    ).toBeInTheDocument();
  });

  it("keeps chat closed and explains why when the story is too long", async () => {
    renderDock({ before: () => setMockChatLimit(10) });
    await flush();
    const launcher = screen.getByRole("button", {
      name: "AI 챗을 열 수 없어요",
    });
    expect(launcher).toHaveAttribute("aria-disabled", "true");

    fireEvent.click(launcher);
    await flush();
    expect(
      screen.getByText("작품이 커서 AI 챗을 열 수 없어요"),
    ).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "AI 챗" })).toBeNull();
  });

  it("says chat is still being prepared when there is no server", async () => {
    renderDock({
      chat: {
        availability: () =>
          Promise.reject(new ServiceError("unavailable", "준비 중")),
      },
    });
    await flush();
    fireEvent.click(screen.getByRole("button", { name: "AI 챗 열기" }));
    await flush();
    expect(screen.getByText("AI 챗은 아직 준비 중이에요")).toBeInTheDocument();
  });
});
