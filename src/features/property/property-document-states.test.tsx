import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { WorkspaceShell } from "@/features/workspace/components/workspace-shell";

import {
  createPropertyDocumentScenario,
  PROPERTY_DOCUMENT_SCREEN_STATES,
  resolvePropertyDocumentStateId,
} from "./property-document-states";

describe("property document screen states", () => {
  it("maps every Pencil screen from 52 through 64 exactly once", () => {
    expect(PROPERTY_DOCUMENT_SCREEN_STATES).toHaveLength(13);
    expect(
      PROPERTY_DOCUMENT_SCREEN_STATES.map((state) => state.screenNumber),
    ).toEqual(Array.from({ length: 13 }, (_, index) => index + 52));
    expect(
      new Set(PROPERTY_DOCUMENT_SCREEN_STATES.map((state) => state.id)).size,
    ).toBe(13);
    expect(
      new Set(
        PROPERTY_DOCUMENT_SCREEN_STATES.map((state) => state.pencilNodeId),
      ).size,
    ).toBe(13);
  });

  it.each(PROPERTY_DOCUMENT_SCREEN_STATES)(
    "resolves and renders screen $screenNumber ($id)",
    (state) => {
      expect(resolvePropertyDocumentStateId(state.id)).toBe(state.id);
      const scenario = createPropertyDocumentScenario(state.id);
      const { container } = render(
        <WorkspaceShell
          initialProjectId="glass-garden"
          initialPropertyState={state.id}
        />,
      );

      expect(screen.getByRole("tab", { name: state.label })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(
        container.querySelector(
          `[role="tabpanel"][data-document-id="${state.documentId}"]`,
        ),
      ).toBeInTheDocument();
      expect(screen.getByRole("status")).toHaveAttribute(
        "data-save-status",
        state.saveStatus,
      );

      if ("empty" in state && state.empty) {
        expect(screen.getByRole("textbox", { name: "문서 제목" })).toHaveValue(
          "",
        );
        expect(container.querySelectorAll("[data-property-id]")).toHaveLength(
          0,
        );
      } else {
        expect(scenario.document.properties.length).toBeGreaterThan(0);
      }

      if ("openTypeMenu" in state && state.openTypeMenu) {
        const property = scenario.document.properties[0];
        expect(
          within(
            screen.getByRole("menu", { name: `${property.name} 유형` }),
          ).getByRole("menuitemradio", { name: "텍스트" }),
        ).toBeInTheDocument();
      }
    },
  );

  it("rejects unknown route state values", () => {
    expect(resolvePropertyDocumentStateId(null)).toBeUndefined();
    expect(resolvePropertyDocumentStateId("unknown-state")).toBeUndefined();
  });
});
