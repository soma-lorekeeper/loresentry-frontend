import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { ProjectTrash } from "./project-trash";

afterEach(() => {
  delete document.documentElement.dataset.theme;
});

describe("ProjectTrash", () => {
  it("marks trash navigation current and presents sorted, non-navigable metadata", () => {
    render(<ProjectTrash />);

    expect(
      screen.getByRole("link", { name: "프로젝트 휴지통" }),
    ).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "프로젝트 목록" }),
    ).not.toHaveAttribute("aria-current");
    const rows = screen.getAllByRole("article");
    expect(rows[0]).toHaveTextContent("종이 달 아래의 약속");
    expect(rows[0]).toHaveTextContent("휴지통으로 이동:");
    expect(rows[0]).toHaveTextContent("보관 중");
    expect(rows[0].querySelector("a")).toBeNull();
  });

  it("keeps empty, loading, and error states mutually exclusive", () => {
    const emptyView = render(
      <ProjectTrash initialItems={[]} initialListStatus="empty" />,
    );
    expect(screen.getByText("휴지통이 비어 있어요")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "프로젝트 목록으로 돌아가기" }),
    ).toHaveAttribute("href", "/projects");

    emptyView.unmount();
    const loadingView = render(<ProjectTrash initialListStatus="loading" />);
    expect(screen.getByText("휴지통을 불러오는 중입니다.")).toBeInTheDocument();
    expect(screen.queryByText("휴지통이 비어 있어요")).not.toBeInTheDocument();

    loadingView.unmount();
    render(<ProjectTrash initialListStatus="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "휴지통을 불러오지 못했어요.다시 시도해 주세요.",
    );
    expect(screen.queryByText("연결")).not.toBeInTheDocument();
  });

  it("retries the backend query without inventing a successful result", async () => {
    const user = userEvent.setup();
    const loadTrashedProjects = vi
      .fn<() => Promise<never[]>>()
      .mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce([]);
    render(<ProjectTrash loadTrashedProjects={loadTrashedProjects} />);

    expect(await screen.findByRole("alert")).toBeVisible();
    await user.click(screen.getByRole("button", { name: "다시 시도" }));
    expect(await screen.findByText("휴지통이 비어 있어요")).toBeVisible();
    expect(loadTrashedProjects).toHaveBeenCalledTimes(2);
  });

  it("uses the same semantic structure for the light representative", () => {
    const view = render(<ProjectTrash theme="dark" />);
    const darkRoles = screen
      .getAllByRole("article")
      .map((row) => row.textContent);

    view.rerender(<ProjectTrash theme="light" />);
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(
      screen.getAllByRole("article").map((row) => row.textContent),
    ).toEqual(darkRoles);
  });
});
