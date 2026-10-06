"use client";

import { useEffect, useRef, useState } from "react";

import styles from "./landing.module.css";

interface Point {
  x: number;
  y: number;
}

interface Layout {
  width: number;
  height: number;
  d: string;
  plugs: Point[];
  /** 이름이 밝아질 때 실이 한 번에 뻗어 나가는 끝. 첫 창의 아래 끝이다. */
  heroExit: number;
  originY: number;
}

/** 화면 높이의 이 비율까지 내려온 자리까지 실을 그린다. 장면이 켜지는 선과 같다. */
const DRAW_LINE = 0.7;
const SAMPLES = 480;
/** 이보다 좁으면 창이 한 줄로 쌓이므로, 실은 왼쪽 여백을 따라 내려가며 창마다 가지를 낸다. */
const NARROW = "(max-width: 960px)";

function curve(a: Point, b: Point) {
  const mid = (a.y + b.y) / 2;
  return `M${a.x},${a.y} C${a.x},${mid} ${b.x},${mid} ${b.x},${b.y}`;
}

function measure(root: HTMLElement): Layout | null {
  const origin = root.querySelector<HTMLElement>("[data-thread='origin']");
  const stops = [...root.querySelectorAll<HTMLElement>("[data-thread='stop']")];
  if (!origin || stops.length < 2) return null;
  const base = root.getBoundingClientRect();
  const local = (rect: DOMRect, fx: number, fy: number): Point => ({
    x: rect.left - base.left + rect.width * fx,
    y: rect.top - base.top + rect.height * fy,
  });

  const name = local(origin.getBoundingClientRect(), 0.5, 1);
  const [hero, ...rest] = stops.map((stop) => stop.getBoundingClientRect());
  const heroExit = { x: name.x, y: hero.bottom - base.top };
  const parts = [`M${name.x},${name.y} L${heroExit.x},${heroExit.y}`];
  const plugs: Point[] = [name, heroExit];

  if (window.matchMedia(NARROW).matches) {
    const rail = (hero.left - base.left) / 2;
    const railTop = { x: rail, y: heroExit.y + 40 };
    parts.push(curve(heroExit, railTop));
    let y = railTop.y;
    for (const rect of rest) {
      const corner = local(rect, 0, 0);
      parts.push(`M${rail},${y} L${rail},${corner.y} L${corner.x},${corner.y}`);
      plugs.push(corner);
      y = corner.y;
    }
  } else {
    let from = heroExit;
    // 실은 마지막 창(AI 최신화)에 닿으며 끝난다.
    rest.forEach((rect, i) => {
      const entry = local(rect, 0.5, 0);
      parts.push(curve(from, entry));
      plugs.push(entry);
      if (i < rest.length - 1) {
        from = local(rect, 0.5, 1);
        plugs.push(from);
      }
    });
  }
  return {
    width: base.width,
    height: base.height,
    d: parts.join(" "),
    plugs,
    heroExit: heroExit.y,
    originY: name.y,
  };
}

/**
 * 원고 속 이름에서 내려오는 캐릭터 색 실. 창과 창 사이의 빈자리만 지나가고, 스크롤로 내려온
 * 만큼 그려진다. 이름이 처음 밝아질 때는 첫 창의 아래 끝까지 한 번에 뻗어 나가고, AI 최신화
 * 창에 닿으며 끝난다.
 */
export function StoryThread({ root }: { root: HTMLElement | null }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [layout, setLayout] = useState<Layout | null>(null);
  const [drawnY, setDrawnY] = useState(0);
  const growStart = useRef<number | null>(null);

  useEffect(() => {
    if (!root) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => setLayout(measure(root)));
    };
    const observer = new ResizeObserver(update);
    observer.observe(root);
    // 이름은 타이핑되면서 넓어지므로, 다 쓰일 때까지 몇 번 더 잰다.
    let ticks = 0;
    const poll = window.setInterval(() => {
      if (root.querySelector("[data-thread='origin']")) {
        update();
        ticks += 1;
      }
      if (ticks > 8) window.clearInterval(poll);
    }, 250);
    void document.fonts?.ready.then(update);
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.clearInterval(poll);
      window.removeEventListener("resize", update);
    };
  }, [root]);

  useEffect(() => {
    if (!root || !layout) return;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    const { heroExit, originY } = layout;
    growStart.current ??= performance.now();
    const floor = () => {
      if (reduce) return heroExit;
      const k = Math.min(1, (performance.now() - growStart.current!) / 900);
      return originY + (heroExit - originY) * (1 - Math.pow(1 - k, 3));
    };
    let frame = 0;
    const read = () => {
      const top = root.getBoundingClientRect().top;
      setDrawnY(Math.max(floor(), window.innerHeight * DRAW_LINE - top));
    };
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(read);
    };
    let grow = 0;
    const step = () => {
      read();
      if (floor() < heroExit) grow = requestAnimationFrame(step);
    };
    step();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      cancelAnimationFrame(grow);
      window.removeEventListener("scroll", onScroll);
    };
  }, [root, layout]);

  const [samples, setSamples] = useState<{ len: number; y: number }[]>([]);
  useEffect(() => {
    const path = pathRef.current;
    if (!path || !layout) return;
    const total = path.getTotalLength();
    setSamples(
      Array.from({ length: SAMPLES + 1 }, (_, i) => {
        const len = (total * i) / SAMPLES;
        return { len, y: path.getPointAtLength(len).y };
      }),
    );
  }, [layout]);

  if (!layout) return null;
  const total = samples.at(-1)?.len ?? 0;
  let drawn = 0;
  for (const sample of samples) {
    if (sample.y > drawnY) break;
    drawn = sample.len;
  }

  return (
    <svg
      className={styles.thread}
      width={layout.width}
      height={layout.height}
      viewBox={`0 0 ${layout.width} ${layout.height}`}
      aria-hidden="true"
    >
      <path
        ref={pathRef}
        d={layout.d}
        className={styles.threadPath}
        style={{
          strokeDasharray: total || undefined,
          strokeDashoffset: total ? total - drawn : undefined,
        }}
      />
      {layout.plugs.map((plug, i) => (
        <circle
          key={i}
          cx={plug.x}
          cy={plug.y}
          r={i === layout.plugs.length - 1 ? 6 : 4}
          className={styles.threadPlug}
          data-on={plug.y <= drawnY + 1 || undefined}
        />
      ))}
    </svg>
  );
}
