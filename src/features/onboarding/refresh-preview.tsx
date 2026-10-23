"use client";

import { useEffect, useRef } from "react";

import { RefreshReview } from "@/features/graph-refresh/refresh-review";

import styles from "./onboarding.module.css";
import {
  EXAMPLE_PROPOSALS,
  EXAMPLE_SELECTED_ID,
  EXAMPLE_STATE,
  exampleLookup,
} from "./refresh-example";

/*
 * 예시 화면(랜딩, 온보딩)의 "변경 사항" 창.
 *
 * 전에는 실제 창을 흉내 낸 그림을 따로 그렸다. 실제 창에 확정 단추·상태 줄·관계 칩·글자 단위
 * 차이 표시가 생기는 동안 그림은 그대로여서 둘이 달라졌다. 지금은 **실제 창이 쓰는 화면**
 * (graph-refresh/refresh-review.tsx)에 꾸며 낸 제안(refresh-example.ts)을 넣어 그린다. 실제 창이
 * 바뀌면 예시도 함께 바뀐다.
 */

const nothing = () => {};

/**
 * 실제 "변경 사항" 화면을 예시로 그린다. 보기만 하는 그림이라 누를 수 없다(`inert`).
 *
 * <p>화면은 실제 크기로 그린 뒤 무대의 자리에 맞게 통째로 줄인다(CSS 의 `.diffStage`). 좁은 자리에
 * 그대로 그리면 단추가 줄바꿈되어 실제와 다른 모양이 된다.
 */
export default function RefreshPreview() {
  const ref = useRef<HTMLDivElement>(null);

  // 랜딩의 실은 레나를 따라간다. 창에 실이 닿으면 이 표시가 붙은 자리가 강조된다(scenes.tsx 의
  // FOLLOWED). 목록의 줄은 실제 화면이 그리므로, 그려진 뒤에 고른 줄(레나)에 표시를 붙인다.
  useEffect(() => {
    ref.current
      ?.querySelector('[aria-current="true"]')
      ?.setAttribute("data-followed", "");
  }, []);

  return (
    <div ref={ref} className={styles.diffStage} inert>
      <RefreshReview
        proposals={EXAMPLE_PROPOSALS}
        state={EXAMPLE_STATE}
        start={EXAMPLE_STATE}
        selectedId={EXAMPLE_SELECTED_ID}
        lookup={exampleLookup}
        candidatesOf={() => []}
        onSelect={nothing}
        onChange={nothing}
        onConfirm={nothing}
        onClose={nothing}
      />
    </div>
  );
}
