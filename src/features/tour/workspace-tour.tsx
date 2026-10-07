"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FileNode } from "@/domain/models";
import type { WorkspaceTarget } from "@/features/workspace/model/layout";
import { isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";

import { CoachMark } from "./coach-mark";
import type { Placement, Rect } from "./place-card";
import { onTourRequest, readTour, writeTour } from "./tour-state";

interface TourStep {
  title: string;
  body: string;
  target: string;
  open?: WorkspaceTarget;
  sidebar?: boolean;
  placement: readonly Placement[];
}

const FIND_TIMEOUT_MS = 2500;

function buildSteps(nodes: readonly FileNode[]): TourStep[] {
  const documents = nodes.filter(isDocument);
  const manuscript = documents
    .filter((node) => node.docType === "manuscript")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const setting =
    documents.find((node) => node.docType === "character") ??
    documents.find((node) => node.docType !== "manuscript");
  return [
    manuscript
      ? {
          title: "원고는 여기서 써요",
          body: "쓰는 대로 저장되고, 저장 상태와 글자 수는 위 도구 줄에 보여요.",
          target: "editor",
          open: { kind: "file", fileId: manuscript.id },
          placement: ["bottom", "top", "right", "left"],
        }
      : {
          title: "원고는 여기서 써요",
          body: "원고를 만들면 이 창에서 바로 쓰고, 쓰는 대로 저장돼요.",
          target: "create-manuscript",
          open: { kind: "new" },
          placement: ["bottom", "right", "top"],
        },
    setting
      ? {
          title: "속성 표로 문서를 이어요",
          body: "관련 원고와 인물, 장소를 고르면 그 관계가 그래프와 타임라인이 돼요.",
          target: "properties",
          open: { kind: "file", fileId: setting.id },
          placement: ["bottom", "right", "top", "left"],
        }
      : {
          title: "속성 표로 문서를 이어요",
          body: "캐릭터나 장소 문서를 만들면 속성 표에서 관련 원고와 인물을 이을 수 있어요.",
          target: "create-character",
          open: { kind: "new" },
          placement: ["bottom", "right", "top"],
        },
    {
      title: "새 회차를 쓴 다음엔",
      body: "그래프 최신화를 누르면 AI가 설정 문서에 바뀔 점을 찾아요. 받을지는 작가가 골라요.",
      target: "refresh",
      sidebar: true,
      placement: ["right", "bottom"],
    },
    {
      title: "회차별 등장은 타임라인에서",
      body: "누가 몇 화에 나왔는지 회차 순서대로 한눈에 봐요.",
      target: "timeline",
      sidebar: true,
      placement: ["right", "bottom"],
    },
  ];
}

function findTarget(name: string) {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour="${name}"]`,
  );
  return (
    Array.from(candidates).find(
      (node) => node.isConnected && !node.closest("[hidden]"),
    ) ?? null
  );
}

function visibleRect(node: HTMLElement): Rect {
  const box = node.getBoundingClientRect();
  const top = Math.max(box.top, 8);
  const bottom = Math.min(box.bottom, window.innerHeight - 8);
  return {
    left: box.left,
    top,
    width: box.width,
    height: Math.max(0, bottom - top),
  };
}

interface TargetState {
  name: string | null;
  rect: Rect | null;
  missing: boolean;
}

function useTargetRect(name: string | null) {
  const [state, setState] = useState<TargetState>({
    name: null,
    rect: null,
    missing: false,
  });

  useEffect(() => {
    if (!name) return;
    const target = name;
    let node: HTMLElement | null = null;
    let frame = 0;
    const started = performance.now();
    const measure = () => {
      if (!node) return;
      if (!node.isConnected || node.closest("[hidden]")) {
        observer?.disconnect();
        node = null;
        frame = window.requestAnimationFrame(look);
        return;
      }
      setState({ name: target, rect: visibleRect(node), missing: false });
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    function look() {
      node = findTarget(target);
      if (node) {
        node.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        measure();
        observer?.observe(node);
        return;
      }
      if (performance.now() - started > FIND_TIMEOUT_MS) {
        setState({ name: target, rect: null, missing: true });
        return;
      }
      frame = window.requestAnimationFrame(look);
    }
    frame = window.requestAnimationFrame(look);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [name]);

  const current = state.name === name ? state : null;
  return {
    rect: current?.rect ?? null,
    ready: current !== null && (current.rect !== null || current.missing),
  };
}

export function WorkspaceTour() {
  const { projectId, open, layout, dispatch } = useWorkspace();
  const tree = useFileTree(projectId);
  const [index, setIndex] = useState<number | null>(null);
  const steps = useMemo(() => buildSteps(tree.data ?? []), [tree.data]);
  const openedSidebar = useRef(false);
  const latest = useRef({ open, dispatch, sidebarOpen: layout.sidebarOpen });

  useEffect(() => {
    latest.current = { open, dispatch, sidebarOpen: layout.sidebarOpen };
  });

  useEffect(() => {
    if (!tree.isSuccess || readTour() !== "pending") return;
    const timer = window.setTimeout(() => setIndex(0), 500);
    return () => window.clearTimeout(timer);
  }, [tree.isSuccess]);

  useEffect(() => onTourRequest(() => setIndex(0)), []);

  const step = index === null ? null : steps[index];

  useEffect(() => {
    if (!step) return;
    const current = latest.current;
    if (step.open) current.open(step.open);
    if (step.sidebar && !current.sidebarOpen) {
      openedSidebar.current = true;
      current.dispatch({ type: "toggleSidebar" });
    }
  }, [step]);

  const { rect, ready } = useTargetRect(step ? step.target : null);

  const end = useCallback(() => {
    writeTour("done");
    setIndex(null);
    if (openedSidebar.current && latest.current.sidebarOpen) {
      latest.current.dispatch({ type: "toggleSidebar" });
    }
    openedSidebar.current = false;
  }, []);

  const next = useCallback(() => {
    if (index === null) return;
    if (index + 1 >= steps.length) end();
    else setIndex(index + 1);
  }, [end, index, steps.length]);

  const back = useCallback(() => {
    setIndex((current) =>
      current === null || current === 0 ? current : current - 1,
    );
  }, []);

  if (!step || index === null) return null;

  return (
    <CoachMark
      ready={ready}
      target={rect}
      step={index}
      total={steps.length}
      title={step.title}
      body={step.body}
      placement={step.placement}
      onBack={back}
      onNext={next}
      onSkip={end}
    />
  );
}
