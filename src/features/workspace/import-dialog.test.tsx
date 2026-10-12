import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { bodyToPlainText } from "@/domain/document-body";
import { setMockRule } from "@/services/mock/control";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { ImportDialog } from "./import-dialog";
import { createLayout } from "./model/layout";
import { categoryFolderOf } from "./model/tree";
import { useWorkspace, WorkspaceProvider } from "./workspace-context";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

/** 지금 보고 있는 문서. 가져온 뒤 무엇이 열렸는지 본다. */
function OpenFile() {
  const { activeFileId } = useWorkspace();
  return <output aria-label="열린 문서">{activeFileId ?? ""}</output>;
}

function Harness({ onClose }: { onClose: () => void }) {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return (
    <WorkspaceProvider
      project={project}
      user={user}
      initialLayout={createLayout({ kind: "new" })}
    >
      <ImportDialog onClose={onClose} />
      <OpenFile />
    </WorkspaceProvider>
  );
}

function renderDialog() {
  const onClose = vi.fn();
  renderWithServices(<Harness onClose={onClose} />);
  return { onClose };
}

function file(name: string, text: string) {
  return new File([text], name, { type: "text/plain", lastModified: 1 });
}

/** 파일 선택 창에서 고른 것처럼 올린다. 숨긴 input 은 화면의 단추가 대신 누른다. */
async function choose(
  actor: ReturnType<typeof userEvent.setup>,
  files: File[],
) {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await actor.upload(input, files);
}

/** 탐색기에서 끌어다 놓은 것처럼 올린다. */
function drop(files: File[]) {
  const dataTransfer = { types: ["Files"], files };
  fireEvent.dragEnter(window, { dataTransfer });
  fireEvent.drop(window, { dataTransfer });
}

const manuscripts = () =>
  getDb().files.filter(
    (node) => node.kind === "document" && node.docType === "manuscript",
  );
const staged = () => screen.getByRole("list", { name: "가져올 파일" });
const importButton = () => screen.getByRole("button", { name: "가져오기" });

describe("ImportDialog", () => {
  it("lists the chosen files and creates nothing when it is cancelled", async () => {
    const actor = userEvent.setup();
    const { onClose } = renderDialog();
    const before = manuscripts().length;
    // 아무것도 올리지 않았으면 가져올 것이 없다.
    expect(
      await screen.findByRole("button", { name: "가져오기" }),
    ).toBeDisabled();

    await choose(actor, [
      file("13화 · 북쪽 문.md", "# 북쪽 문"),
      file("14화 · 유리 온실.txt", "안개가 걷혔다."),
    ]);

    // 이름이 만들어질 원고의 제목으로 보인다(확장자는 뗀다).
    const rows = within(staged()).getAllByRole("listitem");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent("13화 · 북쪽 문");
    expect(rows[0]).toHaveTextContent("마크다운");
    expect(rows[1]).toHaveTextContent("14화 · 유리 온실");
    expect(rows[1]).toHaveTextContent("텍스트");
    expect(screen.getByText("파일 2개")).toBeInTheDocument();
    // 올려 두기만 했다. 서버에는 아무것도 없다.
    expect(manuscripts()).toHaveLength(before);

    await actor.click(screen.getByRole("button", { name: "취소" }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(manuscripts()).toHaveLength(before);
    expect(
      screen.getByRole("status", { name: "열린 문서" }),
    ).toBeEmptyDOMElement();
  });

  it("creates the manuscripts in the manuscript folder and opens the first", async () => {
    const actor = userEvent.setup();
    const { onClose } = renderDialog();
    await screen.findByRole("button", { name: "가져오기" });
    const before = manuscripts().length;

    await choose(actor, [
      // 확장자의 대소문자를 가리지 않는다. 마크다운으로 읽어야 제목 기호가 본문에 남지 않는다.
      file("북쪽 문.MD", "# 북쪽 문\n\n안개가 걷혔다."),
      file("유리 온실.txt", "첫 줄\n둘째 줄"),
    ]);
    await waitFor(() => expect(importButton()).toBeEnabled());
    await actor.click(importButton());

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    const folder = categoryFolderOf(getDb().files, "manuscript")!;
    const made = manuscripts().filter((node) =>
      ["북쪽 문", "유리 온실"].includes(node.title),
    );
    expect(manuscripts()).toHaveLength(before + 2);
    expect(made.map((node) => node.parentId)).toEqual([folder.id, folder.id]);

    const north = made.find((node) => node.title === "북쪽 문")!;
    const northText = bodyToPlainText(getDb().documents[north.id].body);
    expect(northText).toContain("북쪽 문");
    expect(northText).not.toContain("#");
    const garden = made.find((node) => node.title === "유리 온실")!;
    expect(bodyToPlainText(getDb().documents[garden.id].body)).toContain(
      "둘째 줄",
    );

    // 여러 개를 가져오면 목록의 첫 원고만 연다.
    expect(screen.getByRole("status", { name: "열린 문서" })).toHaveTextContent(
      north.id,
    );
    expect(screen.getByText("원고 2개를 가져왔어요.")).toBeInTheDocument();
  });

  it("leaves out files it cannot import and says so", async () => {
    renderDialog();
    await screen.findByRole("button", { name: "가져오기" });

    drop([file("표지.png", "x"), file("1화.txt", "본문")]);

    expect(within(staged()).getAllByRole("listitem")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "1개는 담지 않았어요. 텍스트(.txt)와 마크다운(.md) 파일만 가져올 수 있어요.",
    );
  });

  it("takes a file off the list, and does not list the same file twice", async () => {
    const actor = userEvent.setup();
    renderDialog();
    await screen.findByRole("button", { name: "가져오기" });
    const first = file("1화.txt", "본문");

    await choose(actor, [first, file("2화.txt", "본문")]);
    // 같은 파일을 다시 올려도 한 줄이다.
    drop([first]);
    expect(within(staged()).getAllByRole("listitem")).toHaveLength(2);

    await actor.click(screen.getByRole("button", { name: "1화 빼기" }));

    const rows = within(staged()).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("2화");
  });

  it("keeps only the file that failed, and retrying does not create it twice", async () => {
    const actor = userEvent.setup();
    const { onClose } = renderDialog();
    await screen.findByRole("button", { name: "가져오기" });
    const before = manuscripts().length;
    await choose(actor, [file("1화.txt", "첫 화"), file("2화.txt", "둘째 화")]);
    await waitFor(() => expect(importButton()).toBeEnabled());
    // 첫 파일은 원고가 만들어진 뒤 글을 담다가 실패한다.
    setMockRule("documents.save", "once");

    await actor.click(importButton());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "1개를 가져오지 못했어요.",
    );
    const rows = within(staged()).getAllByRole("listitem");
    expect(rows).toHaveLength(1);
    expect(rows[0]).toHaveTextContent("1화");
    expect(rows[0]).toHaveTextContent("가져오지 못했어요");
    // 된 것은 이미 만들어졌다. 창은 남은 줄 때문에 아직 열려 있다.
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "닫기" })).toBeInTheDocument();

    await actor.click(screen.getByRole("button", { name: "다시 시도" }));

    await waitFor(() => expect(onClose).toHaveBeenCalledTimes(1));
    // 만들어 둔 원고에 글만 다시 담았다. 같은 제목의 원고가 하나 더 생기지 않는다.
    expect(manuscripts()).toHaveLength(before + 2);
    const first = manuscripts().filter((node) => node.title === "1화");
    expect(first).toHaveLength(1);
    expect(bodyToPlainText(getDb().documents[first[0].id].body)).toContain(
      "첫 화",
    );
    // 다시 해서 된 원고다. 만들다 만 것으로 보고 치우지 않는다.
    expect(first[0].trashedAt).toBeFalsy();
  });

  it("sends the half-made manuscript to the trash when the failed file is given up", async () => {
    const actor = userEvent.setup();
    const { onClose } = renderDialog();
    await screen.findByRole("button", { name: "가져오기" });
    await choose(actor, [file("1화.txt", "첫 화"), file("2화.txt", "둘째 화")]);
    await waitFor(() => expect(importButton()).toBeEnabled());
    // 두 파일 모두 원고는 만들어지고 글을 담다가 실패한다.
    setMockRule("documents.save", "fail");
    await actor.click(importButton());
    await screen.findByRole("alert");
    const halfMade = (title: string) =>
      manuscripts().find((node) => node.title === title)!;
    // 제목만 있는 빈 원고가 남아 있다. 이대로 두면 "가져오지 못했다" 던 원고가 폴더에 보인다.
    expect(halfMade("1화").trashedAt).toBeFalsy();

    // 한 줄은 목록에서 빼고, 나머지는 남긴 채 닫는다. 어느 쪽이든 포기한 것이다.
    await actor.click(screen.getByRole("button", { name: "1화 빼기" }));
    await waitFor(() => expect(halfMade("1화").trashedAt).toBeTruthy());
    await actor.click(screen.getByRole("button", { name: "취소" }));

    await waitFor(() => expect(halfMade("2화").trashedAt).toBeTruthy());
    expect(onClose).toHaveBeenCalledTimes(1);
    // 가져온 것이 없으니 아무 원고도 열지 않는다.
    expect(
      screen.getByRole("status", { name: "열린 문서" }),
    ).toBeEmptyDOMElement();
  });
});
