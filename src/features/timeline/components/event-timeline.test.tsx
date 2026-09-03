import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

import {
  formatTimelineItemTime,
  groupTimelineItems,
  initialTimelineItems,
  type TimelineItem,
} from "../timeline-model";
import { EventTimeline } from "./event-timeline";

interface TimelineHarnessProps {
  deleteItem?: (itemId: string) => Promise<void>;
  saveItem?: (item: TimelineItem) => Promise<void>;
}

function TimelineHarness({ deleteItem, saveItem }: TimelineHarnessProps) {
  const [items, setItems] = useState<TimelineItem[]>(initialTimelineItems);
  return (
    <EventTimeline
      availableFiles={[{ id: "new-place", title: "북쪽 온실", type: "place" }]}
      deleteItem={deleteItem}
      eventTitle="균열의 밤"
      items={items}
      onItemsChange={setItems}
      saveItem={saveItem}
    />
  );
}

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
      screen.getByRole("button", { name: "시간 항목 추가" }),
    ).toBeInTheDocument();
  });

  it("starts an unscheduled draft and exposes fields for each time type", async () => {
    const user = userEvent.setup();
    render(<EventTimeline items={[]} />);

    await user.click(screen.getByRole("button", { name: "시간 항목 추가" }));
    const editor = screen.getByRole("region", { name: "새 시간 항목" });
    const title = within(editor).getByRole("textbox", { name: "항목 제목" });
    await waitFor(() => expect(title).toHaveFocus());
    expect(
      within(editor).getByRole("button", { name: "미정" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(within(editor).getByRole("button", { name: "완료" })).toBeDisabled();

    await user.type(title, "새 사건");
    await user.click(within(editor).getByRole("button", { name: "날짜·시간" }));
    expect(
      within(editor).getByRole("textbox", { name: "날짜" }),
    ).toBeInTheDocument();
    expect(within(editor).getByRole("button", { name: "완료" })).toBeDisabled();

    await user.click(within(editor).getByRole("button", { name: "순서" }));
    expect(within(editor).getByText(/현재 순서 그룹의/)).toBeInTheDocument();
    expect(
      within(editor).queryByRole("textbox", { name: "날짜" }),
    ).not.toBeInTheDocument();
  });

  it("does not report a save when the backend adapter is disconnected", async () => {
    const user = userEvent.setup();
    render(<EventTimeline items={[]} />);

    await user.click(screen.getByRole("button", { name: "시간 항목 추가" }));
    const editor = screen.getByRole("region", { name: "새 시간 항목" });
    await user.type(
      within(editor).getByRole("textbox", { name: "항목 제목" }),
      "저장 대기 사건",
    );
    await user.click(within(editor).getByRole("button", { name: "완료" }));

    expect(within(editor).getByRole("status")).toHaveTextContent(
      "변경됨 · 백엔드 연결 대기",
    );
    expect(
      screen.getByRole("region", { name: "새 시간 항목" }),
    ).toBeInTheDocument();
    expect(screen.queryByText("시간 미정", { selector: "span" })).toBeNull();
  });

  it("preserves failed input and retries the same timeline item", async () => {
    const user = userEvent.setup();
    const saveItem = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValue(undefined);
    render(<TimelineHarness saveItem={saveItem} />);

    await user.click(screen.getByRole("button", { name: "시간 항목 추가" }));
    const editor = screen.getByRole("region", { name: "새 시간 항목" });
    const title = within(editor).getByRole("textbox", { name: "항목 제목" });
    await user.type(title, "잃어버린 지도 발견");
    await user.click(within(editor).getByRole("button", { name: "완료" }));

    await waitFor(() =>
      expect(within(editor).getByRole("alert")).toHaveTextContent(
        "저장하지 못했습니다. 입력은 유지됩니다.",
      ),
    );
    expect(title).toHaveValue("잃어버린 지도 발견");

    await user.click(within(editor).getByRole("button", { name: "다시 시도" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "잃어버린 지도 발견 선택" }),
      ).toBeInTheDocument(),
    );
    expect(saveItem).toHaveBeenCalledTimes(2);
    expect(saveItem.mock.calls[1]?.[0]).toMatchObject({
      title: "잃어버린 지도 발견",
      type: "unscheduled",
    });
    expect(
      screen.queryByRole("region", { name: "새 시간 항목" }),
    ).not.toBeInTheDocument();
  });

  it("selects and edits an existing item, then restores focus on Escape", async () => {
    const user = userEvent.setup();
    const saveItem = vi.fn().mockResolvedValue(undefined);
    const { container } = render(<TimelineHarness saveItem={saveItem} />);
    const select = screen.getByRole("button", {
      name: "유리 등대가 멈추다 선택",
    });

    await user.click(select);
    expect(
      container.querySelector('[data-timeline-item-id="lighthouse-stops"]'),
    ).toHaveAttribute("data-selected", "true");

    await user.click(
      screen.getByRole("button", { name: "유리 등대가 멈추다 더보기" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "편집" }));
    const editor = screen.getByRole("region", {
      name: "유리 등대가 멈추다 편집",
    });
    const title = within(editor).getByRole("textbox", { name: "항목 제목" });
    await waitFor(() => expect(title).toHaveFocus());
    expect(title).toHaveValue("유리 등대가 멈추다");

    await user.keyboard("{Escape}");
    await waitFor(() => expect(select).toHaveFocus());
    expect(
      screen.queryByRole("region", { name: "유리 등대가 멈추다 편집" }),
    ).not.toBeInTheDocument();
  });

  it("keeps a disconnected deletion and returns focus to its item", async () => {
    const user = userEvent.setup();
    render(<TimelineHarness />);

    await user.click(
      screen.getByRole("button", { name: "유리 등대가 멈추다 더보기" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    const dialog = screen.getByRole("dialog", {
      name: "시간 항목을 삭제할까요?",
    });
    const cancel = within(dialog).getByRole("button", { name: "취소" });
    await waitFor(() => expect(cancel).toHaveFocus());
    expect(dialog).toHaveTextContent("균열의 밤 · 날짜·시간");
    expect(dialog).toHaveTextContent("유리 등대가 멈추다 · 1024. 3. 18. 21:30");

    await user.click(within(dialog).getByRole("button", { name: "삭제" }));
    expect(within(dialog).getByRole("alert")).toHaveTextContent(
      "백엔드 삭제 기능이 연결되지 않았습니다",
    );
    expect(
      screen.getByRole("button", { name: "유리 등대가 멈추다 선택" }),
    ).toBeInTheDocument();

    await user.click(cancel);
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "유리 등대가 멈추다 선택" }),
      ).toHaveFocus(),
    );
  });

  it("deletes only after backend confirmation and focuses the next item", async () => {
    const user = userEvent.setup();
    const deleteItem = vi.fn().mockResolvedValue(undefined);
    render(<TimelineHarness deleteItem={deleteItem} />);

    await user.click(
      screen.getByRole("button", { name: "유리 등대가 멈추다 더보기" }),
    );
    await user.click(screen.getByRole("menuitem", { name: "삭제" }));
    await user.click(screen.getByRole("button", { name: "삭제" }));

    await waitFor(() =>
      expect(deleteItem).toHaveBeenCalledWith("lighthouse-stops"),
    );
    expect(
      screen.queryByRole("button", { name: "유리 등대가 멈추다 선택" }),
    ).not.toBeInTheDocument();
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "기억 항로를 복원하다 선택" }),
      ).toHaveFocus(),
    );
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
