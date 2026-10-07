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

import { Button, IconButton } from "@/design-system/primitives";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { placeCard, type Placement, type Rect } from "./place-card";
import styles from "./coach-mark.module.css";

const HOLE_PAD = 6;

export interface CoachMarkProps {
  ready: boolean;
  target: Rect | null;
  step: number;
  total: number;
  title: string;
  body: string;
  placement: readonly Placement[];
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
}

export function CoachMark({
  ready,
  target,
  step,
  total,
  title,
  body,
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
  const last = step === total - 1;

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
  }, [hole, placement, step]);

  useEffect(() => {
    if (ready) nextRef.current?.focus({ preventScroll: true });
  }, [ready, step]);

  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        onNext();
      } else if (event.key === "ArrowLeft" && step > 0) {
        event.preventDefault();
        onBack();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onBack, onNext, onSkip, step]);

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
                rx={12}
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
      </svg>
      {ready && (
        <div
          key={step}
          ref={cardRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          aria-describedby={bodyId}
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
            {Array.from({ length: total }, (_, index) => (
              <li
                key={index}
                className={cx(
                  styles.segment,
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
          <div className={styles.footer}>
            {!last && (
              <button type="button" className={styles.skip} onClick={onSkip}>
                {t("투어::건너뛰기")}
              </button>
            )}
            <div className={styles.actions}>
              {step > 0 && (
                <IconButton
                  icon="arrow-left"
                  label={t("이전")}
                  iconSize={15}
                  className={styles.back}
                  onClick={onBack}
                />
              )}
              <Button
                ref={nextRef}
                size="md"
                variant="primary"
                onClick={onNext}
              >
                {last ? t("투어::완료") : t("다음")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
