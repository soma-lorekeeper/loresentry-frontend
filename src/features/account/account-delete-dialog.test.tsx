import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { renderWithServices, routerMock } from "@/test/render";

import { mockAccount } from "@/services/mock/account";
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

const toConfirm = async (actor: ReturnType<typeof userEvent.setup>) =>
  actor.click(await screen.findByRole("button", { name: "다음" }));

describe("AccountDeleteDialog", () => {
  it("counts what will be deleted and waits for the exact email", async () => {
    const actor = userEvent.setup();
    open();
    await toConfirm(actor);

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
    await toConfirm(actor);
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
    await toConfirm(actor);
    await actor.type(await screen.findByRole("textbox"), "seoyunju@lore.kr");
    await actor.click(screen.getByRole("button", { name: "계정 삭제" }));

    expect(
      await screen.findByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(getDb().projects.length).toBeGreaterThan(0);
    expect(routerMock.replace).not.toHaveBeenCalled();
  });

  it("asks why first and sends the answers along with the deletion", async () => {
    const actor = userEvent.setup();
    const remove = vi.spyOn(mockAccount, "deleteAccount");
    open();

    expect(
      screen.getByRole("heading", { name: "떠나시는 이유를 알려 주시겠어요?" }),
    ).toBeInTheDocument();
    await actor.click(
      screen.getByRole("checkbox", { name: "원고와 개인정보가 걱정돼요" }),
    );
    await actor.click(
      screen.getByRole("checkbox", { name: "자주 쓰지 않아요" }),
    );
    await actor.type(
      screen.getByRole("textbox", { name: /더 알려 주실 내용/ }),
      "  타임라인이 더 필요해요 ",
    );
    await toConfirm(actor);
    const email = await screen.findByRole("textbox");
    expect(email).toHaveFocus();
    await actor.type(email, "seoyunju@lore.kr");
    await actor.click(screen.getByRole("button", { name: "계정 삭제" }));

    await waitFor(() =>
      expect(routerMock.replace).toHaveBeenCalledWith("/goodbye/"),
    );
    expect(remove).toHaveBeenCalledWith("seoyunju@lore.kr", {
      reasons: ["RARELY_USED", "PRIVACY"],
      comment: "타임라인이 더 필요해요",
    });
    remove.mockRestore();
  });

  it("deletes without a survey when nothing is answered", async () => {
    const actor = userEvent.setup();
    const remove = vi.spyOn(mockAccount, "deleteAccount");
    open();
    await toConfirm(actor);
    await actor.type(await screen.findByRole("textbox"), "seoyunju@lore.kr");
    await actor.click(screen.getByRole("button", { name: "계정 삭제" }));

    await waitFor(() =>
      expect(remove).toHaveBeenCalledWith("seoyunju@lore.kr", undefined),
    );
    remove.mockRestore();
  });

  it("goes back to the reasons with the answers still there", async () => {
    const actor = userEvent.setup();
    open();
    await actor.click(screen.getByRole("checkbox", { name: "기타" }));
    await toConfirm(actor);
    await actor.click(await screen.findByRole("button", { name: "이전" }));

    expect(screen.getByRole("checkbox", { name: "기타" })).toBeChecked();
    expect(
      screen.getByRole("checkbox", { name: "자주 쓰지 않아요" }),
    ).not.toBeChecked();
  });
});
