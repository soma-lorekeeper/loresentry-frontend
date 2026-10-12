"use client";

import { useEffect, useState, type CSSProperties } from "react";

import { AppWindow, type Scene } from "@/features/onboarding/scenes";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";
import { useElementSize } from "@/shared/use-element-size";

import styles from "./landing.module.css";

const CANVAS = { width: 1000, height: 640 };
/** 이보다 작게 줄이면 창 안의 글자를 읽을 수 없다. 좁은 화면에서는 사이드바 쪽을 잘라 낸다. */
const MIN_SCALE = 0.56;
const SIDEBAR = 196;
/** 틀의 위아래 테두리 두 줄. 틀의 높이는 창의 높이에 이것을 더한 값이다. */
const BORDER = 2;

/**
 * 폭을 재기 전에 틀이 차지할 높이를 CSS 로 잡는 값(landing.module.css 의 `.frame`).
 *
 * <p>틀의 높이는 폭을 재야 알 수 있는데, 재는 것은 브라우저에서 스크립트가 돈 뒤다. 빌드 때 만든
 * HTML 이 먼저 그려지는 동안 높이가 다르면, 스크립트가 돈 순간 아래 내용이 한꺼번에 밀린다.
 * 그래서 아래 컴포넌트가 높이를 구하는 식을 같은 상수로 CSS 에 옮겨 둔다. `padding-top` 의 % 는
 * 틀의 안쪽 폭이 기준이라, 폭에 비례하는 높이를 스크립트 없이 만들 수 있다.
 *
 * <pre>
 * 창의 높이 = 640 × max(폭/1000, 0.56, min(1, 폭/보일 범위))
 *           = max(폭의 64%, 358.4px, min(640px, 폭 × 640/보일 범위))
 * </pre>
 *
 * 가운데 값(358.4px)은 `--frame-min` 이, 나머지는 `--frame-spacer` 가 맡는다. 보일 범위의 오른쪽
 * 끝을 따로 정하지 않은 창은 마지막 항이 없다.
 */
function reservedHeight([focusStart, focusEnd]: [number, number]) {
  const fit = `${(CANVAS.height / CANVAS.width) * 100}%`;
  return {
    "--frame-min": `${CANVAS.height * MIN_SCALE + BORDER}px`,
    "--frame-spacer":
      focusEnd < CANVAS.width
        ? `max(${fit}, min(${CANVAS.height}px, calc(100% * ${CANVAS.height} / ${focusEnd - focusStart})))`
        : fit,
  } as CSSProperties;
}

/**
 * 실제 작업공간 창을 자리 폭에 맞춰 줄여 놓는다. 장면은 창이 화면 아래쪽 30% 선을 넘을 때
 * 처음 그려지고, 그때 온보딩과 같은 등장 동작이 한 번 재생된다. 실이 창에 닿는 순간과 같다.
 *
 * <p>창은 틀의 폭을 잰 뒤에 그린다. 재기 전에는 얼마나 줄여야 할지 몰라, 그리면 줄이지 않은 큰
 * 창이 잠깐 보인다. 그동안 틀은 {@link reservedHeight} 가 잡아 둔 높이로 비어 있다 — 아직 닿지
 * 않은 아래쪽 창들과 같은 모습이다.
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
      style={{
        ...reservedHeight(focus),
        // 잰 뒤의 높이는 이 값이 정한다. 재기 전에는 위에서 잡아 둔 높이를 쓴다.
        height: size ? CANVAS.height * scale + BORDER : undefined,
      }}
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
        {shown && size && (
          <AppWindow
            scene={scene}
            leaving={null}
            userName={t("랜딩::서윤주")}
          />
        )}
      </div>
    </figure>
  );
}
