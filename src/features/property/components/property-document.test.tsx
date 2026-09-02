import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createInitialPropertyDocument,
  type PropertyDocument,
  PropertyDocumentEditor,
  type PropertyReference,
} from "./property-document";

const availableFiles: PropertyReference[] = [
  { id: "place-garden", title: "유리 정원", type: "place" },
  { id: "place-north", title: "북쪽 온실", type: "place" },
  { id: "character", title: "서윤", type: "character" },
];

function TestEditor({
  initialDocument,
}: {
  initialDocument?: PropertyDocument;
}) {
  const [document, setDocument] = useState(
    initialDocument ?? createInitialPropertyDocument("setting", "설정"),
  );
  return (
    <PropertyDocumentEditor
      availableFiles={availableFiles}
      document={document}
      documentId="setting"
      onChange={setDocument}
    />
  );
}

describe("PropertyDocumentEditor", () => {
  it("renders text and file-reference properties with a shared row structure", () => {
    const { container } = render(<TestEditor />);

    expect(screen.getByRole("textbox", { name: "분류 값" })).toHaveValue(
      "마법 체계",
    );
    expect(
      screen.getByRole("button", { name: "12화 · 균열의 밤 열기" }),
    ).toBeInTheDocument();
    expect(container.querySelectorAll("[data-property-id]")).toHaveLength(2);
    expect(
      container.querySelector('[data-property-kind="text"]'),
    ).toBeInTheDocument();
    expect(
      container.querySelector('[data-property-kind="file"]'),
    ).toBeInTheDocument();
  });

  it("adds a property, opens its type menu, and adds a filtered file reference", async () => {
    const user = userEvent.setup();
    render(
      <TestEditor
        initialDocument={{ body: "", properties: [], title: "장소" }}
      />,
    );

    await user.click(screen.getByRole("button", { name: "속성 추가" }));
    const name = screen.getByRole("textbox", { name: "속성 이름" });
    await waitFor(() => expect(name).toHaveFocus());
    await user.type(name, "상위 장소");

    const typeMenu = await screen.findByRole("menu", {
      name: "상위 장소 유형",
    });
    await user.click(
      within(typeMenu).getByRole("menuitemradio", { name: "장소" }),
    );
    await user.click(
      screen.getByRole("button", { name: "장소 파일 참조 추가" }),
    );

    const fileMenu = screen.getByRole("menu", { name: "장소 파일 선택" });
    expect(within(fileMenu).queryByText("서윤")).not.toBeInTheDocument();
    await user.click(
      within(fileMenu).getByRole("menuitem", { name: "북쪽 온실" }),
    );

    expect(
      screen.getByRole("button", { name: "북쪽 온실 열기" }),
    ).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "북쪽 온실 참조 제거" }),
    );
    expect(
      screen.queryByRole("button", { name: "북쪽 온실 열기" }),
    ).not.toBeInTheDocument();
  });

  it("supports arrow navigation and returns focus on Escape", async () => {
    const user = userEvent.setup();
    render(<TestEditor />);
    const trigger = screen.getByRole("button", { name: "분류 유형: 텍스트" });

    trigger.focus();
    await user.keyboard("{ArrowDown}");
    await user.click(trigger);
    const first = screen.getByRole("menuitemradio", { name: "텍스트" });
    await waitFor(() => expect(first).toHaveFocus());
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitemradio", { name: "원고" })).toHaveFocus();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
