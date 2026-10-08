"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { createPortal } from "react-dom";

import { Icon } from "@/design-system/icons/icon";
import { Button, IconButton } from "@/design-system/primitives";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { placeCard, type Placement, type Rect } from "./place-card";
import styles from "./coach-mark.module.css";

const HOLE_PAD = 6;
const HOLE_RADIUS = 12;

export interface CoachMarkProps {
  ready: boolean;
  target: Rect | null;
  step: number;
  chapters: readonly number[];
  last: boolean;
  title: string;
  body: string;
  action?: string;
  waiting?: boolean;
  placement: readonly Placement[];
  onBack: (() => void) | null;
  onNext: () => void;
  onSkip: () => void;
}

function topModal(): HTMLElement | null {
  const open = Array.from(document.querySelectorAll("dialog[open]"));
  const modal = open.filter((dialog) => {
    try {
      return dialog.matches(":modal");
    } catch {
      return true;
    }
  });
  return (modal.at(-1) as HTMLElement | undefined) ?? null;
}

function useLayerHost() {
  const [host, setHost] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const update = () => setHost(topModal());
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["open"],
    });
    return () => observer.disconnect();
  }, []);
  return host ?? document.body;
}

function roundedRect({ left, top, width, height }: Rect, r: number) {
  const radius = Math.min(r, width / 2, height / 2);
  return [
    `M${left + radius},${top}`,
    `H${left + width - radius}`,
    `A${radius},${radius} 0 0 1 ${left + width},${top + radius}`,
    `V${top + height - radius}`,
    `A${radius},${radius} 0 0 1 ${left + width - radius},${top + height}`,
    `H${left + radius}`,
    `A${radius},${radius} 0 0 1 ${left},${top + height - radius}`,
    `V${top + radius}`,
    `A${radius},${radius} 0 0 1 ${left + radius},${top}`,
    "Z",
  ].join(" ");
}

export function CoachMark({
  ready,
  target,
  step,
  chapters,
  last,
  title,
  body,
  action,
  waiting = false,
  placement,
  onBack,
  onNext,
  onSkip,
}: CoachMarkProps) {
  const maskId = useId();
  const titleId = useId();
  const bodyId = useId();
  const cardRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const [position, setPosition] = useState<{ left: number; top: number }>();
  const [viewport, setViewport] = useState({ width: 0, height: 0 });
  const host = useLayerHost();
  const interactive = Boolean(action) && !waiting;

  useEffect(() => {
    const measure = () =>
      setViewport({ width: window.innerWidth, height: window.innerHeight });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const hole = useMemo<Rect | null>(
    () =>
      ready && target
        ? {
            left: target.left - HOLE_PAD,
            top: target.top - HOLE_PAD,
            width: target.width + HOLE_PAD * 2,
            height: target.height + HOLE_PAD * 2,
          }
        : null,
    [ready, target],
  );

  useLayoutEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    setPosition(
      placeCard(
        hole,
        { width: card.offsetWidth, height: card.offsetHeight },
        { width: window.innerWidth, height: window.innerHeight },
        placement,
      ),
    );
  }, [hole, placement, step, host]);

  useEffect(() => {
    if (!ready) return;
    (nextRef.current ?? cardRef.current)?.focus({ preventScroll: true });
  }, [ready, step, host, waiting]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onSkip();
      } else if (event.key === "ArrowRight" && !waiting) {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft" && onBack) {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [onBack, onNext, onSkip, waiting]);

  const trapFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab" || !cardRef.current) return;
    const items = Array.from(
      cardRef.current.querySelectorAll<HTMLElement>("button:not(:disabled)"),
    );
    if (items.length === 0) return;
    const first = items[0];
    const end = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      end.focus();
    } else if (!event.shiftKey && document.activeElement === end) {
      event.preventDefault();
      first.focus();
    }
  };

  const frame = roundedRect(
    { left: 0, top: 0, width: viewport.width, height: viewport.height },
    0,
  );
  const catcher =
    interactive && hole ? `${frame} ${roundedRect(hole, HOLE_RADIUS)}` : frame;
  const total = chapters.length;

  return createPortal(
    <div className={styles.root}>
      <svg className={styles.backdrop} aria-hidden="true">
        <defs>
          <mask id={maskId}>
            <rect width="100%" height="100%" fill="white" />
            {hole && (
              <rect
                key={step}
                className={styles.hole}
                x={hole.left}
                y={hole.top}
                width={hole.width}
                height={hole.height}
                rx={HOLE_RADIUS}
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          className={styles.scrim}
          mask={`url(#${maskId})`}
        />
        {interactive && hole && (
          <rect
            key={`ring-${step}`}
            className={styles.ring}
            x={hole.left}
            y={hole.top}
            width={hole.width}
            height={hole.height}
            rx={HOLE_RADIUS}
          />
        )}
        <path className={styles.catcher} d={catcher} fillRule="evenodd" />
      </svg>
      {ready && (
        <div
          key={step}
          ref={cardRef}
          role="dialog"
          aria-modal={interactive ? undefined : "true"}
          aria-labelledby={titleId}
          aria-describedby={bodyId}
          tabIndex={-1}
          className={cx(styles.card, !position && styles.measuring)}
          style={position}
          onKeyDown={trapFocus}
        >
          <ol
            className={styles.progress}
            aria-label={t("투어::{total}단계 중 {step}단계", {
              total,
              step: step + 1,
            })}
          >
            {chapters.map((chapter, index) => (
              <li
                key={index}
                className={cx(
                  styles.segment,
                  index > 0 &&
                    chapters[index - 1] !== chapter &&
                    styles.chapterStart,
                  index <= step && styles.segmentDone,
                )}
              />
            ))}
          </ol>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <p id={bodyId} className={styles.body}>
            {body}
          </p>
          {action && (
            <p
              className={cx(styles.action, waiting && styles.waiting)}
              role={waiting ? "status" : undefined}
            >
              <Icon
                name={waiting ? "loader-circle" : "mouse-pointer-click"}
                size={15}
                className={cx(waiting && styles.spin)}
              />
              <span>{action}</span>
            </p>
          )}
          <div className={styles.footer}>
            {!last && (
              <button type="button" className={styles.skip} onClick={onSkip}>
                {t("투어::건너뛰기")}
              </button>
            )}
            <div className={styles.actions}>
              {onBack && (
                <IconButton
                  icon="arrow-left"
                  label={t("이전")}
                  iconSize={15}
                  className={styles.back}
                  onClick={onBack}
                />
              )}
              {!waiting && (
                <Button
                  ref={nextRef}
                  size="md"
                  variant="primary"
                  onClick={onNext}
                >
                  {last ? t("투어::완료") : t("다음")}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>,
    host,
  );
}
