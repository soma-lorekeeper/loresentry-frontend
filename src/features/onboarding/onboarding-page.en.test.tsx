import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { renderWithServices } from "@/test/render";

import { OnboardingPage } from "./onboarding-page";
import { AppWindow, type Scene } from "./scenes";

const newcomer = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "yunju@example.com",
  onboardingCompleted: false,
};

const KIND_LABELS = Object.values(DOCUMENT_TYPE_META)
  .flatMap((meta) => [meta.relationLabel, meta.label])
  .sort((a, b) => b.length - a.length);

function hangul(text: string) {
  const rest = KIND_LABELS.reduce(
    (current, label) => current.split(label).join(" "),
    text,
  );
  return rest.match(/[가-힣]+/g) ?? [];
}

afterEach(() => vi.useRealTimers());

describe("OnboardingPage (English)", () => {
  it("walks every step in English", async () => {
    const actor = userEvent.setup();
    renderWithServices(<OnboardingPage user={newcomer} replay={false} />);

    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "One story, one workspace",
    );
    expect(screen.getByRole("button", { name: "Back" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Skip" })).toBeInTheDocument();
    expect(screen.getByRole("listitem", { current: "step" })).toHaveTextContent(
      "Step 1: One story, one workspace",
    );
    expect(hangul(document.body.textContent ?? "")).toEqual([]);

    for (const title of [
      "Write chapters here, too",
      "Link documents with properties",
      "See links as a graph",
      "Who appears in which chapter",
      "New chapter? Refresh the graph",
      "Choose your pen name",
    ]) {
      await actor.click(screen.getByRole("button", { name: "Next" }));
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
        title,
      );
      expect(hangul(document.body.textContent ?? "")).toEqual([]);
    }

    expect(screen.getByRole("textbox", { name: "Pen name" })).toHaveValue(
      "Yunju Seo",
    );
    await actor.click(
      screen.getByRole("button", { name: "Continue with this name" }),
    );
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      "Where would you like to start?",
    );
    expect(
      screen.getByRole("button", { name: /Explore the sample project/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create a new project/ }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Maybe later" }),
    ).toBeInTheDocument();
    expect(hangul(document.body.textContent ?? "")).toEqual([]);
  });

  it("offers the way back to the guide on replay", () => {
    renderWithServices(
      <OnboardingPage
        user={{ ...newcomer, onboardingCompleted: true }}
        replay
      />,
    );
    fireEvent.keyDown(window, { key: "Escape" });
    expect(
      screen.getByRole("button", { name: "Back to the guide" }),
    ).toBeInTheDocument();
  });
});

describe("AppWindow (English)", () => {
  const scenes: Scene[] = [
    "workspace",
    "name",
    "editor",
    "relations",
    "graph",
    "timeline",
    "refresh",
    "files",
  ];

  it.each(scenes)("shows the %s scene in English", (scene) => {
    const { container } = render(
      <AppWindow scene={scene} leaving={null} userName="Yunju Seo" />,
    );
    const text = container.textContent ?? "";
    expect(hangul(text)).toEqual([]);
    expect(text).toContain("The Glass Garden Records");
    expect(text).toContain("Graph refresh");
    expect(text).toContain("Favorites");
  });

  it("types the opening line with the name highlighted", () => {
    vi.useFakeTimers();
    const { container } = render(
      <AppWindow scene="editor" leaving={null} userName="Yunju Seo" />,
    );
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(container.textContent).toContain(
      "When the mist lifted, Lena Arbel was standing at the door of the North Greenhouse.",
    );
    expect(container.querySelector("[data-thread='origin']")).toHaveTextContent(
      "Lena Arbel",
    );
  });
});
