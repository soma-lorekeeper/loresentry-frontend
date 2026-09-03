import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { LoginRoute } from "@/features/auth/components/login-route";
import { ProjectListRoute } from "@/features/projects/components/project-list-route";
import { projectFixtures } from "@/features/projects/project-model";
import { WorkspaceRoute } from "@/features/workspace/components/workspace-route";
import { workspaceMockFixtures } from "@/features/workspace/workspace-fixtures";

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
      const fixture = workspaceMockFixtures[project.id];

      expect(container.querySelector("[data-project-id]")).toHaveAttribute(
        "data-project-id",
        project.id,
      );
      expect(
        screen.getByRole("button", {
          name: `프로젝트 전환: ${fixture.project.name}`,
        }),
      ).toBeInTheDocument();
      expect(
        screen.getByRole("tab", { name: fixture.initialTabs[0].label }),
      ).toHaveAttribute("data-document-id", fixture.initialTabs[0].id);
      expect(screen.getByRole("textbox", { name: "원고 본문" })).toHaveValue(
        fixture.initialDocuments[0].body,
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
      screen.getByRole("menuitemradio", { name: "궤도 도시 기록" }),
    );

    expect(navigate).toHaveBeenCalledWith("/workspace?projectId=orbit-record");
    expect(
      screen.getByRole("tab", { name: "기록 08 · 무중력 정거장" }),
    ).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox", { name: "원고 본문" })).toHaveValue(
      workspaceMockFixtures["orbit-record"].initialDocuments[0].body,
    );
    expect(
      screen.queryByRole("tab", { name: "제17장 · 돌아오지 않는 밤" }),
    ).not.toBeInTheDocument();
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

  it("does not expose another fixture for an unknown project ID", () => {
    navigation.params = new URLSearchParams({ projectId: "unknown-project" });
    render(<WorkspaceRoute />);

    expect(
      screen.getByRole("heading", { name: "작업공간을 열 수 없어요" }),
    ).toBeVisible();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
    expect(screen.queryByText("유리 정원의 기록")).not.toBeInTheDocument();
  });
});
