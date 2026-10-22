import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { renderWithServices, routerMock } from "@/test/render";

import { createLayout } from "../workspace/model/layout";
import { WorkspaceProvider } from "../workspace/workspace-context";
import { DocumentView } from "./document-view";

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

function renderDocument(fileId: string) {
  return renderWithServices(
    <WorkspaceProvider
      project={getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!}
      user={user}
      initialLayout={createLayout({ kind: "file", fileId })}
    >
      <DocumentView fileId={fileId} paneId="pane-1" active />
    </WorkspaceProvider>,
  );
}

describe("DocumentView format", () => {
  it("changes the font of the open document only", async () => {
    const actor = userEvent.setup();
    renderDocument("glass-garden:ch-12");
    const toolbar = await screen.findByRole("toolbar", { name: "편집 도구" });
    await waitFor(() =>
      expect(
        within(toolbar).getByRole("button", { name: "되돌리기" }),
      ).toBeInTheDocument(),
    );

    await actor.click(
      within(toolbar).getByRole("button", { name: "글꼴: Pretendard" }),
    );
    await actor.click(
      await screen.findByRole("menuitemradio", { name: "나눔명조" }),
    );

    expect(
      within(toolbar).getByRole("button", { name: "글꼴: 나눔명조" }),
    ).toBeInTheDocument();
    await waitFor(
      () =>
        expect(getDb().documents["glass-garden:ch-12"].body.doc.attrs).toEqual({
          font: "nanum-myeongjo",
          fontSize: 10.5,
          lineHeight: 1.5,
        }),
      { timeout: 4000 },
    );
    cleanup();

    renderDocument("glass-garden:c-lena");
    const other = await screen.findByRole("toolbar", { name: "편집 도구" });
    expect(
      within(other).getByRole("button", { name: "글꼴: Pretendard" }),
    ).toBeInTheDocument();
    expect(getDb().documents["glass-garden:c-lena"].body.doc.attrs).toBe(
      undefined,
    );
  });
});
