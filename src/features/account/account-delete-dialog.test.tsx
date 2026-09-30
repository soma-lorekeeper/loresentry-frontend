import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithServices, routerMock } from "@/test/render";

import { setMockRule } from "@/services/mock/control";
import { getDb } from "@/services/mock/db";

import { AccountDeleteDialog } from "./account-delete-dialog";

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

const open = () =>
  renderWithServices(
    <AccountDeleteDialog open user={user} onClose={() => {}} />,
    { before: () => void (getDb().signedIn = true) },
  );

describe("AccountDeleteDialog", () => {
  it("counts what will be deleted and waits for the exact email", async () => {
    const actor = userEvent.setup();
    open();

    expect(
      await screen.findByText(/프로젝트 6개와 그 안의 원고/),
    ).toBeInTheDocument();
    expect(
      await screen.findByText(/휴지통에 있는 프로젝트 \d+개/),
    ).toBeInTheDocument();
    const confirm = screen.getByRole("button", { name: "계정 삭제" });
    expect(confirm).toBeDisabled();

    await actor.type(screen.getByRole("textbox"), "seoyunju@lore");
    expect(confirm).toBeDisabled();
    await actor.type(screen.getByRole("textbox"), ".KR ");
    expect(confirm).toBeEnabled();
  });

  it("deletes everything and lands on the goodbye page", async () => {
    const actor = userEvent.setup();
    open();
    await actor.type(await screen.findByRole("textbox"), "seoyunju@lore.kr");
    await actor.click(screen.getByRole("button", { name: "계정 삭제" }));

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/goodbye/"),
    );
    const db = getDb();
    expect(db.signedIn).toBe(false);
    expect(db.projects).toHaveLength(0);
  });

  it("keeps the account and offers a retry when deletion fails", async () => {
    const actor = userEvent.setup();
    renderWithServices(
      <AccountDeleteDialog open user={user} onClose={() => {}} />,
      {
        before: () => {
          getDb().signedIn = true;
          setMockRule("account.delete", "fail");
        },
      },
    );
    await actor.type(await screen.findByRole("textbox"), "seoyunju@lore.kr");
    await actor.click(screen.getByRole("button", { name: "계정 삭제" }));

    expect(
      await screen.findByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(getDb().projects.length).toBeGreaterThan(0);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });
});
