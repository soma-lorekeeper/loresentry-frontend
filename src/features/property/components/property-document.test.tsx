import { useState } from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

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
        initialDocument={{
          body: "",
          properties: [],
          saveStatus: "saved",
          title: "장소",
        }}
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

  it("announces changed, saving, saved, and recoverable error states", () => {
    const { rerender } = render(
      <PropertyDocumentEditor
        document={{
          body: "보존할 입력",
          properties: [],
          saveStatus: "changed",
          title: "변경된 문서",
        }}
        documentId="status-test"
        onChange={() => undefined}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "변경됨 · 백엔드 연결 대기",
    );
    for (const [status, copy] of [
      ["saving", "저장 중…"],
      ["saved", "저장됨"],
      ["error", "저장하지 못했습니다"],
    ] as const) {
      rerender(
        <PropertyDocumentEditor
          document={{
            body: "보존할 입력",
            properties: [],
            saveStatus: status,
            title: "변경된 문서",
          }}
          documentId="status-test"
          onChange={() => undefined}
          onRetrySave={() => undefined}
        />,
      );
      expect(screen.getByRole("status")).toHaveTextContent(copy);
      expect(screen.getByRole("textbox", { name: "문서 내용" })).toHaveValue(
        "보존할 입력",
      );
    }
    expect(
      screen.getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
  });

  it("does not report a successful save without a backend adapter", async () => {
    const user = userEvent.setup();
    render(<WorkspaceShell initialProjectId="glass-garden" />);

    await user.click(
      within(screen.getByRole("region", { name: "파일" })).getByRole("button", {
        name: "설정",
      }),
    );
    await user.type(
      screen.getByRole("textbox", { name: "문서 내용" }),
      " 추가",
    );

    expect(screen.getByRole("status")).toHaveTextContent(
      "변경됨 · 백엔드 연결 대기",
    );
    expect(screen.getByRole("status")).not.toHaveTextContent("저장됨");
  });

  it("preserves edits through a failed save and retries the backend adapter", async () => {
    const user = userEvent.setup();
    const savePropertyDocument = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce();
    render(
      <WorkspaceShell
        initialProjectId="glass-garden"
        savePropertyDocument={savePropertyDocument}
      />,
    );

    await user.click(
      within(screen.getByRole("region", { name: "파일" })).getByRole("button", {
        name: "설정",
      }),
    );
    const body = screen.getByRole("textbox", { name: "문서 내용" });
    await user.type(body, " 유지할 문장");

    expect(screen.getByRole("status")).toHaveTextContent("변경됨");
    await screen.findByText("저장하지 못했습니다");
    expect((body as HTMLTextAreaElement).value).toContain("유지할 문장");

    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    await screen.findByText("저장됨");
    expect(savePropertyDocument).toHaveBeenCalledTimes(2);
    expect((body as HTMLTextAreaElement).value).toContain("유지할 문장");
  });
});
