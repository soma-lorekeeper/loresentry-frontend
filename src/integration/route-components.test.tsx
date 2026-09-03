import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginRoute } from "@/features/auth/components/login-route";
import { ProjectListRoute } from "@/features/projects/components/project-list-route";
import { projectFixtures } from "@/features/projects/project-model";
import { WorkspaceRoute } from "@/features/workspace/components/workspace-route";

const navigation = vi.hoisted(() => ({
  params: new URLSearchParams(),
  push: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: navigation.push }),
  useSearchParams: () => navigation.params,
}));

vi.mock("@/config/runtime-config-provider", () => ({
  useRuntimeConfig: () => ({
    config: {
      apiBaseUrl: "",
      privacyPolicyUrl: "",
      termsOfServiceUrl: "",
    },
    error: null,
    status: "ready",
  }),
}));

afterEach(() => {
  cleanup();
  navigation.params = new URLSearchParams();
  navigation.push.mockReset();
});

describe("route component handoffs", () => {
  it("assumes temporary login success and opens the project list", async () => {
    const user = userEvent.setup();
    render(<LoginRoute />);

    await user.click(screen.getByRole("button", { name: "Google로 계속하기" }));

    await waitFor(() =>
      expect(navigation.push).toHaveBeenCalledWith("/projects"),
    );
  });

  it.each(projectFixtures)(
    "opens the $title mock project with its own identity",
    async (project) => {
      const user = userEvent.setup();
      const navigate = vi.fn();
      render(<ProjectListRoute navigate={navigate} />);
      const projectButton = screen.getByTitle(project.title).closest("button");

      expect(projectButton).not.toBeNull();
      await user.click(projectButton!);

      await waitFor(() =>
        expect(navigate).toHaveBeenCalledWith(
          `/workspace?projectId=${project.id}`,
        ),
      );
    },
  );

  it.each(projectFixtures)(
    "loads the $title workspace mock selected by the route",
    (project) => {
      navigation.params = new URLSearchParams({ projectId: project.id });
      const { container } = render(<WorkspaceRoute />);

      expect(container.querySelector("[data-project-id]")).toHaveAttribute(
        "data-project-id",
        project.id,
      );
    },
  );

  it("opens only the project identity verified by the backend adapter", async () => {
    const user = userEvent.setup();
    const navigate = vi.fn();
    const openProject = vi.fn().mockResolvedValue({
      verifiedProjectId: "verified-project",
    });
    render(<ProjectListRoute navigate={navigate} openProject={openProject} />);

    await user.click(
      screen.getByRole("button", {
        name: /별빛 아래 마지막 약속 — 장편 프로젝트12분 전/,
      }),
    );

    expect(openProject).toHaveBeenCalledWith("glass-garden");
    await waitFor(() =>
      expect(navigate).toHaveBeenCalledWith(
        "/workspace?projectId=verified-project",
      ),
    );
  });

  it("keeps the workspace project identity in the route when switching", async () => {
    navigation.params = new URLSearchParams({ projectId: "glass-garden" });
    const user = userEvent.setup();
    const navigate = vi.fn();
    render(<WorkspaceRoute navigate={navigate} />);

    await user.click(
      screen.getByRole("button", {
        name: "프로젝트 전환: 유리 정원의 기록",
      }),
    );
    await user.click(
      screen.getByRole("menuitemradio", { name: "다른 프로젝트" }),
    );

    expect(navigate).toHaveBeenCalledWith("/workspace?projectId=other-project");
  });

  it("stops an unidentified direct workspace entry at the route boundary", () => {
    render(<WorkspaceRoute />);

    expect(
      screen.getByRole("heading", { name: "작업공간을 열 수 없어요" }),
    ).toBeVisible();
    expect(
      screen.getByRole("link", { name: "프로젝트 목록으로 이동" }),
    ).toHaveAttribute("href", "/projects");
  });
});
