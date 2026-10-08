"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FileNode } from "@/domain/models";
import { isUnavailable } from "@/features/common/preparing-state";
import { useRefreshRun } from "@/features/graph-refresh/queries";
import type { WorkspaceTarget } from "@/features/workspace/model/layout";
import { isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";

import { CoachMark } from "./coach-mark";
import type { Placement, Rect } from "./place-card";
import { onTourRequest, readTour, writeTour } from "./tour-state";

interface TourStep {
  title: string;
  body: string;
  target: string;
  chapter: number;
  open?: WorkspaceTarget;
  sidebar?: boolean;
  placement: readonly Placement[];
  action?: string;
  press?: string;
  advanceOn?: readonly string[];
  waiting?: boolean;
  when?: string;
}

const FIND_TIMEOUT_MS = 2500;
const PRESS_TIMEOUT_MS = 2500;

function buildSteps(
  nodes: readonly FileNode[],
  refreshAvailable: boolean,
): TourStep[] {
  const documents = nodes.filter(isDocument);
  const manuscript = documents
    .filter((node) => node.docType === "manuscript")
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
  const setting =
    documents.find((node) => node.docType === "character") ??
    documents.find((node) => node.docType !== "manuscript");
  const steps: (TourStep | false)[] = [
    manuscript
      ? {
          title: t("원고는 여기서 써요"),
          body: t(
            "쓰는 대로 저장되고, 저장 상태와 글자 수는 위 도구 줄에 보여요.",
          ),
          target: "editor",
          chapter: 0,
          open: { kind: "file", fileId: manuscript.id },
          placement: ["bottom", "top", "right", "left"],
        }
      : {
          title: t("원고는 여기서 써요"),
          body: t("원고를 만들면 이 창에서 바로 쓰고, 쓰는 대로 저장돼요."),
          target: "create-manuscript",
          chapter: 0,
          open: { kind: "new" },
          placement: ["bottom", "right", "top"],
        },
    setting
      ? {
          title: t("속성 표로 문서를 이어요"),
          body: t(
            "관련 원고와 인물, 장소를 고르면 그 관계가 그래프와 타임라인이 돼요.",
          ),
          target: "properties",
          chapter: 0,
          open: { kind: "file", fileId: setting.id },
          placement: ["bottom", "right", "top", "left"],
        }
      : {
          title: t("속성 표로 문서를 이어요"),
          body: t(
            "캐릭터나 장소 문서를 만들면 속성 표에서 관련 원고와 인물을 이을 수 있어요.",
          ),
          target: "create-character",
          chapter: 0,
          open: { kind: "new" },
          placement: ["bottom", "right", "top"],
        },
    {
      title: t("이은 관계는 그래프로 봐요"),
      body: t("속성 표에서 이은 문서가 그래프의 점과 선이 돼요."),
      action: t("‘그래프’를 눌러 보세요."),
      target: "graph",
      chapter: 1,
      sidebar: true,
      press: "graph",
      advanceOn: ["graph-canvas"],
      placement: ["right", "bottom"],
    },
    {
      title: t("한 문서에 집중해요"),
      body: t(
        "노드를 누르면 바로 이어진 문서만 진하게 남아요. 한 번 더 누르면 풀려요.",
      ),
      action: t("노드 하나를 눌러 보세요."),
      target: "graph-canvas",
      chapter: 1,
      advanceOn: ["node-panel"],
      placement: ["left", "bottom", "top", "right"],
    },
    {
      title: t("이어진 문서가 모여요"),
      body: t(
        "고른 문서와 바로 이어진 문서가 카드로 모여요. 카드를 누르면 그 문서가 열려요.",
      ),
      target: "node-panel",
      chapter: 1,
      when: "node-panel",
      placement: ["left", "bottom", "top"],
    },
    {
      title: t("회차별 등장은 타임라인에서"),
      body: t("누가 몇 화에 나왔는지 회차 순서대로 한눈에 봐요."),
      action: t("‘타임라인’을 눌러 보세요."),
      target: "timeline",
      chapter: 1,
      sidebar: true,
      press: "timeline",
      advanceOn: ["timeline-grid"],
      placement: ["right", "bottom"],
    },
    {
      title: t("줄은 문서, 칸은 회차예요"),
      body: t(
        "막대가 있는 칸이 그 문서가 이어진 회차예요. 회차 이름을 누르면 그 회차를 따라 읽을 수 있어요.",
      ),
      target: "timeline-grid",
      chapter: 1,
      when: "timeline-grid",
      placement: ["bottom", "top", "left", "right"],
    },
    refreshAvailable && {
      title: t("새 회차를 쓴 다음엔"),
      body: t(
        "그래프 최신화가 최근 원고를 읽고 설정 문서에 바뀔 점을 찾아요. 받을지는 작가가 골라요.",
      ),
      action: t("‘그래프 최신화’를 눌러 보세요."),
      target: "refresh-start",
      chapter: 2,
      sidebar: true,
      press: "refresh-start",
      advanceOn: ["refresh-running", "refresh-review"],
      when: "refresh-start",
      placement: ["right", "bottom"],
    },
    refreshAvailable && {
      title: t("원고를 읽고 있어요"),
      body: t("끝나면 이 버튼이 ‘변경 사항 반영’으로 바뀌어요."),
      action: t("몇 초면 끝나요."),
      waiting: true,
      target: "refresh-running",
      chapter: 2,
      sidebar: true,
      advanceOn: ["refresh-review"],
      when: "refresh-running",
      placement: ["right", "bottom"],
    },
    refreshAvailable && {
      title: t("바뀔 점을 찾았어요"),
      body: t("제안은 아직 문서에 들어가지 않았어요. 열어서 하나씩 확인해요."),
      action: t("‘변경 사항 반영’을 눌러 보세요."),
      target: "refresh-review",
      chapter: 2,
      sidebar: true,
      press: "refresh-review",
      advanceOn: ["diff-list", "diff-empty"],
      when: "refresh-review",
      placement: ["right", "bottom"],
    },
    refreshAvailable && {
      title: t("달라진 문서가 모여요"),
      body: t("‘~’는 고칠 문서, ‘+’는 새로 만들 문서, ‘−’는 지울 문서예요."),
      action: t("문서 하나를 골라 보세요."),
      target: "diff-list",
      chapter: 2,
      press: "diff-list",
      advanceOn: ["diff-compare"],
      when: "diff-list",
      placement: ["right", "bottom"],
    },
    refreshAvailable && {
      title: t("왼쪽은 지금, 오른쪽은 제안"),
      body: t(
        "가운데 화살표로 한 줄씩 옮기거나 양쪽을 직접 고쳐요. 두 쪽이 같아지면 그 문서는 정해져요.",
      ),
      target: "diff-compare",
      chapter: 2,
      when: "diff-compare",
      placement: ["top", "bottom", "left"],
    },
    refreshAvailable && {
      title: t("다 정하면 반영해요"),
      body: t(
        "모든 문서를 정하면 ‘반영 확정’이 켜져요. 반영 전 상태는 버전 기록에 남아요. 이 투어는 도움말에서 다시 볼 수 있어요.",
      ),
      target: "diff-confirm",
      chapter: 2,
      when: "diff-list",
      placement: ["bottom", "left"],
    },
    refreshAvailable && {
      title: t("이번엔 바뀔 점이 없어요"),
      body: t(
        "원고를 더 쓴 뒤 다시 최신화하면 이 창에 제안이 모여요. 이 투어는 도움말에서 다시 볼 수 있어요.",
      ),
      target: "diff-empty",
      chapter: 2,
      when: "diff-empty",
      placement: ["bottom", "top"],
    },
  ];
  return steps.filter((step): step is TourStep => step !== false);
}

function present(name: string) {
  return findTarget(name) !== null;
}

function eligible(step: TourStep) {
  return !step.when || present(step.when);
}

function nextIndex(steps: readonly TourStep[], from: number) {
  for (let index = from + 1; index < steps.length; index++) {
    if (eligible(steps[index])) return index;
  }
  return null;
}

function hasNext(steps: readonly TourStep[], from: number) {
  const coming = new Set(steps[from]?.advanceOn ?? []);
  return steps
    .slice(from + 1)
    .some((step) => eligible(step) || (step.when && coming.has(step.when)));
}

function previousIndex(steps: readonly TourStep[], from: number) {
  for (let index = from - 1; index >= 0; index--) {
    if (eligible(steps[index])) return index;
  }
  return null;
}

function pressTarget(name: string) {
  const node = findTarget(name);
  if (!node) return false;
  const button =
    node.matches("button") || node.querySelector("button") === null
      ? node
      : node.querySelector<HTMLElement>("button:not(:disabled)");
  button?.click();
  return Boolean(button);
}

function useAppears(
  names: readonly string[] | undefined,
  onAppear: () => void,
) {
  const callback = useRef(onAppear);
  useEffect(() => {
    callback.current = onAppear;
  });
  useEffect(() => {
    if (!names || names.length === 0) return;
    let done = false;
    let frame = 0;
    const check = () => {
      if (done || !names.some(present)) return;
      done = true;
      callback.current();
    };
    const schedule = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(check);
    };
    const observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["data-tour", "hidden", "open"],
    });
    schedule();
    return () => {
      done = true;
      observer.disconnect();
      window.cancelAnimationFrame(frame);
    };
  }, [names]);
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
  const refresh = useRefreshRun(projectId);
  const refreshAvailable = !isUnavailable(refresh.error);
  const [index, setIndex] = useState<number | null>(null);
  const steps = useMemo(
    () => buildSteps(tree.data ?? [], refreshAvailable),
    [tree.data, refreshAvailable],
  );
  const openedSidebar = useRef(false);
  const latest = useRef({ open, dispatch, sidebarOpen: layout.sidebarOpen });

  useEffect(() => {
    latest.current = { open, dispatch, sidebarOpen: layout.sidebarOpen };
  });

  useEffect(() => {
    if (!tree.isSuccess || refresh.isPending || readTour() !== "pending")
      return;
    const timer = window.setTimeout(() => setIndex(0), 500);
    return () => window.clearTimeout(timer);
  }, [tree.isSuccess, refresh.isPending]);

  useEffect(() => onTourRequest(() => setIndex(0)), []);

  const step = index === null ? null : (steps[index] ?? null);

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
    if (
      openedSidebar.current &&
      latest.current.sidebarOpen &&
      !document.querySelector("dialog[open]")
    ) {
      latest.current.dispatch({ type: "toggleSidebar" });
    }
    openedSidebar.current = false;
  }, []);

  const forward = useCallback(() => {
    if (index === null) return;
    const following = nextIndex(steps, index);
    if (following === null) end();
    else setIndex(following);
  }, [end, index, steps]);

  useAppears(step?.advanceOn, forward);

  const [pressedAt, setPressedAt] = useState<number | null>(null);

  useEffect(() => {
    if (pressedAt === null || pressedAt !== index) return;
    const timer = window.setTimeout(forward, PRESS_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pressedAt, index, forward]);

  const next = useCallback(() => {
    if (index === null || !step) return;
    if (step.press && pressedAt !== index && pressTarget(step.press)) {
      setPressedAt(index);
      return;
    }
    forward();
  }, [forward, index, pressedAt, step]);

  const back = useCallback(() => {
    if (index === null) return;
    const previous = previousIndex(steps, index);
    if (previous !== null) setIndex(previous);
  }, [index, steps]);

  if (!step || index === null) return null;

  return (
    <CoachMark
      ready={ready}
      target={rect}
      step={index}
      chapters={steps.map((item) => item.chapter)}
      last={!hasNext(steps, index)}
      title={step.title}
      body={step.body}
      action={step.action}
      waiting={step.waiting}
      placement={step.placement}
      onBack={previousIndex(steps, index) === null ? null : back}
      onNext={next}
      onSkip={end}
    />
  );
}
