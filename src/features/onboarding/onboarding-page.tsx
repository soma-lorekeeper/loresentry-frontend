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
  IconButton,
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

import { AppWindow, type TourScene as Scene } from "./scenes";
import { stepsFor } from "./steps";
import styles from "./onboarding.module.css";

const CANVAS = { width: 1000, height: 640 };
const SIDEBAR_WIDTH = 196;
const LEAVE_MS = 260;
const FOCUS_PAD = 6;

/** 단계마다 비출 자리. 최신화는 사이드바 항목을 먼저 비추고, 검토 창이 열리면 옮겨 간다. */
const FOCUS: Record<Scene, { target: string; at: number; whole?: boolean }[]> =
  {
    workspace: [{ target: "workspace", at: 0 }],
    relations: [{ target: "relations", at: 0 }],
    graph: [{ target: "graph", at: 0 }],
    timeline: [{ target: "timeline", at: 0 }],
    refresh: [
      { target: "refresh", at: 0 },
      { target: "diff", at: 1500, whole: true },
    ],
    name: [{ target: "name", at: 0 }],
  };

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  /** 잘리면 뜻이 사라지는 자리(비교 창의 두 칸). 다가가더라도 통째로 보이게 한다. */
  whole?: boolean;
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
    const place = (target: string, whole?: boolean) => {
      const el =
        root.querySelector<HTMLElement>(
          `[data-scene-state='current'] [data-focus='${target}']`,
        ) ?? root.querySelector<HTMLElement>(`[data-focus='${target}']`);
      if (el) setFocus({ ...boxIn(root, el), whole });
    };
    const [first, ...later] = FOCUS[scene];
    place(first.target, first.whole);
    const timers = later.map(({ target, at, whole }) =>
      window.setTimeout(() => place(target, whole), at),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [windowEl, scene]);
  return focus;
}

/**
 * 카메라: 설명하는 자리로 창 안을 천천히 당겨 온다. 작은 자리일수록 더 가까이 가되, 큰 자리도
 * 조금은 다가가서 단계마다 시선이 옮겨 간다. 좁은 화면에서는 창이 작게 줄어 있으니 더 당긴다.
 * 창 가장자리 밖이 드러나지 않게 이동을 묶고, 움직임을 줄인 환경에서는 당기지 않는다.
 */
function useCamera(focus: Box | null, compact: boolean) {
  const [still] = useState(
    () =>
      typeof window !== "undefined" &&
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  if (!focus || still) return { transform: "none", zoom: 1 };
  const { width: cw, height: ch } = CANVAS;
  // 작업 면 안을 비출 때는 사이드바를 통째로 밀어낼 만큼은 다가간다.
  const inSheet = focus.left >= SIDEBAR_WIDTH - 16;
  const [base, cap] = compact ? [1.6, 2.2] : [inSheet ? 1.25 : 1.15, 1.45];
  const floor = focus.whole
    ? Math.max(1, Math.min(base, (cw - 24) / focus.width))
    : base;
  const zoom = Math.min(
    cap,
    Math.max(
      floor,
      Math.min((cw * 0.8) / focus.width, (ch * 0.8) / focus.height),
    ),
  );
  const minX = cw - zoom * cw;
  const minY = ch - zoom * ch;
  const clamp = (value: number, min: number) =>
    Math.min(0, Math.max(min, value));

  // 자리가 화면보다 넓으면 가운데 대신 왼쪽 끝에 맞춘다. 행 이름과 목록이 먼저 읽혀야 한다.
  let x =
    zoom * focus.width > cw - 24
      ? 12 - zoom * focus.left
      : cw / 2 - zoom * (focus.left + focus.width / 2);
  x = clamp(x, minX);
  // 사이드바가 띠처럼 조금만 걸리면 아예 보이거나 아예 빠지게 한다.
  const sidebar = zoom * SIDEBAR_WIDTH + x;
  if (inSheet && sidebar > 0 && sidebar < 160) {
    const hidden = -zoom * SIDEBAR_WIDTH + 6;
    x = hidden >= minX ? hidden : 0;
  }

  // 위아래도 가장자리 가까이에서 글줄이 반쯤 걸리지 않게 끝에 붙인다.
  let y = clamp(
    zoom * focus.height > ch - 24
      ? 12 - zoom * focus.top
      : ch / 2 - zoom * (focus.top + focus.height / 2),
    minY,
  );
  if (y > -96) y = 0;
  else if (y - minY < 96) y = minY;
  return { transform: `translate(${x}px, ${y}px) scale(${zoom})`, zoom };
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
  const camera = useCamera(focus, size !== null && size.width < 600);
  // 비춘 자리가 창을 거의 채우면 테두리 빛은 창 가장자리에 붙은 띠로만 보인다. 그때는 끈다.
  const ring = focus !== null && camera.zoom * focus.width < CANVAS.width * 0.9;
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
          <div
            className={styles.camera}
            style={{ transform: camera.transform }}
          >
            <AppWindow scene={scene} leaving={leaving} userName={userName}>
              {focus && ring && (
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
      <Icon
        name={pending === destination ? "loader-circle" : icon}
        size={20}
        className={cx(
          styles.choiceIcon,
          pending === destination && styles.spin,
        )}
      />
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
        "‘유리 정원의 기록’으로 직접 눌러 봐요.",
        0,
      )}
      {card(
        "new",
        "plus",
        "새 프로젝트 만들기",
        "제목만 정하면 바로 시작해요.",
        70,
      )}
      {error && <InlineNotice>{error}</InlineNotice>}
      <button
        type="button"
        className={styles.later}
        onClick={() => void choose("later")}
        disabled={pending !== null}
      >
        {replay ? "사용 가이드로 돌아가기" : "나중에 할게요"}
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
            Lore Sentry
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
            <h1 id="onboarding-title" className={styles.title}>
              {current.title}
            </h1>
            {current.body && <p className={styles.body}>{current.body}</p>}
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
                hideLabel
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  rename.reset();
                }}
                error={nameError}
                readOnly={rename.isPending}
                autoComplete="nickname"
                autoFocus
                spellCheck={false}
              />
            </form>
          )}
          {!onStart && (
            <div className={styles.buttons}>
              <IconButton
                icon="arrow-left"
                iconSize={18}
                label="이전"
                className={cx(styles.previous, step === 0 && styles.idle)}
                onClick={() => go(step - 1)}
                disabled={step === 0 || rename.isPending}
              />
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
            </div>
          )}
        </div>
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
