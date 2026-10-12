import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { bodyFromParagraphs } from "@/domain/document-body";
import type { DocumentProperty } from "@/domain/models";

import {
  DocumentDiff,
  type DiffSnapshot,
  type DiffTarget,
} from "./document-diff";

const TARGETS: Record<string, DiffTarget> = {
  "ch-11": {
    title: "11화 · 유리 정원",
    icon: "file-text",
    docType: "manuscript",
  },
  "ch-12": {
    title: "12화 · 균열의 밤",
    icon: "file-text",
    docType: "manuscript",
  },
};
const lookup = (id: string): DiffTarget =>
  TARGETS[id] ?? { title: "삭제된 파일", icon: "file" };

function snapshot(
  description: string,
  chapters: string[],
  body: string,
): DiffSnapshot {
  const properties: DocumentProperty[] = [
    {
      id: "p-1",
      kind: "text",
      key: "description",
      label: "설명",
      value: description,
    },
    {
      id: "p-2",
      kind: "relation",
      key: "related_manuscript",
      label: "관련 원고",
      targetType: "manuscript",
      targetIds: chapters,
      descriptions: {},
    },
    { id: "p-3", kind: "text", key: "age", label: "나이", value: "스물넷" },
  ];
  return {
    title: "레나 아르벨",
    docType: "character",
    body: bodyFromParagraphs(body),
    properties,
  };
}

function renderDiff() {
  return render(
    <DocumentDiff
      left={snapshot(
        "기억 항로를 읽어 내는 항해사",
        ["ch-11"],
        "레나는 길을 잃지 않았다.\n안개가 걷혔다.",
      )}
      right={snapshot(
        "기억 항로를 읽어 내는 은빛 항해단의 항해사",
        ["ch-11", "ch-12"],
        "레나는 한 번도 길을 잃지 않았다.\n안개가 걷혔다.",
      )}
      labels={{ left: "선택한 버전", right: "현재 문서" }}
      notes={{ left: "10월 13일 01:33" }}
      lookup={lookup}
    />,
  );
}

/** 그 이름의 속성 줄에서 한쪽 칸. */
function cell(container: HTMLElement, label: string, side: "left" | "right") {
  const cells = Array.from(
    container.querySelectorAll<HTMLElement>(`[data-side="${side}"]`),
  ).filter((node) => node.firstElementChild?.textContent === label);
  expect(cells).toHaveLength(1);
  return cells[0];
}

describe("DocumentDiff", () => {
  it("names the two versions and says when the left one was kept", () => {
    renderDiff();

    expect(
      screen.getByRole("heading", { name: "선택한 버전" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "현재 문서" }),
    ).toBeInTheDocument();
    expect(screen.getByText("10월 13일 01:33")).toBeInTheDocument();
  });

  it("tells assistive technology which side each value belongs to", () => {
    renderDiff();

    // 두 쪽의 칸이 줄마다 번갈아 놓인다. 이름이 없으면 "설명 … 설명 …" 으로만 읽힌다.
    expect(
      screen.getByRole("group", { name: "선택한 버전의 설명" }),
    ).toHaveTextContent("기억 항로를 읽어 내는 항해사");
    expect(
      screen.getByRole("group", { name: "현재 문서의 설명" }),
    ).toHaveTextContent("은빛 항해단의");
  });

  it("marks the rows that differ and leaves the same ones alone", () => {
    const { container } = renderDiff();

    // 달라진 줄은 두 쪽 모두 띠를 깐다. 같은 줄은 깔지 않는다.
    for (const side of ["left", "right"] as const) {
      expect(cell(container, "설명", side)).toHaveAttribute("data-changed");
      expect(cell(container, "관련 원고", side)).toHaveAttribute(
        "data-changed",
      );
      expect(cell(container, "나이", side)).not.toHaveAttribute("data-changed");
      expect(cell(container, "분류", side)).not.toHaveAttribute("data-changed");
    }
  });

  it("points at the words that changed inside a row", () => {
    const { container } = renderDiff();

    // 줄 전체의 띠만으로는 무엇이 바뀌었는지 두 줄을 번갈아 읽어야 안다. 낱말을 한 번 더 짚는다.
    const marks = Array.from(
      cell(container, "설명", "right").querySelectorAll("mark"),
    ).map((mark) => mark.textContent);
    expect(marks.join("")).toContain("은빛 항해단의");
    expect(cell(container, "설명", "left").textContent).toContain(
      "기억 항로를 읽어 내는 항해사",
    );
  });

  it("shows relations as chips and singles out the one the other side lacks", () => {
    const { container } = renderDiff();
    const right = cell(container, "관련 원고", "right");

    expect(within(right).getByText("11화 · 유리 정원")).toBeInTheDocument();
    const added = within(right).getByText("12화 · 균열의 밤").parentElement!;
    const kept = within(right).getByText("11화 · 유리 정원").parentElement!;
    // 반대편에 없는 대상만 다른 모양이다(둘의 클래스가 다르다).
    expect(added.className).not.toBe(kept.className);
    expect(added).toHaveAttribute("data-kind", "manuscript");
  });

  it("only reads: nothing can be edited or pushed across", () => {
    const { container } = renderDiff();

    // 변경 사항 창에는 값을 옮기는 화살표와 입력란이 있다. 여기에는 없다.
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.queryAllByRole("textbox")).toHaveLength(0);
    expect(container.querySelector("[contenteditable]")).toBeNull();
  });

  it("shows the body of each version and marks the changed line", () => {
    const { container } = renderDiff();
    const left = screen.getByRole("group", { name: "선택한 버전 본문" });
    const right = screen.getByRole("group", { name: "현재 문서 본문" });

    expect(left).toHaveTextContent("레나는 길을 잃지 않았다.");
    expect(right).toHaveTextContent("레나는 한 번도 길을 잃지 않았다.");
    const changed = (pane: HTMLElement) =>
      Array.from(pane.querySelectorAll("[data-changed]")).map(
        (line) => line.textContent,
      );
    expect(changed(left)).toEqual(["레나는 길을 잃지 않았다."]);
    expect(changed(right)).toEqual(["레나는 한 번도 길을 잃지 않았다."]);
    // 같은 줄은 그대로다.
    expect(container.textContent).toContain("안개가 걷혔다.");
  });

  it("says which side to show when there is room for only one", () => {
    const { container, rerender } = renderDiff();
    expect(container.firstElementChild).not.toHaveAttribute("data-only");

    rerender(
      <DocumentDiff
        left={snapshot("가", [], "본문")}
        right={snapshot("나", [], "본문")}
        labels={{ left: "선택한 버전", right: "현재 문서" }}
        only="right"
        lookup={lookup}
      />,
    );

    // 어느 쪽을 접을지는 CSS 가 화면 폭을 보고 정한다. 여기서는 고른 쪽만 알려 준다.
    expect(container.firstElementChild).toHaveAttribute("data-only", "right");
  });
});
