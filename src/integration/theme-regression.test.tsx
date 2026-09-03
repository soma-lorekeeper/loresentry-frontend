import type { ReactElement } from "react";

import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { LoginPage } from "@/features/auth/components/login-page";
import { ProjectList } from "@/features/projects/components/project-list";
import { ProjectTrash } from "@/features/projects/components/project-trash";
import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

import { SCREEN_IMPLEMENTATION_REGISTRY } from "@/design-system/screen-registry";

const representatives: ReadonlyArray<{
  create: (theme: "dark" | "light") => ReactElement;
  name: string;
  pencilScreens: readonly number[];
}> = [
  {
    create: () => <WorkspaceShell initialProjectId="glass-garden" />,
    name: "workspace",
    pencilScreens: [10],
  },
  {
    create: (theme) => <ProjectList theme={theme} />,
    name: "project-list",
    pencilScreens: [91, 130],
  },
  {
    create: (theme) => <ProjectTrash theme={theme} />,
    name: "project-trash",
    pencilScreens: [111, 118],
  },
  {
    create: (theme) => <LoginPage theme={theme} />,
    name: "login",
    pencilScreens: [139, 144],
  },
];

function semanticSignature(container: HTMLElement) {
  return Array.from(
    container.querySelectorAll(
      "main, aside, nav, section, article, button, a, input, textarea, [role]",
    ),
  ).map((element) => ({
    ariaLabel: element.getAttribute("aria-label"),
    role: element.getAttribute("role"),
    tag: element.tagName.toLowerCase(),
    text: element.textContent?.replace(/\s+/g, " ").trim(),
  }));
}

afterEach(() => {
  cleanup();
  delete document.documentElement.dataset.theme;
});

describe.each(representatives)("theme regression: $name", (representative) => {
  it("keeps the dark/light semantic DOM aligned with its Pencil references", () => {
    document.documentElement.dataset.theme = "dark";
    const dark = render(representative.create("dark"));
    const darkSignature = semanticSignature(dark.container);
    dark.unmount();

    document.documentElement.dataset.theme = "light";
    const light = render(representative.create("light"));
    expect(semanticSignature(light.container)).toEqual(darkSignature);

    for (const screenNumber of representative.pencilScreens) {
      expect(
        SCREEN_IMPLEMENTATION_REGISTRY.find(
          (screen) => screen.screenNumber === screenNumber,
        ),
      ).toMatchObject({ pencilNodeId: expect.any(String), screenNumber });
    }
  });
});
