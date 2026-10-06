"use client";

import { useEffect, useState } from "react";

import { AppWindow, type Scene } from "@/features/onboarding/scenes";
import { cx } from "@/shared/cx";
import { useElementSize } from "@/shared/use-element-size";

import styles from "./landing.module.css";

const CANVAS = { width: 1000, height: 640 };
/** 이보다 작게 줄이면 창 안의 글자를 읽을 수 없다. 좁은 화면에서는 사이드바 쪽을 잘라 낸다. */
const MIN_SCALE = 0.56;
const SIDEBAR = 196;

/**
 * 실제 작업공간 창을 자리 폭에 맞춰 줄여 놓는다. 장면은 창이 화면 아래쪽 30% 선을 넘을 때
 * 처음 그려지고, 그때 온보딩과 같은 등장 동작이 한 번 재생된다. 실이 창에 닿는 순간과 같다.
 */
export function SceneFrame({
  scene,
  eager = false,
  label,
  className,
  focus = [SIDEBAR, CANVAS.width],
}: {
  scene: Scene;
  eager?: boolean;
  label: string;
  className?: string;
  /** 좁은 화면에서도 보이게 둘 창 안의 가로 범위(창 기준 px). 왼쪽 끝부터 잘라 낸다. */
  focus?: [number, number];
}) {
  const [frame, setFrame] = useState<HTMLElement | null>(null);
  const [shown, setShown] = useState(eager);
  const size = useElementSize(frame);
  const fit = size ? size.width / CANVAS.width : 1;
  const [focusStart, focusEnd] = focus;
  // 범위의 오른쪽 끝을 정했으면, 그 범위가 자리를 꽉 채울 만큼 키운다.
  const focusScale =
    size && focusEnd < CANVAS.width ? size.width / (focusEnd - focusStart) : 0;
  const scale = Math.max(fit, MIN_SCALE, Math.min(1, focusScale));
  const shift = size
    ? Math.min(
        focusStart * scale,
        Math.max(0, CANVAS.width * scale - size.width),
      )
    : 0;

  useEffect(() => {
    if (shown || !frame || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -30% 0px" },
    );
    observer.observe(frame);
    return () => observer.disconnect();
  }, [frame, shown]);

  return (
    <figure
      ref={setFrame}
      className={cx(styles.frame, shown && styles.frameShown, className)}
      style={{ height: CANVAS.height * scale + 2 }}
      data-thread="stop"
    >
      <figcaption className={styles.srOnly}>{label}</figcaption>
      <div
        className={styles.canvas}
        style={{
          width: CANVAS.width,
          height: CANVAS.height,
          transform: `translateX(${-shift}px) scale(${scale})`,
        }}
        aria-hidden="true"
      >
        {shown && <AppWindow scene={scene} leaving={null} userName="서윤주" />}
      </div>
    </figure>
  );
}
