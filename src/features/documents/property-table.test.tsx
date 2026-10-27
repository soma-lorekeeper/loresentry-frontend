import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { DocumentNode, RelationProperty } from "@/domain/models";

import { PropertyTable } from "./property-table";

function place(id: string, title: string): DocumentNode {
  return {
    kind: "document",
    id,
    projectId: "project",
    parentId: null,
    title,
    docType: "place",
    rank: "1024",
    locked: false,
    refreshLocked: false,
    revisionNo: 1,
    updatedAt: "2026-01-01T00:00:00Z",
    trashedAt: null,
  };
}

describe("PropertyTable relations", () => {
  it("offers a missing setting description without saving until the user types", () => {
    const onChange = vi.fn();
    render(
      <PropertyTable
        fileId="empty-character"
        docType="character"
        properties={[]}
        nodes={[]}
        episode={null}
        episodes={[]}
        readOnly={false}
        onChange={onChange}
        onChangeType={() => {}}
        onMoveToEpisode={() => {}}
        onOpenFile={() => {}}
      />,
    );
    const input = screen.getByRole("textbox", { name: "설명" });
    expect(input).toHaveValue("");
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "입력한 캐릭터 설명" } });
    expect(onChange).toHaveBeenLastCalledWith([
      {
        id: "empty-character:description",
        kind: "text",
        key: "description",
        label: "설명",
        value: "입력한 캐릭터 설명",
      },
    ]);
  });
  it("keeps the notes on existing links when another document is linked", async () => {
    // 그래프의 엣지 위에 보이는 글자가 이 설명이다. 칩을 하나 더할 때 지워지면 안 된다.
    const relation: RelationProperty = {
      id: "doc:related_place",
      kind: "relation",
      key: "related_place",
      label: "관련 장소",
      targetType: "place",
      targetIds: ["range"],
      descriptions: { range: "처음 각성한 곳" },
    };
    const onChange = vi.fn();
    render(
      <PropertyTable
        fileId="doc"
        docType="character"
        properties={[relation]}
        nodes={[place("range", "유리 산맥"), place("north", "북쪽 온실")]}
        episode={null}
        episodes={[]}
        readOnly={false}
        onChange={onChange}
        onChangeType={() => {}}
        onMoveToEpisode={() => {}}
        onOpenFile={() => {}}
      />,
    );

    await userEvent.click(
      screen.getByRole("button", { name: "관련 장소 추가" }),
    );
    await userEvent.click(screen.getByRole("option", { name: "북쪽 온실" }));

    expect(onChange).toHaveBeenCalledWith([
      {
        ...relation,
        targetIds: ["range", "north"],
        descriptions: { range: "처음 각성한 곳" },
      },
    ]);
  });
});

describe("PropertyTable key settings", () => {
  const table = (docType: "place" | "manuscript", coreCount: number) => {
    const onRevealCore = vi.fn();
    render(
      <PropertyTable
        fileId="north"
        docType={docType}
        properties={[]}
        nodes={[]}
        episode={null}
        episodes={[]}
        readOnly={false}
        coreCount={coreCount}
        onRevealCore={onRevealCore}
        onChange={() => {}}
        onChangeType={() => {}}
        onMoveToEpisode={() => {}}
        onOpenFile={() => {}}
      />,
    );
    return onRevealCore;
  };

  it("counts the marked paragraphs and jumps to the first one", async () => {
    const onRevealCore = table("place", 2);
    await userEvent.click(
      screen.getByRole("button", { name: "중요 설정 2개 · 첫 문단으로 가기" }),
    );
    expect(onRevealCore).toHaveBeenCalledTimes(1);
  });

  it("has no row when nothing is marked or the document is a manuscript", () => {
    table("place", 0);
    expect(screen.queryByText("중요 설정")).toBeNull();
  });

  it("never shows the row on a manuscript", () => {
    table("manuscript", 3);
    expect(screen.queryByText("중요 설정")).toBeNull();
  });
});
