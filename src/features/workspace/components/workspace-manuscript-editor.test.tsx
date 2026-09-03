import { useState } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import {
  createInitialManuscriptDocument,
  type ManuscriptDocument,
  WorkspaceManuscriptEditor,
} from "./workspace-manuscript-editor";

function TestEditor({
  documentId,
  initialTitle,
}: {
  documentId: string;
  initialTitle: string;
}) {
  const [document, setDocument] = useState<ManuscriptDocument>(() =>
    createInitialManuscriptDocument(documentId, initialTitle),
  );

  return (
    <WorkspaceManuscriptEditor
      document={document}
      documentId={documentId}
      focusRequest={0}
      onChange={setDocument}
      onFocusTargetChange={() => undefined}
      onRetrySave={() => undefined}
    />
  );
}

describe("Workspace manuscript editor", () => {
  it("provides an editable title and body in keyboard order", async () => {
    const user = userEvent.setup();
    render(
      <TestEditor documentId="manuscript-test" initialTitle="테스트 원고" />,
    );

    const title = screen.getByRole("textbox", { name: "원고 제목" });
    const body = screen.getByRole("textbox", { name: "원고 본문" });

    title.focus();
    await user.tab();
    expect(body).toHaveFocus();

    await user.type(body, "첫 문장입니다.");
    expect(body).toHaveValue("첫 문장입니다.");
    expect(screen.getByText("공백 포함 8자")).toBeInTheDocument();
    expect(screen.getByText("공백 제외 7자")).toBeInTheDocument();
  });

  it("supports empty and long manuscripts without a horizontal text wrap mode", async () => {
    render(<TestEditor documentId="empty-manuscript" initialTitle="" />);

    const body = screen.getByRole("textbox", { name: "원고 본문" });
    expect(body).toHaveAttribute("wrap", "soft");
    expect(body).toHaveAttribute("placeholder", "이야기를 시작하세요.");

    const longText = "가".repeat(2_000);
    fireEvent.change(body, { target: { value: longText } });
    expect(body).toHaveValue(longText);
    expect(screen.getByText("공백 포함 2,000자")).toBeInTheDocument();
  });
});
