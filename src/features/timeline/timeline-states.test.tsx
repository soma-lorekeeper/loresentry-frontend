import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

import {
  createTimelineScenario,
  resolveTimelineStateId,
  TIMELINE_SCREEN_STATES,
} from "./timeline-states";

describe("timeline screen states", () => {
  it("maps all six Pencil screens exactly once", () => {
    expect(TIMELINE_SCREEN_STATES).toHaveLength(6);
    expect(TIMELINE_SCREEN_STATES.map((state) => state.screenNumber)).toEqual([
      65, 66, 67, 68, 69, 88,
    ]);
    expect(new Set(TIMELINE_SCREEN_STATES.map((state) => state.id)).size).toBe(
      6,
    );
    expect(
      new Set(TIMELINE_SCREEN_STATES.map((state) => state.pencilNodeId)).size,
    ).toBe(6);
  });

  it.each(TIMELINE_SCREEN_STATES)(
    "resolves and renders screen $screenNumber ($id)",
    (state) => {
      expect(resolveTimelineStateId(state.id)).toBe(state.id);
      const scenario = createTimelineScenario(state.id);
      const { container } = render(
        <WorkspaceShell
          initialProjectId="glass-garden"
          initialTimelineState={state.id}
        />,
      );

      expect(screen.getByRole("tab", { name: "균열의 밤" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(
        screen.getByRole("heading", { name: "시간 흐름" }),
      ).toBeInTheDocument();
      expect(container.firstElementChild).toHaveAttribute(
        "data-project-id",
        "glass-garden",
      );

      if (state.mode === "empty") {
        expect(
          screen.getByText("아직 시간 항목이 없습니다"),
        ).toBeInTheDocument();
      } else {
        expect(
          screen.getByRole("button", { name: "유리 등대가 멈추다 선택" }),
        ).toBeInTheDocument();
      }

      if (state.mode === "selected") {
        expect(
          container.querySelector('[data-timeline-item-id="lighthouse-stops"]'),
        ).toHaveAttribute("data-selected", "true");
      }
      if (state.mode === "editing" || state.mode === "save-error") {
        expect(
          screen.getByRole("region", { name: "유리 등대가 멈추다 편집" }),
        ).toBeInTheDocument();
      }
      if (state.mode === "save-error") {
        expect(screen.getByRole("alert")).toHaveTextContent(
          "저장하지 못했습니다. 입력은 유지됩니다.",
        );
      }
      if (state.mode === "delete") {
        expect(
          screen.getByRole("dialog", { name: "시간 항목을 삭제할까요?" }),
        ).toBeInTheDocument();
      }

      expect(scenario.stateId).toBe(state.id);
    },
  );

  it("rejects unknown route state values", () => {
    expect(resolveTimelineStateId(null)).toBeUndefined();
    expect(resolveTimelineStateId("unknown-state")).toBeUndefined();
  });
});
