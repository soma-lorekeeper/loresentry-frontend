import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { renderWithServices } from "@/test/render";
import { setMockRule } from "@/services/mock/control";
import { sentFeedback } from "@/services/mock/feedback";

import { useFeedback } from "./feedback-provider";

function Opener() {
  const feedback = useFeedback();
  return (
    <button type="button" onClick={feedback.open}>
      피드백 열기
    </button>
  );
}

describe("FeedbackProvider", () => {
  beforeEach(() => {
    sentFeedback.length = 0;
  });

  it("sends the text and the page", async () => {
    const actor = userEvent.setup();
    renderWithServices(<Opener />);
    await actor.click(screen.getByRole("button", { name: "피드백 열기" }));

    const send = screen.getByRole("button", { name: "보내기" });
    expect(send).toBeDisabled();
    await actor.type(
      screen.getByRole("textbox"),
      "  타임라인을 인쇄하고 싶어요  ",
    );
    await actor.click(send);

    await waitFor(() => expect(sentFeedback).toHaveLength(1));
    expect(screen.queryByRole("radio")).toBeNull();
    expect(sentFeedback[0]).toMatchObject({
      message: "타임라인을 인쇄하고 싶어요",
      page: "/",
    });
    expect(await screen.findByText("피드백을 보냈어요")).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("keeps the text and offers a retry when sending fails", async () => {
    const actor = userEvent.setup();
    renderWithServices(<Opener />, {
      before: () => setMockRule("feedback.send", "fail"),
    });
    await actor.click(screen.getByRole("button", { name: "피드백 열기" }));
    await actor.type(screen.getByRole("textbox"), "저장이 느려요");
    await actor.click(screen.getByRole("button", { name: "보내기" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "쓴 내용은 그대로 있으니",
    );
    expect(screen.getByRole("textbox")).toHaveValue("저장이 느려요");
    expect(
      screen.getByRole("button", { name: "다시 보내기" }),
    ).toBeInTheDocument();
  });

  it("remembers an unsent draft after closing", async () => {
    const actor = userEvent.setup();
    renderWithServices(<Opener />);
    await actor.click(screen.getByRole("button", { name: "피드백 열기" }));
    await actor.type(screen.getByRole("textbox"), "쓰다 만 글");
    await actor.click(screen.getByRole("button", { name: "취소" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await actor.click(screen.getByRole("button", { name: "피드백 열기" }));
    expect(screen.getByRole("textbox")).toHaveValue("쓰다 만 글");
  });
});
