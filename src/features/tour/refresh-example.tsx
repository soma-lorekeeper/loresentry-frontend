"use client";

import { useId, useState } from "react";

import { Modal, StatusNotice } from "@/design-system/primitives";
import styles from "@/features/graph-refresh/graph-diff-modal.module.css";
import { RefreshReview } from "@/features/graph-refresh/refresh-review";
import {
  EXAMPLE_PROPOSALS,
  EXAMPLE_SELECTED_ID,
  EXAMPLE_STATE,
  exampleLookup,
} from "@/features/onboarding/refresh-example";
import { t } from "@/i18n";

/**
 * 투어의 그래프 최신화 장에서 띄우는 예시 검토 창.
 *
 * <p>실제 최신화는 원고를 잠그고 AI 비용이 들며, 결과를 확정하기 전에는 끝나지 않는다. 그래서 투어는
 * 실제로 시작하지 않고, 실제 창과 같은 화면(refresh-review.tsx)에 꾸민 제안을 넣어 보여 준다. 화살표와
 * 직접 고치기는 실제처럼 움직이지만 서버를 부르지 않고, 확정하거나 닫으면 투어의 다음 장으로 넘어간다.
 */
export function TourRefreshExample({
  open,
  onDone,
}: {
  open: boolean;
  onDone: () => void;
}) {
  const titleId = useId();
  const [state, setState] = useState(EXAMPLE_STATE);
  const [selectedId, setSelectedId] = useState<string | null>(
    EXAMPLE_SELECTED_ID,
  );

  return (
    <Modal
      open={open}
      onClose={onDone}
      labelledBy={titleId}
      className={styles.modal}
    >
      <RefreshReview
        titleId={titleId}
        proposals={EXAMPLE_PROPOSALS}
        state={state}
        start={EXAMPLE_STATE}
        selectedId={selectedId}
        lookup={exampleLookup}
        candidatesOf={() => []}
        onSelect={setSelectedId}
        onChange={setState}
        onConfirm={onDone}
        onClose={onDone}
        notice={
          // 늘 붙어 있는 안내라 알림(role="alert")이 아니라 상태로 둔다. 창이 열릴 때 끼어들어 읽히지 않는다.
          <StatusNotice tone="info">
            {t("투어용 예시 · 실제 문서에는 반영되지 않음")}
          </StatusNotice>
        }
      />
    </Modal>
  );
}
