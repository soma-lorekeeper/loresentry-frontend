import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GlobalFeedback } from "./global-feedback";

const feedbackUrl = "https://feedback.example/form";

describe("GlobalFeedback", () => {
  it("announces the external destination and restores focus after opening", async () => {
    const user = userEvent.setup();
    const openExternal = vi.fn().mockReturnValue({ closed: false });
    render(
      <GlobalFeedback feedbackUrl={feedbackUrl} openExternal={openExternal} />,
    );
    const trigger = screen.getByRole("button", {
      name: "피드백 보내기, 새 탭에서 열림",
    });

    await user.click(trigger);
    expect(openExternal).toHaveBeenCalledWith(feedbackUrl);
    expect(
      await screen.findByText("피드백 페이지를 새 탭에서 열었습니다."),
    ).toBeVisible();
    await waitFor(() => expect(trigger).toHaveFocus());
  });

  it("retains context and retries from the same location when blocked", async () => {
    const user = userEvent.setup();
    const openExternal = vi
      .fn()
      .mockReturnValueOnce(null)
      .mockReturnValueOnce({ closed: false });
    render(
      <GlobalFeedback feedbackUrl={feedbackUrl} openExternal={openExternal} />,
    );

    await user.click(screen.getByRole("button", { name: /피드백 보내기/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "피드백 페이지를 열지 못했어요.",
    );
    const retry = screen.getByRole("button", { name: "다시 열기" });
    await waitFor(() => expect(retry).toHaveFocus());
    await user.click(retry);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "피드백 페이지를 새 탭에서 열었습니다.",
    );
    expect(openExternal).toHaveBeenCalledTimes(2);
  });

  it("copies only the configured public link after a popup failure", async () => {
    const user = userEvent.setup();
    const copyFeedbackLink = vi.fn().mockResolvedValue(undefined);
    render(
      <GlobalFeedback
        copyFeedbackLink={copyFeedbackLink}
        feedbackUrl={feedbackUrl}
        openExternal={() => null}
      />,
    );

    await user.click(screen.getByRole("button", { name: /피드백 보내기/ }));
    await user.click(screen.getByRole("button", { name: "링크 복사" }));
    expect(copyFeedbackLink).toHaveBeenCalledWith(feedbackUrl);
    expect(await screen.findByRole("status")).toHaveTextContent(
      "피드백 링크를 복사했어요.",
    );
  });

  it("reports a recoverable error when no deployment URL is configured", async () => {
    const user = userEvent.setup();
    render(<GlobalFeedback />);

    await user.click(screen.getByRole("button", { name: /피드백 보내기/ }));
    expect(await screen.findByRole("alert")).toBeVisible();
    expect(screen.getByRole("button", { name: "링크 복사" })).toBeDisabled();
  });
});
