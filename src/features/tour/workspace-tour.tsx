"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import type { FileNode } from "@/domain/models";
import { isUnavailable } from "@/features/common/preparing-state";
import { useRefreshRun } from "@/features/graph-refresh/queries";
import type {
  WorkspaceLayout,
  WorkspaceTarget,
} from "@/features/workspace/model/layout";
import { isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";

import { CoachMark } from "./coach-mark";
import type { Placement, Rect } from "./place-card";
import { TourRefreshExample } from "./refresh-example";
import {
  announceTourEnd,
  onTourRequest,
  readTour,
  writeTour,
} from "./tour-state";

interface TourStep {
  title: string;
  body: string;
  round?: boolean;
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
  /**
   * 이 단계가 띄워 둔 것을 닫는 단추. 다른 단계로 옮기기 직전에 누른다 — 대화상자를 가리키는
   * 단계에서 그대로 넘어가면, 다음 단계가 가리킬 화면이 그 대화상자에 가려진다.
   */
  dismiss?: string;
  /** 이 단계 동안 그래프 최신화의 예시 검토 창을 띄운다(실제 최신화는 시작하지 않는다) */
  example?: boolean;
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
    {
      title: t("쓰던 원고는 가져와요"),
      body: t(
        "다른 곳에서 쓰던 글을 텍스트(.txt)나 마크다운(.md) 파일로 올려 원고로 만들 수 있어요.",
      ),
      action: t("‘가져오기’를 눌러 보세요."),
      target: "import",
      chapter: 0,
      sidebar: true,
      press: "import",
      advanceOn: ["import-dialog"],
      placement: ["right", "top"],
    },
    {
      title: t("올려 두고, 확인하고, 가져와요"),
      body: t(
        "올린 파일은 목록에 먼저 담겨요. ‘가져오기’를 눌러야 원고 폴더에 원고로 만들어져요.",
      ),
      target: "import-dialog",
      chapter: 0,
      sidebar: true,
      when: "import-dialog",
      dismiss: "import-cancel",
      // 창 옆에 선다. 아래에 서면 창의 안내와 단추를 가린다(좁은 화면에서는 옆자리가 없어 아래로 간다).
      placement: ["right", "left", "bottom", "top"],
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
        "노드를 누르면 바로 이어진 문서만 진하게 남아요. 더 누르면 함께 보이고, 빈 곳을 누르면 풀려요.",
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
    {
      title: t("작품을 아는 AI 챗"),
      body: t(
        "원고·설정·메모를 모두 읽고 근거와 함께 답해요. 원고 문장을 드래그하면 그 부분을 바로 물어볼 수 있어요.",
      ),
      round: true,
      target: "ai-chat",
      chapter: 2,
      when: "ai-chat",
      placement: ["left", "top"],
    },
    refreshAvailable && {
      title: t("새 회차를 쓴 다음엔"),
      body: t(
        "그래프 최신화가 바뀐 원고를 읽고 설정 문서에 더할 점을 찾아요. 결과를 확정할 때까지 읽은 문서는 잠겨요.",
      ),
      action: t("다음을 누르면 예시 결과를 열어요."),
      // 단추 하나가 아니라 그 자리를 가리킨다. 최신화가 이미 돌거나 검토를 기다리면 단추 모양이 바뀐다.
      target: "refresh",
      chapter: 3,
      sidebar: true,
      placement: ["right", "bottom"],
    },
    refreshAvailable && {
      title: t("달라진 문서가 모여요"),
      body: t("예시 결과예요. ‘~’는 고칠 문서, ‘+’는 새로 만들 문서예요."),
      target: "diff-list",
      chapter: 3,
      example: true,
      placement: ["right", "bottom"],
    },
    refreshAvailable && {
      title: t("왼쪽은 지금, 오른쪽은 제안"),
      body: t(
        "가운데 화살표로 한 줄씩 옮기거나 양쪽을 직접 고쳐요. 두 쪽이 같아지면 그 문서는 정해져요.",
      ),
      target: "diff-compare",
      chapter: 3,
      example: true,
      placement: ["top", "bottom", "left"],
    },
    refreshAvailable && {
      title: t("다 정하면 반영해요"),
      body: t(
        "모든 문서를 정하면 ‘반영 확정’이 켜지고, 확정하면 잠긴 문서가 풀려요. 반영한 내용은 버전 기록에 남아요.",
      ),
      target: "diff-confirm",
      chapter: 3,
      example: true,
      placement: ["bottom", "left"],
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

function hasNext(
  steps: readonly TourStep[],
  from: number,
  sidebarOpen: boolean,
) {
  const coming = new Set(steps[from]?.advanceOn ?? []);
  return steps
    .slice(from + 1)
    .some(
      (step) =>
        eligible(step) ||
        (step.when && coming.has(step.when)) ||
        (step.sidebar && !sidebarOpen),
    );
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
  const {
    projectId,
    open,
    layout,
    dispatch,
    sidebarVisible,
    setSidebarVisible,
  } = useWorkspace();
  const tree = useFileTree(projectId);
  const refresh = useRefreshRun(projectId);
  const refreshAvailable = !isUnavailable(refresh.error);
  const [index, setIndex] = useState<number | null>(null);
  const steps = useMemo(
    () => buildSteps(tree.data ?? [], refreshAvailable),
    [tree.data, refreshAvailable],
  );
  const openedSidebar = useRef(false);
  const before = useRef<{
    layout: WorkspaceLayout;
    // 좁은 창에서는 서랍의 열림이 배치와 따로 간다. 투어가 끝나면 이것도 되돌린다.
    sidebarVisible: boolean;
  } | null>(null);
  const snapshot = () => ({
    open,
    dispatch,
    layout,
    // 사이드바가 실제로 보이는가. 좁은 창에서는 `layout.sidebarOpen` 과 다를 수 있다.
    sidebarVisible,
    setSidebarVisible,
  });
  const latest = useRef(snapshot());

  useEffect(() => {
    latest.current = snapshot();
  });

  const begin = useCallback(() => {
    const current = latest.current;
    before.current = {
      layout: current.layout,
      sidebarVisible: current.sidebarVisible,
    };
    openedSidebar.current = false;
    setIndex(0);
  }, []);

  useEffect(() => {
    if (!tree.isSuccess || refresh.isPending || readTour() !== "pending")
      return;
    const timer = window.setTimeout(begin, 500);
    return () => window.clearTimeout(timer);
  }, [tree.isSuccess, refresh.isPending, begin]);

  useEffect(() => onTourRequest(begin), [begin]);

  const step = index === null ? null : (steps[index] ?? null);

  useEffect(() => {
    if (!step) return;
    const current = latest.current;
    if (step.open) current.open(step.open);
    if (step.sidebar && !current.sidebarVisible) {
      openedSidebar.current = true;
      current.setSidebarVisible(true);
    } else if (
      !step.sidebar &&
      openedSidebar.current &&
      current.sidebarVisible &&
      !document.querySelector("dialog[open]")
    ) {
      openedSidebar.current = false;
      current.setSidebarVisible(false);
    }
  }, [step]);

  const { rect, ready } = useTargetRect(step ? step.target : null);

  const end = useCallback(() => {
    writeTour("done");
    setIndex(null);
    announceTourEnd();
    const current = latest.current;
    if (before.current) {
      current.dispatch({ type: "replace", layout: before.current.layout });
      // 넓은 창에서는 위의 배치 복원과 같은 값이라 아무 일도 없고, 좁은 창에서는 서랍을 되돌린다.
      current.setSidebarVisible(before.current.sidebarVisible);
    } else if (openedSidebar.current && current.sidebarVisible) {
      current.setSidebarVisible(false);
    }
    before.current = null;
    openedSidebar.current = false;
  }, []);

  const [resolving, setResolving] = useState<number | null>(null);

  const forward = useCallback(() => {
    if (index === null) return;
    const current = latest.current;
    if (steps[index + 1]?.sidebar && !current.sidebarVisible) {
      openedSidebar.current = true;
      current.setSidebarVisible(true);
      setResolving(index);
      return;
    }
    const following = nextIndex(steps, index);
    if (following === null) end();
    else setIndex(following);
  }, [end, index, steps]);

  useEffect(() => {
    if (resolving === null || !sidebarVisible) return;
    const frame = window.requestAnimationFrame(() => {
      setResolving(null);
      const following = nextIndex(steps, resolving);
      if (following === null) end();
      else setIndex(following);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [resolving, sidebarVisible, steps, end]);

  useAppears(step?.advanceOn, forward);

  const [pressedAt, setPressedAt] = useState<number | null>(null);

  useEffect(() => {
    if (pressedAt === null || pressedAt !== index) return;
    const timer = window.setTimeout(forward, PRESS_TIMEOUT_MS);
    return () => window.clearTimeout(timer);
  }, [pressedAt, index, forward]);

  /*
   * 이 단계가 띄워 둔 것을 닫는다. 단계를 옮기는 것과 같은 순간에 불러야 한다 — 닫힘과 옮김이 한 번에
   * 그려져야, 다음 단계가 시작할 때 대화상자가 이미 없다(사이드바를 도로 접는 판단이 그것을 본다).
   */
  const leave = useCallback(() => {
    if (step?.dismiss) pressTarget(step.dismiss);
  }, [step]);

  const next = useCallback(() => {
    if (index === null || !step) return;
    if (step.press && pressedAt !== index && pressTarget(step.press)) {
      setPressedAt(index);
      return;
    }
    leave();
    forward();
  }, [forward, index, leave, pressedAt, step]);

  /**
   * 예시 창을 확정하거나 닫았다. 예시 창을 가리키는 단계를 건너 다음 장으로 간다 — 창이 닫혔는데 남은
   * 예시 단계가 빈자리를 가리키면 안 된다.
   */
  const leaveExample = useCallback(() => {
    if (index === null) return;
    let following = nextIndex(steps, index);
    while (following !== null && steps[following].example)
      following = nextIndex(steps, following);
    if (following === null) end();
    else setIndex(following);
  }, [end, index, steps]);

  const back = useCallback(() => {
    if (index === null) return;
    const previous = previousIndex(steps, index);
    if (previous === null) return;
    leave();
    setIndex(previous);
  }, [index, leave, steps]);

  if (!step || index === null) return null;

  return (
    <>
      <TourRefreshExample open={!!step.example} onDone={leaveExample} />
      <CoachMark
        ready={ready}
        target={rect}
        step={index}
        chapters={steps.map((item) => item.chapter)}
        last={!hasNext(steps, index, sidebarVisible)}
        title={step.title}
        body={step.body}
        round={step.round}
        action={step.action}
        waiting={step.waiting}
        placement={step.placement}
        onBack={previousIndex(steps, index) === null ? null : back}
        onNext={next}
        onSkip={end}
      />
    </>
  );
}
