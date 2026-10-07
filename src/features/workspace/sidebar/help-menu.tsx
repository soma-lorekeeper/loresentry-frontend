"use client";

import { useCallback, useRef, useState } from "react";

import { Menu, SidebarButton } from "@/design-system/primitives";
import { useFeedback } from "@/features/feedback/feedback-provider";
import { requestTour } from "@/features/tour/tour-state";

import { useWorkspace } from "../workspace-context";
import styles from "./sidebar.module.css";

export function HelpMenu({ selected }: { selected: boolean }) {
  const { open } = useWorkspace();
  const feedback = useFeedback();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const holdTrigger = useCallback((node: HTMLSpanElement | null) => {
    triggerRef.current = node?.querySelector("button") ?? null;
  }, []);

  return (
    <span ref={holdTrigger} className={styles.anchor}>
      <SidebarButton
        icon="circle-help"
        label="도움말"
        selected={selected}
        className={styles.menuTrigger}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => setMenuOpen((value) => !value)}
      />
      <Menu
        anchorRef={triggerRef}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        label="도움말 메뉴"
        placement="top-start"
        entries={[
          {
            id: "guide",
            label: "사용 가이드",
            icon: "book-open",
            onSelect: () => open({ kind: "help" }),
          },
          {
            id: "tour",
            label: "작업공간 둘러보기",
            icon: "panels-top-left",
            onSelect: requestTour,
          },
          {
            id: "feedback",
            label: "피드백 보내기",
            icon: "message-square",
            onSelect: feedback.open,
          },
        ]}
      />
    </span>
  );
}
