import { act, fireEvent, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceError } from "@/services/errors";
import { setMockRule, setMockLatency } from "@/services/mock/control";
import {
  CHAT_DAILY_LIMIT,
  setMockChatLimit,
  setMockChatUsage,
} from "@/services/mock/chat";
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
  it("keeps a failed new-conversation question and retries it once", async () => {
    const createSession = vi
      .fn()
      .mockRejectedValueOnce(new Error("create failed"));
    renderDock({ chat: { createSession } });
    await flush();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /^AI 챗 열기/ }));
    const chat = screen.getByRole("dialog", { name: "AI 챗" });
    const input = within(chat).getByRole("textbox", { name: "질문" });
    fireEvent.change(input, { target: { value: "질문을 잃지 않아야 한다" } });
    fireEvent.keyDown(input, { key: "Enter" });
    fireEvent.keyDown(input, { key: "Enter" });
    await flush();
    expect(createSession).toHaveBeenCalledTimes(1);
    expect(input).toHaveValue("질문을 잃지 않아야 한다");
    expect(within(chat).getByRole("alert")).toHaveTextContent(
      "대화를 만들지 못했어요. 질문은 유지됩니다.",
    );
    const first = getDb().chatSessions.find(
      (s) => s.projectId === GLASS_GARDEN_ID,
    )!;
    createSession.mockResolvedValueOnce(first);
    fireEvent.click(within(chat).getByRole("button", { name: "다시 시도" }));
    await flush();
    expect(createSession).toHaveBeenCalledTimes(2);
    expect(within(chat).getByRole("textbox", { name: "질문" })).toHaveValue("");
    expect(
      within(chat).queryByText("대화를 만들지 못했어요. 질문은 유지됩니다."),
    ).toBeNull();
  });

  it.each(["rename", "delete"] as const)(
    "retains a failed conversation %s and retries",
    async (operation) => {
      renderDock({ before: () => setMockRule(`chat.${operation}`, "once") });
      await flush();
      await flush();
      fireEvent.click(screen.getByRole("button", { name: /^AI 챗 열기/ }));
      const chat = screen.getByRole("dialog", { name: "AI 챗" });
      const first = getDb().chatSessions.find(
        (s) => s.projectId === GLASS_GARDEN_ID && s.preview,
      )!;
      fireEvent.click(within(chat).getByText(first.title));
      await flush();
      fireEvent.click(within(chat).getByRole("button", { name: "대화 메뉴" }));
      fireEvent.click(
        screen.getByRole("menuitem", {
          name: operation === "rename" ? "이름 바꾸기" : "대화 삭제",
        }),
      );
      setMockLatency(100);
      if (operation === "rename") {
        const input = within(chat).getByRole("textbox", { name: "대화 이름" });
        fireEvent.change(input, { target: { value: "다시 저장할 대화 이름" } });
        fireEvent.keyDown(input, { key: "Enter" });
        await flush(500);
        await flush();
        expect(input).toHaveValue("다시 저장할 대화 이름");
        expect(within(chat).getByRole("alert")).toHaveTextContent(
          "대화 이름을 바꾸지 못했어요",
        );
        expect(getDb().chatSessions.find((s) => s.id === first.id)?.title).toBe(
          first.title,
        );
        fireEvent.keyDown(input, { key: "Enter" });
        await flush(500);
        await flush(500);
        expect(
          within(chat).queryByRole("textbox", { name: "대화 이름" }),
        ).toBeNull();
        expect(getDb().chatSessions.find((s) => s.id === first.id)?.title).toBe(
          "다시 저장할 대화 이름",
        );
      } else {
        const confirm = screen.getByRole("alertdialog");
        fireEvent.click(within(confirm).getByRole("button", { name: "삭제" }));
        await flush();
        fireEvent.keyDown(confirm, { key: "Escape" });
        await flush(500);
        await flush();
        expect(screen.getByRole("dialog", { name: "AI 챗" })).toBeVisible();
        expect(within(confirm).getByRole("alert")).toHaveTextContent(
          "대화를 삭제하지 못했어요",
        );
        expect(getDb().chatSessions.some((s) => s.id === first.id)).toBe(true);
        fireEvent.click(within(confirm).getByRole("button", { name: "삭제" }));
        await flush(500);
        await flush(500);
        expect(screen.queryByRole("alertdialog")).toBeNull();
        expect(getDb().chatSessions.some((s) => s.id === first.id)).toBe(false);
      }
    },
  );
  it.each(["sessions", "search", "messages"] as const)(
    "shows a %s read failure and retries the same view",
    async (operation) => {
      renderDock({ before: () => setMockRule(`chat.${operation}`, "once") });
      await flush();
      await flush();
      fireEvent.click(screen.getByRole("button", { name: /^AI 챗 열기/ }));
      await flush();
      const chat = screen.getByRole("dialog", { name: "AI 챗" });
      const first = getDb().chatSessions.find(
        (s) => s.projectId === GLASS_GARDEN_ID && s.preview,
      )!;
      if (operation === "search") {
        fireEvent.change(
          within(chat).getByRole("searchbox", { name: "대화 검색" }),
          { target: { value: first.title } },
        );
        await flush();
      } else if (operation === "messages") {
        fireEvent.click(within(chat).getByText(first.title));
        await flush();
      }
      const error = within(chat).getByRole("alert");
      expect(error).toHaveTextContent(
        operation === "sessions"
          ? "대화 목록을 불러오지 못했어요"
          : operation === "search"
            ? "대화 검색을 마치지 못했어요"
            : "대화 내용을 불러오지 못했어요",
      );
      expect(within(chat).queryByText("아직 나눈 대화가 없어요")).toBeNull();
      fireEvent.click(within(error).getByRole("button", { name: "다시 시도" }));
      await flush();
      expect(within(chat).queryByRole("alert")).toBeNull();
      if (operation === "search") {
        expect(
          within(chat).getByRole("searchbox", { name: "대화 검색" }),
        ).toHaveValue(first.title);
        expect(within(chat).getByText(/대화 \d+개/)).toBeInTheDocument();
      } else if (operation === "sessions") {
        expect(within(chat).getByText(first.title)).toBeInTheDocument();
      } else {
        expect(within(chat).getByText(first.title)).toBeInTheDocument();
        expect(within(chat).queryByText("이렇게 물어보세요")).toBeNull();
      }
    },
  );
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
    setMockChatUsage(null);
    window.localStorage.clear();
    vi.useRealTimers();
  });

  async function openAt(used: number) {
    setMockChatUsage(used);
    renderDock();
    await flush();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /^AI 챗 열기/ }));
    await flush();
    return screen.getByRole("dialog", { name: "AI 챗" });
  }

  it("waits for one conversation's answer before another can ask", async () => {
    renderDock();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /^AI 챗 열기/ }));
    await flush();
    fireEvent.click(
      screen.getByRole("button", {
        name: "가장 최근 회차에서 무슨 일이 있었어?",
      }),
    );
    await flush(400);
    fireEvent.click(screen.getByRole("button", { name: "대화 목록" }));
    await flush();
    fireEvent.change(screen.getByRole("textbox", { name: "질문" }), {
      target: { value: "레나는 누구야?" },
    });

    const send = screen.getByRole("button", { name: "보내기" });
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute("title", "다른 대화에서 답을 쓰는 중이에요");

    await flush(20_000);
    expect(screen.getByRole("button", { name: "보내기" })).toBeEnabled();
  });

  it("shows today's usage in the header and when it resets", async () => {
    const chat = await openAt(CHAT_DAILY_LIMIT * 0.28);

    fireEvent.click(
      within(chat).getByRole("button", { name: "오늘 AI 챗 사용량 28%" }),
    );

    const card = screen.getByRole("dialog", { name: "오늘 사용량" });
    expect(within(card).getByText("28%")).toBeInTheDocument();
    expect(within(card).getByText("자정에 0%로 비워져요.")).toBeInTheDocument();
    expect(screen.queryByText(/오늘 사용량의/)).not.toBeInTheDocument();
  });

  it("warns once past 80% and stays quiet for the day after it is dismissed", async () => {
    const chat = await openAt(CHAT_DAILY_LIMIT * 0.82);

    expect(within(chat).getByText("오늘 사용량의 82%를 썼어요")).toBeVisible();
    fireEvent.click(within(chat).getByRole("button", { name: "알림 닫기" }));

    expect(
      within(chat).queryByText("오늘 사용량의 82%를 썼어요"),
    ).not.toBeInTheDocument();
    expect(window.localStorage.getItem("loresentry.chat.usage-notice")).toMatch(
      /Z$/,
    );
  });

  it("puts a rest card where the question box was once the day is used up", async () => {
    setMockChatUsage(CHAT_DAILY_LIMIT);
    renderDock();
    await flush();
    await flush();
    const launcher = await screen.findByRole("button", {
      name: "AI 챗 열기, 오늘 사용량을 다 썼어요",
    });
    fireEvent.click(launcher);
    await flush();
    const chat = screen.getByRole("dialog", { name: "AI 챗" });

    expect(
      within(chat).getByRole("heading", { name: "오늘 사용량을 다 썼어요" }),
    ).toBeInTheDocument();
    expect(within(chat).getByText(/뒤 다시 물을 수 있어요$/)).toBeVisible();
    expect(
      within(chat).queryByRole("textbox", { name: "질문" }),
    ).not.toBeInTheDocument();
    expect(
      within(chat).queryByText("이렇게 물어보세요"),
    ).not.toBeInTheDocument();
    expect(within(chat).getByText("북쪽 문 장면 확인")).toBeInTheDocument();
  });

  it("tells the author with a toast when an answer uses up the day", async () => {
    await openAt(CHAT_DAILY_LIMIT - 1000);
    fireEvent.click(
      screen.getByRole("button", {
        name: "주요 인물과 연결된 설정을 정리해 줘",
      }),
    );
    for (
      let i = 0;
      i < 40 && !screen.queryByText(/뒤 다시 물을 수 있어요$/);
      i++
    )
      await flush(500);

    expect(screen.getByText("오늘 AI 챗 사용량을 다 썼어요")).toBeVisible();
    const chat = screen.getByRole("dialog", { name: "AI 챗" });
    expect(
      within(chat).getByRole("button", { name: "오늘 AI 챗 사용량 100%" }),
    ).toBeInTheDocument();
    expect(
      within(chat).getByRole("heading", { name: "오늘 사용량을 다 썼어요" }),
    ).toBeInTheDocument();
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

  it("shows what it reads and checks while the answer is on its way", async () => {
    renderDock();
    await flush();
    fireEvent.click(screen.getByRole("button", { name: /^AI 챗 열기/ }));
    await flush();
    fireEvent.click(
      screen.getByRole("button", {
        name: "주요 인물과 연결된 설정을 정리해 줘",
      }),
    );
    await flush(1000);
    const trace = screen.getByRole("status", { name: "답을 준비하는 과정" });
    expect(within(trace).getByText("작품 지도 확인")).toBeInTheDocument();
    expect(
      within(trace).getByText("읽을 문서를 고르는 중"),
    ).toBeInTheDocument();

    await flush(900);
    expect(within(trace).getByText("문서를 읽는 중")).toBeInTheDocument();
    expect(within(trace).getByText("레나 아르벨")).toBeInTheDocument();
    expect(
      within(trace).queryByText("읽을 문서를 고르는 중"),
    ).not.toBeInTheDocument();

    await flush(700);
    expect(within(trace).getByText("읽음")).toBeInTheDocument();
    expect(within(trace).getByText("더 읽을지 정하는 중")).toBeInTheDocument();

    await flush(700);
    expect(within(trace).getByText("답을 검토하는 중")).toBeInTheDocument();
    const chat = screen.getByRole("dialog", { name: "AI 챗" });
    expect(
      within(chat).getAllByText("주요 인물과 연결된 설정을 정리해 줘"),
    ).toHaveLength(1);
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
