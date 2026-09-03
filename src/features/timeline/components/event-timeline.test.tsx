import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

import {
  formatTimelineItemTime,
  groupTimelineItems,
  initialTimelineItems,
  type TimelineItem,
} from "../timeline-model";
import { EventTimeline } from "./event-timeline";

describe("EventTimeline", () => {
  it("formats date, order, and unscheduled time labels", () => {
    expect(formatTimelineItemTime(initialTimelineItems[0])).toBe(
      "1024. 3. 18. · 21:30",
    );
    expect(formatTimelineItemTime(initialTimelineItems[1])).toBe("순서 2");
    expect(formatTimelineItemTime(initialTimelineItems[2])).toBe("시간 미정");
  });

  it("groups all item variants in the prescribed reading order", () => {
    const groups = groupTimelineItems([
      initialTimelineItems[2],
      initialTimelineItems[0],
      initialTimelineItems[1],
    ]);

    expect(groups.map((group) => group.type)).toEqual([
      "date",
      "order",
      "unscheduled",
    ]);
    expect(groups[1].items.map((item) => item.id)).toEqual(["memory-route"]);
  });

  it("renders optional descriptions and references only when present", () => {
    const items: TimelineItem[] = [
      initialTimelineItems[0],
      {
        id: "plain-item",
        title: "정보가 없는 사건",
        type: "unscheduled",
      },
    ];
    const { container } = render(<EventTimeline items={items} />);

    const richItem = container.querySelector<HTMLElement>(
      '[data-timeline-item-id="lighthouse-stops"]',
    )!;
    expect(
      within(richItem).getByText("항구의 모든 부유 등대가 동시에 빛을 잃는다."),
    ).toBeInTheDocument();
    expect(
      within(richItem).getByLabelText("유리 등대가 멈추다 관련 파일"),
    ).toBeInTheDocument();

    const plainItem = container.querySelector<HTMLElement>(
      '[data-timeline-item-id="plain-item"]',
    )!;
    expect(plainItem.children).toHaveLength(2);
    expect(
      within(plainItem).queryByLabelText("정보가 없는 사건 관련 파일"),
    ).not.toBeInTheDocument();
  });

  it("renders the empty state with an add action", () => {
    render(<EventTimeline items={[]} />);
    expect(screen.getByText("아직 시간 항목이 없습니다")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "항목 추가" }),
    ).toBeInTheDocument();
  });

  it("opens the event timeline between properties and document content", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(
      within(screen.getByRole("region", { name: "파일" })).getByRole("button", {
        name: "균열의 밤",
      }),
    );

    expect(
      screen.getByRole("heading", { name: "시간 흐름" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "유리 등대가 멈추다 선택" }),
    ).toBeInTheDocument();
    const title = screen.getByRole("textbox", { name: "문서 제목" });
    const body = screen.getByRole("textbox", { name: "문서 내용" });
    expect(
      title.compareDocumentPosition(
        screen.getByRole("heading", { name: "시간 흐름" }),
      ) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      screen
        .getByRole("heading", { name: "시간 흐름" })
        .compareDocumentPosition(body) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
