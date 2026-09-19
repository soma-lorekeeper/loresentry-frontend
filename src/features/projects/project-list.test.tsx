import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { renderWithServices, routerMock } from "@/test/render";
import { setMockRule } from "@/services/mock/control";
import { getDb } from "@/services/mock/db";

import { ProjectListPage } from "./project-list";

const user = { id: "user-1", displayName: "서윤주", email: "seoyunju@lore.kr" };

describe("ProjectListPage", () => {
  it("lists projects by most recent work with a count", async () => {
    renderWithServices(<ProjectListPage user={user} />);
    expect(await screen.findByText("유리 정원의 기록")).toBeInTheDocument();
    expect(screen.getByText("6개 프로젝트")).toBeInTheDocument();
    const titles = screen
      .getAllByRole("heading", { level: 3 })
      .map((h) => h.textContent);
    expect(titles[0]).toBe("유리 정원의 기록");
  });

  it("shows a retryable error when projects fail to load", async () => {
    renderWithServices(<ProjectListPage user={user} />, {
      before: () => setMockRule("projects.list", "fail"),
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("프로젝트를 불러오지 못했어요");
    expect(
      within(alert).getByRole("button", { name: "다시 시도" }),
    ).toBeInTheDocument();
  });

  it("requires a title and creates the project in the workspace", async () => {
    const actor = userEvent.setup();
    renderWithServices(<ProjectListPage user={user} />);
    await actor.click(
      await screen.findByRole("button", { name: /새 프로젝트/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "새 프로젝트 만들기",
    });
    const submit = within(dialog).getByRole("button", {
      name: "프로젝트 만들기",
    });
    expect(submit).toBeDisabled();
    const title = within(dialog).getByRole("textbox", {
      name: "프로젝트 제목",
    });
    await actor.type(title, "  새벽의 지도  ");
    await actor.click(submit);
    await waitFor(() => expect(routerMock.push).toHaveBeenCalled());
    const created = getDb().projects.find((p) => p.title === "새벽의 지도");
    expect(created).toBeDefined();
    expect(routerMock.push).toHaveBeenCalledWith(
      `/workspace?projectId=${created!.id}`,
    );
  });

  it("rejects a duplicate title without closing the dialog", async () => {
    const actor = userEvent.setup();
    renderWithServices(<ProjectListPage user={user} />);
    await actor.click(
      await screen.findByRole("button", { name: /새 프로젝트/ }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "새 프로젝트 만들기",
    });
    await actor.type(
      within(dialog).getByRole("textbox", { name: "프로젝트 제목" }),
      "유리 정원의 기록",
    );
    await actor.click(
      within(dialog).getByRole("button", { name: "프로젝트 만들기" }),
    );
    expect(
      await within(dialog).findByText("같은 이름의 프로젝트가 이미 있어요."),
    ).toBeInTheDocument();
    expect(routerMock.push).not.toHaveBeenCalled();
  });

  it("moves a project to the trash from the card menu", async () => {
    const actor = userEvent.setup();
    renderWithServices(<ProjectListPage user={user} />);
    await actor.click(
      await screen.findByRole("button", { name: "달빛 도서관 연대기 더보기" }),
    );
    await actor.click(
      await screen.findByRole("menuitem", { name: "휴지통으로 이동" }),
    );
    const dialog = await screen.findByRole("dialog", {
      name: "프로젝트를 휴지통으로 이동할까요?",
    });
    await actor.click(
      within(dialog).getByRole("button", { name: "휴지통으로 이동" }),
    );
    await waitFor(() =>
      expect(screen.queryByText("달빛 도서관 연대기")).not.toBeInTheDocument(),
    );
    expect(
      await screen.findByText("프로젝트를 휴지통으로 이동했어요."),
    ).toBeInTheDocument();
  });
});
