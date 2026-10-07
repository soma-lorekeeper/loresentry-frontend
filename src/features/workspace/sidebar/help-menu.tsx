"use client";

import { useCallback, useRef, useState } from "react";

import { Menu, SidebarButton } from "@/design-system/primitives";
import { useFeedback } from "@/features/feedback/feedback-provider";
import { requestTour } from "@/features/tour/tour-state";
import { t } from "@/i18n";

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
        label={t("작업공간::도움말")}
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
        label={t("도움말 메뉴")}
        placement="top-start"
        entries={[
          {
            id: "guide",
            label: t("작업공간::사용 가이드"),
            icon: "book-open",
            onSelect: () => open({ kind: "help" }),
          },
          {
            id: "tour",
            label: t("작업공간 둘러보기"),
            icon: "panels-top-left",
            onSelect: requestTour,
          },
          {
            id: "feedback",
            label: t("작업공간::피드백 보내기"),
            icon: "message-square",
            onSelect: feedback.open,
          },
        ]}
      />
    </span>
  );
}
