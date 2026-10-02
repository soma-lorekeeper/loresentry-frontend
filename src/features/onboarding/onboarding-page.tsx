"use client";

import { useRouter } from "next/navigation";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  Button,
  Icon,
  InlineNotice,
  TextField,
} from "@/design-system/primitives";
import type { User } from "@/domain/models";
import {
  useCompleteOnboarding,
  useCreateSampleProject,
  useUpdateAccount,
} from "@/features/projects/queries";
import { isServiceError } from "@/services/errors";
import { cx } from "@/shared/cx";
import { useElementSize } from "@/shared/use-element-size";

import { AppWindow, type Scene } from "./scenes";
import { stepsFor } from "./steps";
import styles from "./onboarding.module.css";

const CANVAS = { width: 1000, height: 640 };
const LEAVE_MS = 260;
const FOCUS_PAD = 6;

/** 단계마다 비출 자리. 최신화는 사이드바 항목을 먼저 비추고, 검토 창이 열리면 옮겨 간다. */
const FOCUS: Record<Scene, { target: string; at: number }[]> = {
  workspace: [{ target: "workspace", at: 0 }],
  relations: [{ target: "relations", at: 0 }],
  graph: [{ target: "graph", at: 0 }],
  timeline: [{ target: "timeline", at: 0 }],
  refresh: [
    { target: "refresh", at: 0 },
    { target: "diff", at: 1500 },
  ],
  name: [{ target: "name", at: 0 }],
};

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 변환(애니메이션·축소)에 흔들리지 않게 offset 으로 창 안의 자리를 잰다. */
function boxIn(root: HTMLElement, el: HTMLElement): Box {
  let left = 0;
  let top = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    left += node.offsetLeft;
    top += node.offsetTop;
    node = node.offsetParent as HTMLElement | null;
  }
  return {
    left: left - FOCUS_PAD,
    top: top - FOCUS_PAD,
    width: el.offsetWidth + FOCUS_PAD * 2,
    height: el.offsetHeight + FOCUS_PAD * 2,
  };
}

function useSpotlight(windowEl: HTMLElement | null, scene: Scene) {
  const [focus, setFocus] = useState<Box | null>(null);
  useLayoutEffect(() => {
    if (!windowEl) return;
    const root = windowEl.querySelector<HTMLElement>("[data-window]");
    if (!root) return;
    const place = (target: string) => {
      const el =
        root.querySelector<HTMLElement>(
          `[data-scene-state='current'] [data-focus='${target}']`,
        ) ?? root.querySelector<HTMLElement>(`[data-focus='${target}']`);
      if (el) setFocus(boxIn(root, el));
    };
    const [first, ...later] = FOCUS[scene];
    place(first.target);
    const timers = later.map(({ target, at }) =>
      window.setTimeout(() => place(target), at),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [windowEl, scene]);
  return focus;
}

/**
 * 실제 작업공간 창을 줄여 놓고, 단계마다 설명하는 자리를 비춘다. 창은 단계가 바뀌어도 그대로
 * 있고 내용과 사이드바 선택만 바뀐다. 빛은 다음 자리로 미끄러져 간다.
 */
function Stage({ scene, userName }: { scene: Scene; userName: string }) {
  const [frame, setFrame] = useState<HTMLDivElement | null>(null);
  const [canvas, setCanvas] = useState<HTMLDivElement | null>(null);
  const [leaving, setLeaving] = useState<Scene | null>(null);
  const [shown, setShown] = useState(scene);
  const size = useElementSize(frame);
  const focus = useSpotlight(canvas, scene);
  const scale = size
    ? Math.min(
        1,
        (size.width - (size.width < 600 ? 16 : 48)) / CANVAS.width,
        (size.height - 48) / CANVAS.height,
      )
    : 1;

  if (shown !== scene) {
    setLeaving(shown);
    setShown(scene);
  }

  useEffect(() => {
    if (leaving === null) return;
    const timer = window.setTimeout(() => setLeaving(null), LEAVE_MS);
    return () => window.clearTimeout(timer);
  }, [leaving]);

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
        <div data-window className={styles.windowFrame}>
          <AppWindow scene={scene} leaving={leaving} userName={userName}>
            {focus && (
              <span
                className={styles.spotlight}
                style={{
                  left: focus.left,
                  top: focus.top,
                  width: focus.width,
                  height: focus.height,
                }}
              />
            )}
          </AppWindow>
        </div>
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
  const steps = stepsFor(replay);
  const last = steps.length - 1;
  const nameStep = steps.findIndex((s) => s.id === "name");
  const [step, setStep] = useState(0);
  const [name, setName] = useState(user.displayName);
  const complete = useCompleteOnboarding();
  const createSample = useCreateSampleProject();
  const rename = useUpdateAccount();
  const current = steps[step];
  const onStart = step === last;
  const onName = current.id === "name";
  const trimmed = name.trim();
  const nameError = !trimmed
    ? "작가명을 입력해 주세요."
    : rename.error
      ? isServiceError(rename.error) && rename.error.code === "validation"
        ? rename.error.message
        : "작가명을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요."
      : undefined;

  const go = useCallback(
    (next: number) => setStep(Math.max(0, Math.min(last, next))),
    [last],
  );
  // 건너뛰기는 안내만 건너뛴다. 처음 들어온 사람은 작가명을 정하는 자리에서 멈춘다.
  const skipTo = nameStep >= 0 ? nameStep : last;

  const saveName = async () => {
    if (!trimmed || rename.isPending) return;
    if (trimmed !== user.displayName) {
      try {
        await rename.mutateAsync(trimmed);
      } catch {
        return;
      }
    }
    setName(trimmed);
    go(step + 1);
  };

  const next = () => {
    if (onName) void saveName();
    else go(step + 1);
  };
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });

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
        nextRef.current();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        go(step - 1);
      } else if (event.key === "Escape" && step < skipTo) {
        event.preventDefault();
        go(skipTo);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, step, skipTo]);

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
            LORE SENTRY
          </span>
          {step < skipTo && (
            <button
              type="button"
              className={styles.skip}
              onClick={() => go(skipTo)}
            >
              건너뛰기
              <Icon name="chevron-right" size={14} />
            </button>
          )}
        </div>

        <div className={styles.main}>
          <ol className={styles.progress} aria-label="안내 진행">
            {steps.slice(0, last).map((item, i) => (
              <li
                key={item.id}
                className={cx(
                  styles.progressSegment,
                  (i <= step || onStart) && styles.progressDone,
                  i === step && styles.progressCurrent,
                )}
                aria-current={i === step ? "step" : undefined}
              >
                <span className="lk-visually-hidden">
                  {i + 1}단계 {item.title.replace("\n", " ")}
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
          {onName && (
            <form
              className={styles.nameForm}
              onSubmit={(event) => {
                event.preventDefault();
                void saveName();
              }}
            >
              <TextField
                label="작가명"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  rename.reset();
                }}
                error={nameError}
                hint={user.email ? `로그인 계정 ${user.email}` : undefined}
                readOnly={rename.isPending}
                autoComplete="nickname"
                autoFocus
                spellCheck={false}
              />
            </form>
          )}
          <div className={styles.buttons}>
            <Button
              size="lg"
              icon="arrow-left"
              className={styles.previous}
              onClick={() => go(step - 1)}
              disabled={step === 0 || rename.isPending}
            >
              이전
            </Button>
            {!onStart && (
              <Button
                size="lg"
                variant="primary"
                icon={onName ? "check" : "arrow-right"}
                onClick={next}
                busy={onName && rename.isPending}
                disabled={onName && !trimmed}
              >
                {onName
                  ? rename.isPending
                    ? "저장 중…"
                    : "이 이름으로 계속"
                  : step === last - 1
                    ? "시작하기"
                    : "다음"}
              </Button>
            )}
          </div>
        </div>

        <p className={styles.keyHint}>
          {onName
            ? "Enter로 저장하고 계속"
            : onStart
              ? "←로 이전 단계"
              : "←→로 이동, Esc로 건너뛰기"}
        </p>
      </section>

      {onStart ? (
        <section className={styles.startStage} aria-label="시작 방법 고르기">
          <StartChoices replay={replay} onDone={finish} />
        </section>
      ) : (
        <Stage
          scene={current.id as Scene}
          userName={
            onName ? trimmed || "작가명" : name.trim() || user.displayName
          }
        />
      )}
    </main>
  );
}
