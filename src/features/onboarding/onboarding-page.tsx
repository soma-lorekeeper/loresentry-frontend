"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { Button, Icon, InlineNotice } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import {
  useCompleteOnboarding,
  useCreateSampleProject,
} from "@/features/projects/queries";
import { isServiceError } from "@/services/errors";
import { cx } from "@/shared/cx";
import { useElementSize } from "@/shared/use-element-size";

import { GraphScene, ProjectsScene, RefreshScene, WriteScene } from "./scenes";
import { ONBOARDING_STEPS, TOUR_LENGTH } from "./steps";
import styles from "./onboarding.module.css";

const CANVAS = { width: 760, height: 580 };
const LEAVE_MS = 260;
const THREAD_MS = 520;
const LAST = ONBOARDING_STEPS.length - 1;

const SCENES: Record<string, () => ReactNode> = {
  projects: ProjectsScene,
  write: WriteScene,
  graph: GraphScene,
  refresh: RefreshScene,
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * 한 문서("레나 아르벨")가 단계를 건너 다음 자리로 옮겨 가는 공유 요소다. 떠나는 장면과 들어오는
 * 장면이 잠깐 함께 그려지는 동안 두 자리를 재고, 그 사이를 칩 하나가 날아간다.
 */
function useThread(
  canvas: HTMLDivElement | null,
  ghost: HTMLSpanElement | null,
  step: number,
  scale: number,
) {
  const previous = useRef(step);
  useLayoutEffect(() => {
    const from = previous.current;
    previous.current = step;
    if (from === step || !canvas || !ghost || prefersReducedMotion()) return;
    const source = canvas.querySelector<HTMLElement>(
      "[data-scene-state='leaving'] [data-thread]",
    );
    const target = canvas.querySelector<HTMLElement>(
      "[data-scene-state='current'] [data-thread]",
    );
    if (!source || !target || typeof ghost.animate !== "function") return;
    const box = canvas.getBoundingClientRect();
    const place = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      return {
        x: (r.left - box.left) / scale,
        y: (r.top - box.top) / scale,
        h: r.height / scale,
      };
    };
    const a = place(source);
    const b = place(target);
    const left = `${b.x}px`;
    const top = `${b.y + b.h / 2}px`;
    target.animate(
      [{ opacity: 0 }, { opacity: 0, offset: 0.8 }, { opacity: 1 }],
      {
        duration: THREAD_MS + 80,
        easing: "linear",
      },
    );
    ghost.animate(
      [
        {
          left,
          top,
          transform: `translate(${a.x - b.x}px, calc(${a.y + a.h / 2 - (b.y + b.h / 2)}px - 50%)) scale(0.96)`,
          opacity: 0,
        },
        { left, top, opacity: 1, offset: 0.12 },
        { left, top, opacity: 1, offset: 0.82 },
        { left, top, transform: "translate(0, -50%) scale(1)", opacity: 0 },
      ],
      { duration: THREAD_MS, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" },
    );
  }, [canvas, ghost, step, scale]);
}

function Stage({ step }: { step: number }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLDivElement | null>(null);
  const [ghost, setGhost] = useState<HTMLSpanElement | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [shown, setShown] = useState(step);
  const size = useElementSize(frame);
  const scale = size
    ? Math.min(
        1,
        (size.width - 48) / CANVAS.width,
        (size.height - 48) / CANVAS.height,
      )
    : 1;

  if (shown !== step) {
    setLeaving(shown);
    setShown(step);
  }

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

  useThread(canvas, ghost, step, scale);

  const render = (index: number, state: "current" | "leaving") => {
    const Scene = SCENES[ONBOARDING_STEPS[index].id];
    if (!Scene) return null;
    return (
      <div
        key={`${index}-${state}`}
        className={cx(
          styles.sceneLayer,
          state === "leaving" && styles.sceneLeaving,
        )}
        data-scene-state={state}
      >
        <Scene />
      </div>
    );
  };

  return (
    <div ref={setFrame} className={styles.stage} aria-hidden="true">
      <div
        ref={setCanvas}
        className={styles.canvas}
        style={{
          width: CANVAS.width,
          height: CANVAS.height,
          transform: `scale(${scale})`,
        }}
      >
        {leaving !== null && render(leaving, "leaving")}
        {render(step, "current")}
        <span ref={setGhost} className={styles.threadGhost}>
          <Icon name="circle-user-round" size={12} />
          레나 아르벨
        </span>
      </div>
    </div>
  );
}

function StartChoices({
  replay,
  onDone,
}: {
  replay: boolean;
  onDone: (destination: "sample" | "new" | "later") => Promise<void>;
}) {
  const [pending, setPending] = useState<"sample" | "new" | "later" | null>(
    null,
  );
  const [error, setError] = useState("");

  const choose = async (destination: "sample" | "new" | "later") => {
    if (pending) return;
    setPending(destination);
    setError("");
    try {
      await onDone(destination);
    } catch (cause) {
      setPending(null);
      setError(
        destination === "sample"
          ? "예시 프로젝트를 만들지 못했어요. 잠시 뒤 다시 시도하거나 새 프로젝트로 시작해 주세요."
          : isServiceError(cause) && cause.code === "network"
            ? "서버에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요."
            : "안내를 마치지 못했어요. 다시 시도해 주세요.",
      );
    }
  };

  const card = (
    destination: "sample" | "new",
    icon: "book-open" | "plus",
    title: string,
    description: string,
    delay: number,
  ) => (
    <button
      type="button"
      className={cx(
        styles.choice,
        destination === "sample" && styles.choicePrimary,
      )}
      style={{ "--d": `${delay}ms` } as CSSProperties}
      onClick={() => void choose(destination)}
      disabled={pending !== null}
      aria-busy={pending === destination || undefined}
    >
      <span className={styles.choiceIcon}>
        <Icon
          name={pending === destination ? "loader-circle" : icon}
          size={20}
          className={pending === destination ? styles.spin : undefined}
        />
      </span>
      <span className={styles.choiceCopy}>
        <span className={styles.choiceTitle}>{title}</span>
        <span className={styles.choiceDescription}>{description}</span>
      </span>
      <Icon name="arrow-right" size={18} className={styles.choiceArrow} />
    </button>
  );

  return (
    <div className={styles.choices}>
      {card(
        "sample",
        "book-open",
        "예시 프로젝트 둘러보기",
        "‘유리 정원의 기록’을 열어 원고, 관계, 그래프를 직접 눌러 보세요. 필요 없어지면 언제든 지울 수 있어요.",
        0,
      )}
      {card(
        "new",
        "plus",
        "새 프로젝트 만들기",
        "제목만 정하면 바로 첫 원고를 쓸 수 있어요.",
        70,
      )}
      {error && <InlineNotice>{error}</InlineNotice>}
      <button
        type="button"
        className={styles.later}
        onClick={() => void choose("later")}
        disabled={pending !== null}
      >
        {replay
          ? "사용 가이드로 돌아가기"
          : "둘 다 나중에 할게요. 프로젝트 목록으로 가기"}
      </button>
    </div>
  );
}

export function OnboardingPage({
  user,
  replay,
}: {
  user: User;
  replay: boolean;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const complete = useCompleteOnboarding();
  const createSample = useCreateSampleProject();
  const current = ONBOARDING_STEPS[step];
  const onStart = step === LAST;

  const go = useCallback((next: number) => {
    setStep(Math.max(0, Math.min(LAST, next)));
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.metaKey ||
        event.ctrlKey
      )
        return;
      const target = event.target instanceof Element ? event.target : null;
      const typing = target?.closest(
        "input, textarea, [contenteditable='true']",
      );
      const onControl = target?.closest("button, a");
      if (typing) return;
      if (event.key === "ArrowRight" || (event.key === "Enter" && !onControl)) {
        event.preventDefault();
        go(step + 1);
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(step - 1);
      } else if (event.key === "Escape") {
        event.preventDefault();
        go(LAST);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step]);

  const finish = async (destination: "sample" | "new" | "later") => {
    if (!replay && !user.onboardingCompleted) await complete.mutateAsync();
    if (destination === "sample") {
      const project = await createSample.mutateAsync();
      router.push(`/workspace/?projectId=${encodeURIComponent(project.id)}`);
    } else if (destination === "new") {
      router.push("/projects/?create=1");
    } else {
      router.push(replay ? "/projects/guide/" : "/projects/");
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.narration} aria-labelledby="onboarding-title">
        <div className={styles.top}>
          <span className={styles.wordmark}>
            <span className={styles.letterMark} aria-hidden="true">
              L
            </span>
            LOREKEEPER
          </span>
          {!onStart && (
            <button
              type="button"
              className={styles.skip}
              onClick={() => go(LAST)}
            >
              건너뛰기
              <Icon name="chevron-right" size={14} />
            </button>
          )}
        </div>

        <div className={styles.main}>
          <ol className={styles.progress} aria-label="안내 진행">
            {Array.from({ length: TOUR_LENGTH }, (_, i) => (
              <li
                key={i}
                className={cx(
                  styles.progressSegment,
                  (i <= step || onStart) && styles.progressDone,
                  i === step && styles.progressCurrent,
                )}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="lk-visually-hidden">
                  {i + 1}단계 {ONBOARDING_STEPS[i].title.replace("\n", " ")}
                </span>
              </li>
            ))}
          </ol>
          <div key={step} className={styles.copy} aria-live="polite">
            {step === 0 && !replay && (
              <p className={styles.greeting}>
                {user.displayName} 님, 환영해요.
              </p>
            )}
            <h1 id="onboarding-title" className={styles.title}>
              {current.title}
            </h1>
            <p className={styles.body}>{current.body}</p>
          </div>
          <div className={styles.buttons}>
            <Button
              size="lg"
              icon="arrow-left"
              className={styles.previous}
              onClick={() => go(step - 1)}
              disabled={step === 0}
            >
              이전
            </Button>
            {!onStart && (
              <Button
                size="lg"
                variant="primary"
                icon="arrow-right"
                onClick={() => go(step + 1)}
              >
                {step === TOUR_LENGTH - 1 ? "시작하기" : "다음"}
              </Button>
            )}
          </div>
        </div>

        <p className={styles.keyHint}>←→로 이동, Esc로 건너뛰기</p>
      </section>

      {onStart ? (
        <section className={styles.startStage} aria-label="시작 방법 고르기">
          <StartChoices replay={replay} onDone={finish} />
        </section>
      ) : (
        <Stage step={step} />
      )}
    </main>
  );
}
