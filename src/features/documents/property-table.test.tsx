import { render, screen } from "@testing-library/react";
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
    revisionNo: 1,
    updatedAt: "2026-01-01T00:00:00Z",
    trashedAt: null,
  };
}

describe("PropertyTable relations", () => {
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
