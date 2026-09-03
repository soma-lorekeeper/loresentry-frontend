import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ProjectGuide } from "@/features/help/components/project-guide";
import { ProjectList } from "@/features/projects/components/project-list";

import {
  ACCOUNT_GLOBAL_SCREEN_STATES,
  getAccountGlobalScenario,
} from "./account-global-states";

function text(value: string | null | undefined) {
  return value?.replace(/\s+/g, " ").trim() ?? "";
}

function stateSignature(container: HTMLElement) {
  const visible = (node: Element) => {
    const dialog = node.closest("dialog");
    return !dialog || dialog.hasAttribute("open");
  };
  return {
    alerts: Array.from(container.querySelectorAll('[role="alert"]'))
      .filter(visible)
      .map((node) => text(node.textContent)),
    controls: Array.from(
      container.querySelectorAll("aside button, dialog button, main a"),
    )
      .filter(visible)
      .map((node) => ({
        disabled: node.hasAttribute("disabled") || undefined,
        expanded: node.getAttribute("aria-expanded") ?? undefined,
        label: node.getAttribute("aria-label") || text(node.textContent),
        tag: node.tagName.toLowerCase(),
      })),
    current: Array.from(
      container.querySelectorAll('[aria-current="page"]'),
    ).map((node) => text(node.textContent)),
    dialogs: Array.from(container.querySelectorAll("dialog[open]")).map(
      (node) => text(node.textContent),
    ),
    headings: Array.from(container.querySelectorAll("h1, h2"))
      .filter(visible)
      .map((node) => ({
        level: node.tagName.toLowerCase(),
        text: text(node.textContent),
      })),
    statuses: Array.from(container.querySelectorAll('[role="status"]'))
      .filter(visible)
      .map((node) => text(node.textContent)),
  };
}

afterEach(() => cleanup());

describe("account and global screen regression", () => {
  it("locks semantic UI signatures for Pencil screens 123–138", () => {
    const signatures = ACCOUNT_GLOBAL_SCREEN_STATES.map((state) => {
      let view;
      if (state.id === "guide-topics") {
        view = render(<ProjectGuide />);
      } else if (state.id === "guide-article") {
        view = render(<ProjectGuide topicId="workspace-start" />);
      } else {
        const scenario = getAccountGlobalScenario(state.id);
        view = render(
          <ProjectList
            initialAccountProfile={scenario.profile}
            initialAccountState={scenario.accountState}
            initialFeedbackState={scenario.feedbackState}
            initialLogoutState={scenario.logoutState}
            theme={scenario.theme}
          />,
        );
      }
      const signature = {
        id: state.id,
        pencilNodeId: state.pencilNodeId,
        route: state.route,
        screenNumber: state.screenNumber,
        ui: stateSignature(view.container),
      };
      view.unmount();
      return signature;
    });

    expect(signatures).toMatchSnapshot();
  });
});
