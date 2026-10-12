"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";

import type { Rect } from "../model/drop-zones";
import { genieGeometry, genieQuads, quadTransform } from "./genie";
import styles from "./workspace-shell.module.css";

/**
 * 창의 배치가 바뀔 때의 움직임.
 *
 * <ul>
 *   <li><b>새 창</b>은 끌어온 단추(사이드바의 파일, 탭)에서 요술램프의 지니처럼 나온다 —
 *       단추의 가장자리에서 좁게 빠져나와 넓게 펴지며 제자리로 간다. macOS 에서 Dock 의
 *       창을 꺼낼 때의 Genie 효과와 같은 움직임이다(계산은 genie.ts).
 *   <li><b>이미 있던 창</b>은 예전 자리에서 새 자리로 움직인다. 새 창이 생기면 옆으로 줄어들며
 *       자리를 내주고, 두 창을 맞바꾸거나 좌우↔위아래로 바꾸면 둘이 함께 움직인다.
 * </ul>
 *
 * <p><b>크기를 진짜로 바꾼다.</b> 예전 자리에서 새 자리로 옮기는 흔한 방법은 `transform` 으로
 * 늘였다 줄이는 것인데, 그러면 글자가 옆으로 눌려 보인다. 여기서는 움직이는 동안 창을 흐름에서
 * 떼어(`position: absolute`) `left·top·width·height` 를 움직인다. 구분선을 끌 때와 같이 안의
 * 내용이 매 순간 제 크기로 다시 놓인다.
 *
 * <p><b>새 창은 조각으로 그린다.</b> 지니는 창을 그물처럼 휘는 움직임인데 DOM 요소 하나는
 * 그렇게 휠 수 없다. 그래서 창을 진행 방향으로 얇게 썬 조각(창의 복사본을 띠 모양으로 자른 것)
 * 들을 화면 위에 따로 띄워, 조각마다 사다리꼴로 변형하며 움직인다. 진짜 창은 그동안 제자리에
 * 투명하게 놓여 있다가, 조각들이 제자리에 닿으면 조각을 걷고 드러난다.
 *
 * <p><b>움직임을 줄인 환경</b>에서는 아무것도 옮기지 않고, 새 창만 옅게 나타난다.
 */

/** 이미 있던 창이 새 자리로 옮겨 가는 시간(ms) */
const MOVE_DURATION = 300;
/**
 * 새 창이 단추에서 나와 다 펴지는 시간(ms). 화면의 다른 움직임(120–220ms)보다 길다 —
 * 미끄러져 나온 뒤 곡선이 펴지는 두 단계가 읽히려면 이만큼은 든다.
 */
const GENIE_DURATION = 450;
/** 지니의 장면을 이 간격(ms)으로 계산한다. 화면이 한 번 그려지는 간격이다 */
const FRAME = 1000 / 60;
/**
 * 조각 하나의 두께(px). 조각마다 사다리꼴이라 곡선은 이 길이의 곧은 선분들로 이어진다.
 * 얇을수록 매끄럽지만 조각마다 창을 한 벌씩 복사하므로 무거워진다.
 */
const SLICE = 48;
/** 조각 수의 상한. 넓은 창을 가로로 썰 때 복사본이 지나치게 많아지지 않게 한다 */
const MAX_SLICES = 16;
/** 다 펴진 뒤 조각을 걷어 내며 진짜 창으로 넘어가는 시간(ms) */
const HANDOVER_DURATION = 120;
/** 조각 사이로 뒤가 비치지 않게 서로 이만큼(px) 겹친다 */
const SLICE_OVERLAP = 1;
/** 움직임을 줄인 환경에서 새 창이 나타나는 시간(ms) */
const REDUCED_DURATION = 120;
/** 끌어온 자리는 그 직후의 배치 변경에만 쓴다. 이보다 오래된 것은 다른 일의 것이다 */
const ORIGIN_TTL = 1500;
/** 사각형이 "같다" 고 볼 오차(px). 소수점 배치가 만드는 차이를 움직임으로 보지 않는다 */
const EPSILON = 0.5;
/** 끌어온 자리를 모를 때(키보드로 놓았을 때) 창이 나오는 구멍의 크기(px) */
const FALLBACK_SPOUT = 32;

/** 끌기 시작한 요소의 사각형(뷰포트 좌표)과 그때의 시각 */
export interface DropOrigin {
  rect: Rect;
  at: number;
}

/** 화면에 적을 px. 소수 둘째 자리면 충분하다 */
const px = (value: number) => `${Math.round(value * 100) / 100}px`;

/** 창들의 사각형. 작업 영역(main)의 왼쪽 위가 기준이다 */
function rectsOf(main: HTMLElement) {
  const origin = main.getBoundingClientRect();
  const rects = new Map<string, Rect>();
  for (const child of Array.from(main.children)) {
    const paneId = (child as HTMLElement).dataset.paneId;
    if (!paneId) continue;
    const box = child.getBoundingClientRect();
    rects.set(paneId, {
      left: box.left - origin.left,
      top: box.top - origin.top,
      width: box.width,
      height: box.height,
    });
  }
  return rects;
}

function sameRect(a: Rect, b: Rect) {
  return (
    Math.abs(a.left - b.left) < EPSILON &&
    Math.abs(a.top - b.top) < EPSILON &&
    Math.abs(a.width - b.width) < EPSILON &&
    Math.abs(a.height - b.height) < EPSILON
  );
}

const boxFrame = (rect: Rect): Keyframe => ({
  left: px(rect.left),
  top: px(rect.top),
  width: px(rect.width),
  height: px(rect.height),
});

/**
 * 새 창을 단추에서 꺼낸다(지니).
 *
 * <p>창을 썬 조각들을 작업공간 위에 띄워 움직이고, 움직임을 돌려준다. 진짜 창은 그동안
 * 투명하다 — 감추지 않고 투명하게 두는 것은, 그 사이에도 포커스를 받고 내용을 불러와야 하기
 * 때문이다.
 *
 * @param pane 새 창. 이미 제자리·제 크기로 놓여 있어야 한다
 * @param place 창의 제자리(뷰포트 좌표)
 * @param source 창이 나오는 단추의 사각형(뷰포트 좌표)
 * @returns 움직임들과, 조각을 걷어 내는 함수
 */
function genie(pane: HTMLElement, place: Rect, source: Rect) {
  const geometry = genieGeometry(place, source, SLICE, MAX_SLICES);
  const steps = Math.ceil(GENIE_DURATION / FRAME);
  const horizontal = geometry.axis === "x";

  const overlay = document.createElement("div");
  overlay.className = styles.genie;
  overlay.inert = true;
  overlay.setAttribute("aria-hidden", "true");
  /*
   * 단추의 가장자리 너머는 가린다. Dock 에서 창이 아이콘 "뒤에서" 나오는 것과 같다 — 가리지
   * 않으면 아직 나오지 않은 부분이 단추 위에 눌린 채로 보인다.
   */
  const hidden = px(
    geometry.sign > 0
      ? (horizontal ? window.innerWidth : window.innerHeight) - geometry.edge
      : geometry.edge,
  );
  overlay.style.clipPath = horizontal
    ? geometry.sign > 0
      ? `inset(0 ${hidden} 0 0)`
      : `inset(0 0 0 ${hidden})`
    : geometry.sign > 0
      ? `inset(0 0 ${hidden} 0)`
      : `inset(${hidden} 0 0 0)`;

  const animations: Animation[] = [];
  geometry.slices.forEach((slice, index) => {
    const strip = document.createElement("div");
    strip.className = styles.genieSlice;
    // 이웃 조각과 조금 겹치게 자른다. 변환은 겹치기 전의 크기로 계산하므로 자리는 그대로다.
    // 창의 끝에 닿은 조각은 늘리지 않는다 — 늘리면 창 밖(시트 사이의 틈)으로 삐져나온다.
    const last = horizontal
      ? slice.left + slice.width >= place.width - EPSILON
      : slice.top + slice.height >= place.height - EPSILON;
    const overlap = last ? 0 : SLICE_OVERLAP;
    strip.style.width = px(slice.width + (horizontal ? overlap : 0));
    strip.style.height = px(slice.height + (horizontal ? 0 : overlap));

    // 창을 한 벌 복사해, 이 조각에 해당하는 띠만 보이게 밀어 놓는다.
    const copy = pane.cloneNode(true) as HTMLElement;
    copy.removeAttribute("data-pane-id");
    for (const node of Array.from(copy.querySelectorAll("[id]"))) {
      node.removeAttribute("id");
    }
    Object.assign(copy.style, {
      position: "absolute",
      left: px(-slice.left),
      top: px(-slice.top),
      width: px(place.width),
      height: px(place.height),
    });
    strip.append(copy);
    overlay.append(strip);

    /*
     * 장면마다 계산한 변환을 그대로 쓴다(`step-end`: 다음 장면까지 그 값에 머문다). 브라우저가
     * 장면 사이를 이어 주게 두면 안 된다 — 투영 변환은 사이값을 "행렬을 풀었다 다시 짜서"
     * 만드는데, 그 결과가 사다리꼴이 아니어서 조각들이 제멋대로 흩어진다. 장면은 화면이
     * 그려지는 간격으로 계산해 두었으므로 끊겨 보이지 않는다.
     *
     * 장면마다 그 구간이 **끝날 때의** 모양을 그린다. 구간이 시작할 때의 모양을 그리면 마지막
     * 구간에 아직 덜 펴진 모양이 남아, 조각을 걷는 순간 창이 몇 px 튄다.
     */
    const frames: Keyframe[] = [];
    for (let step = 0; step <= steps; step += 1) {
      const progress = Math.min(1, (step + 1) / steps);
      const quad = genieQuads(place, geometry, progress)[index];
      frames.push({
        transform: quadTransform(slice.width, slice.height, quad),
        easing: "step-end",
      });
    }
    animations.push(
      // 끝난 뒤에도 제자리에 머문다(forwards). 조각을 걷을 때까지 흩어지면 안 된다.
      strip.animate(frames, {
        duration: GENIE_DURATION,
        easing: "linear",
        fill: "forwards",
      }),
    );
  });

  // 작업공간(shell) 안에 둔다. 그래야 창이 물려받던 색·크기 변수를 복사본도 물려받는다.
  (pane.closest("main")?.parentElement ?? document.body).append(overlay);
  animations.push(
    pane.animate([{ opacity: 0 }, { opacity: 0 }], {
      duration: GENIE_DURATION,
    }),
  );
  return {
    animations,
    /**
     * 조각을 걷는다. 다 펴져서 끝났으면 옅어지며 진짜 창으로 넘어간다 — 조각은 처음 그려진
     * 순간의 창이라, 그사이 불러온 내용이 한꺼번에 튀어나오지 않게 한다. 도중에 멈춘 것이면
     * 바로 치운다.
     */
    remove: (interrupted: boolean) => {
      if (interrupted) {
        overlay.remove();
        return;
      }
      overlay
        .animate([{ opacity: 1 }, { opacity: 0 }], {
          duration: HANDOVER_DURATION,
          easing: "linear",
        })
        .finished.then(
          () => overlay.remove(),
          () => overlay.remove(),
        );
    },
  };
}

/**
 * 배치가 바뀐 직후에 부른다. 창들을 예전 자리에서 새 자리로 움직이고, 멈추는 함수를 돌려준다.
 *
 * @param before 바뀌기 전 창들의 사각형
 * @param after 바뀐 뒤 창들의 사각형(지금 화면의 배치)
 * @param origin 끌어온 단추의 사각형(뷰포트 좌표). 없으면 새 창은 제가 선 가장자리에서 나온다
 * @param onEnd 움직임이 끝났거나 멈췄을 때
 */
function play(
  main: HTMLElement,
  before: ReadonlyMap<string, Rect>,
  after: ReadonlyMap<string, Rect>,
  origin: Rect | null,
  onEnd: () => void,
) {
  const panes = Array.from(main.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && after.has(child.dataset.paneId ?? ""),
  );
  const entering = panes.filter((pane) => !before.has(pane.dataset.paneId!));
  const moved = panes.filter((pane) => {
    const from = before.get(pane.dataset.paneId!);
    return from && !sameRect(from, after.get(pane.dataset.paneId!)!);
  });
  if (entering.length === 0 && moved.length === 0) return null;

  const animations: Animation[] = [];
  const cleanups: Array<(interrupted: boolean) => void> = [];
  let pinned: HTMLElement[] = [];

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    for (const pane of entering) {
      animations.push(
        pane.animate([{ opacity: 0 }, { opacity: 1 }], {
          duration: REDUCED_DURATION,
          easing: "linear",
        }),
      );
    }
  } else {
    const easing =
      getComputedStyle(main).getPropertyValue("--lk-ease").trim() || "ease-out";
    const box = main.getBoundingClientRect();
    // 하나라도 움직이면 모두 흐름에서 뗀다. 일부만 떼면 남은 창이 빈자리를 채우려 늘어난다.
    pinned = panes;
    main.dataset.arranging = "";
    for (const pane of panes) {
      const id = pane.dataset.paneId!;
      const to = after.get(id)!;
      const from = before.get(id);
      Object.assign(pane.style, boxFrame(to), { position: "absolute" });

      if (from) {
        if (sameRect(from, to)) continue;
        animations.push(
          pane.animate([boxFrame(from), boxFrame(to)], {
            duration: MOVE_DURATION,
            easing,
          }),
        );
        continue;
      }

      // 새 창. 끌어온 단추에서 나온다. 단추를 모르면 제가 선 바깥 가장자리 한가운데의 작은
      // 구멍에서 나온다 — 좌우로 나란하면 옆 가장자리, 위아래로 쌓였으면 위·아래 가장자리다.
      // 지니의 계산은 뷰포트 좌표로 한다(조각을 작업 영역 밖, 사이드바 위에도 그리므로).
      const other = [...after].find(([otherId]) => otherId !== id)?.[1];
      const stacked = other && Math.abs(other.top - to.top) > EPSILON;
      const edgeX =
        stacked || !other
          ? to.left + to.width / 2
          : to.left < other.left
            ? to.left
            : to.left + to.width;
      const edgeY = !stacked
        ? to.top + to.height / 2
        : to.top < other.top
          ? to.top
          : to.top + to.height;
      const source: Rect = origin ?? {
        left: box.left + edgeX - FALLBACK_SPOUT / 2,
        top: box.top + edgeY - FALLBACK_SPOUT / 2,
        width: FALLBACK_SPOUT,
        height: FALLBACK_SPOUT,
      };
      const emerging = genie(
        pane,
        { ...to, left: box.left + to.left, top: box.top + to.top },
        source,
      );
      animations.push(...emerging.animations);
      cleanups.push(emerging.remove);
    }
  }

  let ended = false;
  /** @param interrupted 다 끝나서가 아니라 도중에 멈춘 것인가(다음 배치 변경, 화면을 떠남) */
  const end = (interrupted: boolean) => {
    if (ended) return;
    ended = true;
    if (interrupted) for (const animation of animations) animation.cancel();
    for (const cleanup of cleanups) cleanup(interrupted);
    for (const pane of pinned) {
      for (const property of ["position", "left", "top", "width", "height"]) {
        pane.style.removeProperty(property);
      }
    }
    delete main.dataset.arranging;
    onEnd();
  };
  // 멈춰서 끝난 경우(cancel)에는 finished 가 거절된다. 그때는 end 가 이미 불린 뒤다.
  Promise.all(animations.map((animation) => animation.finished)).then(
    () => end(false),
    () => {},
  );
  return () => end(true);
}

/**
 * @param arrangement 창의 구성과 방향을 적은 글자. 이 값이 바뀌면 배치가 바뀐 것이다
 *   (비율만 바뀐 것은 움직임이 아니다 — 손잡이를 끄는 동안 이미 따라 움직였다)
 * @param narrow 좁은 창인가. 좁아지거나 넓어지며 창 수가 달라진 것은 사용자가 놓은 것이 아니다
 * @param solo 배치에 창이 하나뿐인가(그리는 창의 수가 아니다 — 좁은 창은 둘이어도 하나만 그린다)
 * @param dropOriginRef 방금 끌어온 단추의 자리. 읽고 나면 비운다
 */
export function usePaneMotion(
  mainRef: RefObject<HTMLElement | null>,
  arrangement: string,
  narrow: boolean,
  solo: boolean,
  dropOriginRef: RefObject<DropOrigin | null>,
) {
  /** 마지막으로 본 창들의 자리. 배치가 바뀌는 순간에는 "바뀌기 전" 자리다 */
  const known = useRef<ReadonlyMap<string, Rect>>(new Map());
  const wasNarrow = useRef(narrow);
  const wasSolo = useRef(solo);
  const stop = useRef<(() => void) | null>(null);

  /*
   * 창의 크기는 다시 그리지 않고도 바뀐다(사이드바 손잡이, 구분선, 브라우저 창 크기). 그래서
   * 그릴 때가 아니라 크기가 바뀔 때마다 자리를 적어 둔다. 배치가 바뀌면 아래의 layout effect 가
   * 이 관찰보다 먼저 돌기 때문에, 그때 읽는 값은 아직 바뀌기 전의 자리다.
   */
  useEffect(() => {
    const main = mainRef.current;
    if (!main || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      known.current = rectsOf(main);
    });
    observer.observe(main);
    for (const child of Array.from(main.children)) {
      if ((child as HTMLElement).dataset.paneId) observer.observe(child);
    }
    return () => observer.disconnect();
  }, [mainRef, arrangement]);

  useLayoutEffect(() => {
    const main = mainRef.current;
    if (!main) return;
    // "바뀌기 전" 은 앞선 움직임을 끝내기 전에 읽는다. 끝내면 그 움직임이 제 마무리로 자리를
    // 다시 적는데, 그때 재는 것은 이미 새 배치라 전후가 같아져 움직임 없이 툭 바뀐다.
    const before = known.current;
    // 앞선 움직임이 남아 있으면 그 자리에서 끝낸다. 그래야 지금 재는 것이 새 배치다.
    stop.current?.();
    const after = rectsOf(main);
    known.current = after;

    const origin = dropOriginRef.current;
    dropOriginRef.current = null;
    const resized = wasNarrow.current !== narrow;
    /*
     * 좁은 창은 창을 하나만 그린다. 그리는 창이 바뀌었다고 다 배치가 바뀐 것은 아니다 — 두 창 가운데
     * 보는 쪽만 바뀐 것은 화면이 통째로 바뀐 것이라 움직이지 않는다(그대로 두면 탭을 닫을 때마다
     * 다른 창이 지니로 나온다). 창이 하나뿐이던 배치에서 그 창이 다른 창으로 바뀐 것, 곧 탭을 모두
     * 닫아 새 탭의 창이 선 것만 넓은 창에서처럼 움직인다.
     */
    const swapped = narrow && !(wasSolo.current && solo);
    // 처음 그릴 때(저장된 배치를 되살린 것)와 창 폭이 바뀌어 생긴 변화도 움직이지 않는다.
    if (
      before.size === 0 ||
      resized ||
      swapped ||
      typeof main.animate !== "function"
    ) {
      return;
    }
    const fresh =
      origin && performance.now() - origin.at < ORIGIN_TTL ? origin.rect : null;
    stop.current = play(main, before, after, fresh, () => {
      stop.current = null;
      known.current = rectsOf(main);
    });
    // 배치가 바뀔 때만 본다. narrow 와 solo 는 그 순간의 값을 읽기만 한다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangement]);

  // 위의 effect 보다 뒤에 둔다. 같은 순간에 바뀌었으면 위에서 먼저 예전 값과 견준다.
  useLayoutEffect(() => {
    wasNarrow.current = narrow;
    wasSolo.current = solo;
  }, [narrow, solo]);

  useEffect(() => () => stop.current?.(), []);
}
