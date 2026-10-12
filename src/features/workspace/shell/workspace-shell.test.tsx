import {
  act,
  fireEvent,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { mockWorkspaceState } from "@/services/mock/graph";
import { renderWithServices, routerMock } from "@/test/render";

import {
  createLayout,
  layoutReducer,
  type WorkspaceLayout,
} from "../model/layout";
import { WorkspaceProvider, useWorkspace } from "../workspace-context";
import { resetSidebarWidthCache } from "./workspace-chrome-prefs";
import { WorkspaceShell } from "./workspace-shell";

vi.mock("next/navigation", () => ({
  useRouter: () => routerMock,
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => "/",
}));
vi.mock("@/features/projects/user-menu", () => ({ UserMenu: () => null }));
vi.mock("@/features/tour/workspace-tour", () => ({
  WorkspaceTour: () => null,
}));

const user = {
  id: "user-1",
  displayName: "서윤주",
  email: "seoyunju@lore.kr",
  onboardingCompleted: true,
};

/** 창 폭을 흉내 낸다. `set(true)` 로 좁은 창이 된다. */
function stubMatchMedia() {
  let narrow = false;
  const listeners = new Set<() => void>();
  window.matchMedia = ((query: string) => ({
    get matches() {
      return narrow;
    },
    media: query,
    onchange: null,
    addEventListener: (_: string, listener: () => void) =>
      listeners.add(listener),
    removeEventListener: (_: string, listener: () => void) =>
      listeners.delete(listener),
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return {
    set(next: boolean) {
      narrow = next;
      act(() => listeners.forEach((listener) => listener()));
    },
  };
}

/** 한 창에 휴지통·메모 탭이 열려 있고 메모가 보인다. */
function twoTabs(): WorkspaceLayout {
  return layoutReducer(createLayout({ kind: "trash" }), {
    type: "open",
    target: { kind: "memo" },
  });
}

/** 좌우로 나뉘어 왼쪽에 휴지통, 오른쪽에 메모가 있다. */
function sideBySide(): WorkspaceLayout {
  return layoutReducer(twoTabs(), {
    type: "split",
    edge: "right",
    target: { kind: "memo" },
    from: "pane-1",
  });
}

function renderShell(layout: WorkspaceLayout, extra?: React.ReactNode) {
  const project = getDb().projects.find((p) => p.id === GLASS_GARDEN_ID)!;
  return renderWithServices(
    <WorkspaceProvider project={project} user={user} initialLayout={layout}>
      <WorkspaceShell />
      {extra}
    </WorkspaceProvider>,
  );
}

const main = () => screen.getByRole("main");
const panes = () =>
  Array.from(main().querySelectorAll<HTMLElement>("section[data-pane-id]"));
const tabNames = (pane: HTMLElement) =>
  within(pane)
    .getAllByRole("tab")
    .map((tab) => tab.textContent);

/** jsdom 은 DragEvent 가 없어 좌표가 실리지 않는다. 좌표를 가진 이벤트를 직접 만든다. */
function drag(type: string, target: Element, x: number, y: number) {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX: x,
    clientY: y,
  });
  Object.defineProperty(event, "dataTransfer", {
    value: { dropEffect: "none", setData: () => {}, types: [] },
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/** 작업 영역과 창이 1000×600 을 차지한다고 알려 준다. jsdom 은 배치를 계산하지 않는다. */
function stubGeometry() {
  return vi
    .spyOn(Element.prototype, "getBoundingClientRect")
    .mockImplementation(
      () =>
        ({
          left: 0,
          top: 0,
          right: 1000,
          bottom: 600,
          width: 1000,
          height: 600,
          x: 0,
          y: 0,
        }) as DOMRect,
    );
}

beforeEach(() => {
  window.localStorage.clear();
  resetSidebarWidthCache();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("WorkspaceShell with two panes", () => {
  it("draws the sidebar toggle once, in the first pane", async () => {
    stubMatchMedia();
    renderShell(sideBySide());

    expect(await screen.findAllByRole("tablist")).toHaveLength(2);
    // 창마다 있으면 같은 단추가 두 번 나온다. 하나뿐이어야 getByRole 이 통과한다.
    const toggle = screen.getByRole("button", { name: "사이드바 닫기" });
    expect(panes()[0]).toContainElement(toggle);
  });

  it("resizes the panes with the arrow keys on the divider", async () => {
    stubMatchMedia();
    renderShell(sideBySide());
    const divider = await screen.findByRole("separator", {
      name: "창 크기 조절",
    });
    expect(divider).toHaveAttribute("aria-valuenow", "50");

    fireEvent.keyDown(divider, { key: "ArrowRight" });

    await waitFor(() =>
      expect(main().style.getPropertyValue("--split")).toBe("0.52"),
    );
    expect(divider).toHaveAttribute("aria-valuenow", "52");
  });
});

describe("WorkspaceShell sidebar", () => {
  it("comes back when the window widens again, without saving the collapse", async () => {
    const media = stubMatchMedia();
    const save = vi.spyOn(mockWorkspaceState, "save");
    renderShell(twoTabs());
    expect(
      await screen.findByRole("navigation", { name: "작업공간" }),
    ).toBeInTheDocument();

    media.set(true);
    // 좁은 창에서는 서랍이 닫힌 채로 시작한다.
    expect(
      screen.queryByRole("navigation", { name: "작업공간" }),
    ).not.toBeInTheDocument();

    media.set(false);
    expect(
      screen.getByRole("navigation", { name: "작업공간" }),
    ).toBeInTheDocument();

    // 배치 저장은 300ms 뒤에 나간다. 그만큼 기다려도 저장이 없어야 한다 —
    // 창을 좁힌 것이 작가의 선호로 서버에 남으면 안 된다.
    await new Promise((resolve) => window.setTimeout(resolve, 350));
    expect(save).not.toHaveBeenCalled();
  });

  it("remembers the width it was resized to", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    const handle = await screen.findByRole("separator", {
      name: "사이드바 폭 조절",
    });
    expect(handle).toHaveAttribute("aria-valuenow", "232");

    fireEvent.keyDown(handle, { key: "ArrowRight" });

    await waitFor(() => expect(handle).toHaveAttribute("aria-valuenow", "248"));
    expect(
      JSON.parse(window.localStorage.getItem("loresentry.workspace-chrome")!),
    ).toEqual({ sidebarWidth: 248 });
  });
});

describe("WorkspaceShell drag and drop", () => {
  it("previews the edge under the pointer and splits there on drop", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    const memo = await screen.findByRole("tab", { name: /메모/ });
    stubGeometry();

    fireEvent.dragStart(memo, {
      dataTransfer: { setData: () => {}, effectAllowed: "none" },
    });
    // 오른쪽 가장자리 쪽이다. 하나뿐인 창의 탭은 어디에 놓든 가장 가까운 가장자리로 간다.
    const over = drag("dragover", main(), 980, 300);

    expect(over.defaultPrevented).toBe(true);
    expect(main().querySelector("[data-drop-preview]")).toHaveAttribute(
      "data-drop-preview",
      "right",
    );

    drag("drop", main(), 980, 300);

    await waitFor(() => expect(panes()).toHaveLength(2));
    expect(tabNames(panes()[0])).toEqual(["휴지통"]);
    expect(tabNames(panes()[1])).toEqual(["메모"]);
    expect(main()).toHaveAttribute("data-split", "row");
  });

  /**
   * 사이드바의 보기(검색·그래프·타임라인·메모)도 파일처럼 끌어다 놓는다. 가장자리에 놓으면 그
   * 화면이 새 창으로 열린다.
   */
  it("opens a sidebar view in a new pane when it is dropped on an edge", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    await screen.findByRole("tab", { name: /메모/ });
    const sidebar = screen.getByRole("navigation", { name: "작업공간" });
    const timeline = within(sidebar).getByRole("button", { name: "타임라인" });
    expect(timeline).toHaveAttribute("draggable", "true");
    stubGeometry();

    fireEvent.dragStart(timeline, {
      dataTransfer: { setData: () => {}, effectAllowed: "none" },
    });
    // 사이드바에서 온 것은 창 안에도 놓을 수 있어, 가장자리는 바깥 3분의 1 이다.
    drag("dragover", main(), 980, 300);
    expect(main().querySelector("[data-drop-preview]")).toHaveAttribute(
      "data-drop-preview",
      "right",
    );
    drag("drop", main(), 980, 300);

    await waitFor(() => expect(panes()).toHaveLength(2));
    // 옮긴 것이 아니라 연 것이다. 있던 탭은 그대로다.
    expect(tabNames(panes()[0])).toEqual(["휴지통", "메모"]);
    expect(tabNames(panes()[1])).toEqual(["타임라인"]);
  });

  it("opens a sidebar view as a tab when it is dropped on a tab bar", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    await screen.findByRole("tab", { name: /메모/ });
    const sidebar = screen.getByRole("navigation", { name: "작업공간" });
    const graph = within(sidebar).getByRole("button", { name: "그래프" });

    fireEvent.dragStart(graph, {
      dataTransfer: { setData: () => {}, effectAllowed: "none" },
    });
    const tablist = screen.getByRole("tablist");
    fireEvent.dragOver(tablist, { dataTransfer: { dropEffect: "none" } });
    fireEvent.drop(tablist, { dataTransfer: { dropEffect: "none" } });

    await waitFor(() =>
      expect(tabNames(panes()[0])).toEqual(["휴지통", "메모", "그래프"]),
    );
    expect(panes()).toHaveLength(1);
  });

  it("stacks the panes when the tab is dropped on the bottom edge", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    const memo = await screen.findByRole("tab", { name: /메모/ });
    stubGeometry();

    fireEvent.dragStart(memo, {
      dataTransfer: { setData: () => {}, effectAllowed: "none" },
    });
    drag("dragover", main(), 500, 590);
    drag("drop", main(), 500, 590);

    await waitFor(() => expect(panes()).toHaveLength(2));
    expect(main()).toHaveAttribute("data-split", "column");
    expect(tabNames(panes()[1])).toEqual(["메모"]);
  });

  it("keeps the tab where it is when its writing could not be saved", async () => {
    stubMatchMedia();
    // 저장에 실패한 문서 화면처럼, 이 탭은 "서버에 닿지 못한 글이 남았다" 고 답한다.
    function UnsavedProbe() {
      const { registerTabActions } = useWorkspace();
      useEffect(
        () => registerTabActions("pane-1", "memo", { save: () => false }),
        [registerTabActions],
      );
      return null;
    }
    renderShell(twoTabs(), <UnsavedProbe />);
    const memo = await screen.findByRole("tab", { name: /메모/ });
    stubGeometry();

    fireEvent.dragStart(memo, {
      dataTransfer: { setData: () => {}, effectAllowed: "none" },
    });
    drag("dragover", main(), 500, 590);
    drag("drop", main(), 500, 590);

    // 옮기면 화면이 새로 만들어져 그 글이 사라진다. 옮기지 않고 까닭을 알린다.
    expect(
      await screen.findByText(
        "쓰던 글이 아직 저장되지 않아 탭을 옮기지 않았어요.",
      ),
    ).toBeInTheDocument();
    expect(panes()).toHaveLength(1);
  });

  it("leaves a drag it did not start alone", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    await screen.findByRole("tab", { name: /메모/ });
    stubGeometry();

    // 에디터 안에서 글을 끌어 옮기는 것처럼, 우리가 시작하지 않은 끌기다.
    const over = drag("dragover", main(), 980, 300);

    expect(over.defaultPrevented).toBe(false);
    expect(main().querySelector("[data-drop-preview]")).toBeNull();
  });
});

describe("WorkspaceShell shortcuts", () => {
  /** 지금 보는 탭이 저장을 등록해 둔 것처럼 꾸민다(문서 화면이 하는 일). */
  function SaveProbe({ onSave }: { onSave: () => void }) {
    const { registerTabActions } = useWorkspace();
    useEffect(
      () => registerTabActions("pane-1", "memo", { save: onSave }),
      [registerTabActions, onSave],
    );
    return null;
  }

  it("saves on Ctrl+S and keeps the key from the browser", async () => {
    stubMatchMedia();
    const onSave = vi.fn();
    renderShell(twoTabs(), <SaveProbe onSave={onSave} />);
    await screen.findByRole("tab", { name: /메모/ });

    // 한글을 조합하는 중에도 물리 키로 알아본다.
    const delivered = fireEvent.keyDown(window, {
      code: "KeyS",
      key: "ㄴ",
      ctrlKey: true,
      isComposing: true,
    });

    expect(onSave).toHaveBeenCalledTimes(1);
    // preventDefault 가 불리면 fireEvent 는 false 를 돌려준다.
    expect(delivered).toBe(false);
  });

  it("closes the tab in view on Alt+W", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    await screen.findByRole("tab", { name: /메모/ });

    fireEvent.keyDown(window, { code: "KeyW", altKey: true });

    await waitFor(() =>
      expect(screen.queryByRole("tab", { name: /메모/ })).toBeNull(),
    );
    expect(screen.getByRole("tab", { name: /휴지통/ })).toBeInTheDocument();
  });

  it("places the tab in view with the keyboard", async () => {
    stubMatchMedia();
    renderShell(twoTabs());
    await screen.findByRole("tab", { name: /메모/ });

    fireEvent.keyDown(window, { code: "KeyM", altKey: true });
    // 창이 하나면 오른쪽에 새 창을 여는 것이 기본이다.
    // 화면에는 다른 상태 안내도 있다. 배치 안내는 문구로 찾는다.
    expect(screen.getByText(/놓아요/)).toHaveTextContent("오른쪽에 놓아요");

    fireEvent.keyDown(window, { key: "ArrowDown" });
    expect(screen.getByText(/놓아요/)).toHaveTextContent("아래에 놓아요");

    fireEvent.keyDown(window, { key: "Enter" });

    await waitFor(() => expect(panes()).toHaveLength(2));
    expect(main()).toHaveAttribute("data-split", "column");
    expect(tabNames(panes()[1])).toEqual(["메모"]);
    expect(screen.queryByText(/놓아요/)).toBeNull();
  });
});
