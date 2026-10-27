import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterAll, describe, expect, it, vi } from "vitest";

import type { DocumentNode } from "@/domain/models";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { mockFiles } from "@/services/mock/files";
import { buildProjectGraph } from "@/services/mock/graph";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { DocumentView } from "./document-view";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));

// Tiptap은 unmount 다음 tick에 에디터를 해제한다. jsdom이 사라지기 전에 마치게 한다.
afterAll(() => new Promise((resolve) => setTimeout(resolve, 5)));

const LENA = "glass-garden:c-lena";
const IMAGE = "data:image/webp;base64,UklGRg==";

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

function lena() {
  return getDb().files.find((node) => node.id === LENA) as DocumentNode;
}

function renderDocument(fileId: string, before?: () => void) {
  return renderWithServices(
    <WorkspaceProvider
      project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={user}
      initialLayout={createLayout({ kind: "file", fileId })}
    >
      <DocumentView fileId={fileId} paneId="pane-1" active />
    </WorkspaceProvider>,
    { before },
  );
}

describe("document image slot", () => {
  it("offers to add an image beside the title of a document without one", async () => {
    renderDocument(LENA);

    expect(
      await screen.findByRole("button", {
        name: "‘레나 아르벨’에 이미지 넣기",
      }),
    ).toBeInTheDocument();
  });

  it("changes or removes an image from a menu", async () => {
    const actor = userEvent.setup();
    renderDocument(LENA, () => {
      lena().imageUrl = IMAGE;
    });

    await actor.click(
      await screen.findByRole("button", {
        name: "‘레나 아르벨’ 이미지 바꾸기",
      }),
    );
    const menu = await screen.findByRole("menu", { name: "대표 이미지" });
    expect(
      within(menu).getByRole("menuitem", { name: "이미지 바꾸기" }),
    ).toBeInTheDocument();
    await actor.click(
      within(menu).getByRole("menuitem", { name: "이미지 지우기" }),
    );

    expect(
      await screen.findByRole("button", {
        name: "‘레나 아르벨’에 이미지 넣기",
      }),
    ).toBeInTheDocument();
    expect(lena().imageUrl).toBeNull();
  });

  it("only shows the image of a locked document", async () => {
    renderDocument(LENA, () => {
      lena().imageUrl = IMAGE;
      lena().locked = true;
    });
    await screen.findByRole("textbox", { name: "제목" });

    expect(screen.queryByRole("button", { name: /이미지/ })).toBeNull();
  });

  it("refuses a file that is not an image it can store", async () => {
    // accept 속성이 막는 파일도 끌어다 놓기로는 들어올 수 있다. 화면이 따로 거른다.
    const actor = userEvent.setup({ applyAccept: false });
    const { container } = renderDocument(LENA);
    await screen.findByRole("button", { name: "‘레나 아르벨’에 이미지 넣기" });

    const input =
      container.querySelector<HTMLInputElement>('input[type="file"]')!;
    await actor.upload(
      input,
      new File(["%PDF"], "plot.pdf", { type: "application/pdf" }),
    );

    expect(
      await screen.findByText("PNG·JPG·WEBP·GIF 이미지만 올릴 수 있어요."),
    ).toBeInTheDocument();
  });
});

describe("mock document image", () => {
  it("keeps the image on the document and the relationship map node", async () => {
    await mockFiles.setImage(LENA, new Blob(["webp"], { type: "image/webp" }));

    expect(lena().imageUrl).toMatch(/^data:image\/webp;base64,/);
    const node = buildProjectGraph(getDb(), GLASS_GARDEN_ID).nodes.find(
      (candidate) => candidate.id === LENA,
    );
    expect(node?.imageUrl).toBe(lena().imageUrl);

    await mockFiles.clearImage(LENA);
    expect(lena().imageUrl).toBeNull();
  });

  it("refuses to change the image of a locked document", async () => {
    lena().locked = true;
    try {
      await expect(
        mockFiles.setImage(LENA, new Blob(["webp"], { type: "image/webp" })),
      ).rejects.toMatchObject({ code: "locked" });
    } finally {
      lena().locked = false;
    }
  });
});
