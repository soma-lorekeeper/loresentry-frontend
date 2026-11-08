"use client";

import { useState } from "react";

import { CoachMark } from "@/features/tour/coach-mark";
import type { Placement } from "@/features/tour/place-card";
import { useTargetRect } from "@/features/tour/target-rect";
import { t } from "@/i18n";

const KEY = "loresentry.guide.refresh-review";

/** 검토 창의 가이드를 본 적이 있는가. 처음 한 번만 저절로 뜨고, 그 뒤에는 ‘가이드’ 단추로 다시 본다. */
export function reviewGuideSeen() {
  try {
    return window.localStorage.getItem(KEY) === "done";
  } catch {
    return true;
  }
}

export function markReviewGuideSeen() {
  try {
    window.localStorage.setItem(KEY, "done");
  } catch {}
}

interface GuideStep {
  title: string;
  body: string;
  target: string;
  placement: readonly Placement[];
}

const STEPS: readonly GuideStep[] = [
  {
    title: t("AI가 제안한 문서들이에요"),
    body: t(
      "왼쪽 목록이 AI가 고치거나 만들자고 제안한 문서예요. ‘~’는 고칠 문서, ‘+’는 새로 만들 문서예요.",
    ),
    target: "diff-list",
    placement: ["right", "bottom"],
  },
  {
    title: t("왼쪽은 현재, 오른쪽은 제안"),
    body: t(
      "왼쪽이 지금 문서의 현재 버전, 오른쪽이 AI가 쓴 제안 버전이에요. 양쪽 모두 그 자리에서 직접 고칠 수 있어요.",
    ),
    target: "diff-columns",
    placement: ["bottom", "top"],
  },
  {
    title: t("두 쪽을 같게 만들어요"),
    body: t(
      "가운데 화살표로 한쪽 값을 다른 쪽에 넣어요. 두 쪽이 같아지면 그 문서는 확정되고 목록에 체크가 붙어요.",
    ),
    target: "diff-compare",
    placement: ["top", "bottom", "left"],
  },
  {
    title: t("다 정하면 반영 확정"),
    body: t(
      "모든 문서가 확정되면 ‘반영 확정’이 켜져요. 반영하면 잠긴 문서가 풀리고, 반영 전 상태는 버전 기록에 남아요.",
    ),
    target: "diff-confirm",
    placement: ["bottom", "left"],
  },
];

/**
 * 변경 사항 창 위에 뜨는 코치마크 가이드. 작업공간 투어와 같은 모양으로, 목록 → 두 버전 →
 * 화살표 → 반영 확정 순서로 짚는다. CoachMark 가 열린 대화상자 안으로 들어가 창 위에 그려진다.
 */
export function ReviewGuide({ onEnd }: { onEnd: () => void }) {
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const { rect, ready } = useTargetRect(step.target);
  const last = index === STEPS.length - 1;

  return (
    <CoachMark
      ready={ready}
      target={rect}
      step={index}
      chapters={STEPS.map(() => 0)}
      last={last}
      title={step.title}
      body={step.body}
      placement={step.placement}
      onBack={index === 0 ? null : () => setIndex(index - 1)}
      onNext={() => (last ? onEnd() : setIndex(index + 1))}
      onSkip={onEnd}
    />
  );
}
