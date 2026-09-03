import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { createHelpScenario } from "../help-states";
import { WorkspaceHelp, type WorkspaceHelpProps } from "./workspace-help";

type OpenExternal = NonNullable<WorkspaceHelpProps["openExternal"]>;

describe("WorkspaceHelp", () => {
  it("navigates topics and articles with keyboard-readable back actions", async () => {
    const user = userEvent.setup();
    render(<WorkspaceHelp />);

    await user.click(screen.getByRole("button", { name: /사용 가이드/ }));
    expect(
      screen.getByRole("heading", { level: 1, name: "사용 가이드" }),
    ).toBeInTheDocument();

    const first = screen.getByRole("button", { name: /작업공간 시작하기/ });
    const second = screen.getByRole("button", { name: /파일과 속성 문서/ });
    first.focus();
    await user.keyboard("{ArrowDown}");
    expect(second).toHaveFocus();
    await user.keyboard("{Enter}");

    expect(
      screen.getByRole("heading", { level: 1, name: "파일과 속성 문서" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", { name: "이 문서의 목차" }),
    ).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "가이드 목록으로" }));
    await user.click(screen.getByRole("button", { name: "도움말로 돌아가기" }));
    expect(
      screen.getByRole("heading", { level: 1, name: "도움말" }),
    ).toBeInTheDocument();
  });

  it("keeps the query in the empty state and can clear it", async () => {
    const user = userEvent.setup();
    render(
      <WorkspaceHelp
        initialScenario={createHelpScenario("help-guide-search-empty")}
      />,
    );

    const search = screen.getByRole("searchbox", { name: "가이드 검색" });
    expect(search).toHaveValue("협업 권한");
    expect(screen.getByRole("status")).toHaveTextContent(
      "일치하는 가이드가 없습니다",
    );
    await user.click(screen.getByRole("button", { name: "검색 지우기" }));
    expect(search).toHaveValue("");
    expect(
      screen.getByRole("button", { name: /작업공간 시작하기/ }),
    ).toBeInTheDocument();
  });

  it("retains the selected article and retries a load error", async () => {
    const user = userEvent.setup();
    const loadGuideArticle = vi.fn().mockResolvedValue(undefined);
    render(
      <WorkspaceHelp
        initialScenario={createHelpScenario("help-guide-load-error")}
        loadGuideArticle={loadGuideArticle}
      />,
    );

    expect(screen.getByRole("alert")).toHaveTextContent("작업공간 시작하기");
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(loadGuideArticle).toHaveBeenCalledWith("workspace-start");
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(
      screen.getByRole("heading", { level: 1, name: "작업공간 시작하기" }),
    ).toBeInTheDocument();
  });

  it("opens feedback without project data and restores focus", async () => {
    const user = userEvent.setup();
    const openExternal = vi.fn<OpenExternal>(() => ({}) as Window);
    render(
      <WorkspaceHelp
        feedbackUrl="https://feedback.example/form"
        openExternal={openExternal}
      />,
    );

    const feedback = screen.getByRole("button", {
      name: "피드백 보내기, 새 탭에서 열림",
    });
    await user.click(feedback);

    expect(openExternal).toHaveBeenCalledWith("https://feedback.example/form");
    expect(openExternal.mock.calls[0][0]).not.toContain("glass-garden");
    expect(screen.getByRole("status")).toHaveTextContent(
      "피드백 페이지를 새 탭에서 열었습니다",
    );
    await waitFor(() => expect(feedback).toHaveFocus());
  });

  it("offers retry and link copy when the feedback tab is blocked", async () => {
    const user = userEvent.setup();
    const copyFeedbackLink = vi.fn().mockResolvedValue(undefined);
    const openExternal = vi.fn<OpenExternal>(() => null);
    render(
      <WorkspaceHelp
        copyFeedbackLink={copyFeedbackLink}
        feedbackUrl="https://feedback.example/form"
        openExternal={openExternal}
      />,
    );

    await user.click(
      screen.getByRole("button", {
        name: "피드백 보내기, 새 탭에서 열림",
      }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "피드백 페이지를 열지 못했습니다",
    );
    await user.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(copyFeedbackLink).toHaveBeenCalledWith(
      "https://feedback.example/form",
    );
    await user.click(screen.getByRole("button", { name: "다시 열기" }));
    expect(openExternal).toHaveBeenCalledTimes(2);
  });
});
