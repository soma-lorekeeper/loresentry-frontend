"use client";

import {
  useDialogUsage,
  useVisibleUsage,
} from "@/features/analytics/usage-hooks";

import {
  Button,
  DialogBullets,
  DialogCard,
  InlineNotice,
} from "@/design-system/primitives";
import { t } from "@/i18n";

export function StartCheckDialog({
  open,
  title,
  runningTitle,
  onClose,
  onStart,
}: {
  open: boolean;
  title: string;
  runningTitle: string | null;
  onClose: () => void;
  onStart: () => void;
}) {
  const dialogUsage = useDialogUsage(
    "setting_check_start",
    open,
    "document_header",
  );
  useVisibleUsage(
    "feature_notice_viewed",
    {
      feature: "setting_check",
      notice_kind: "concurrent",
      entry_point: "document_header",
    },
    open && runningTitle !== null,
    "concurrent",
  );
  return (
    <DialogCard
      open={open}
      onClose={onClose}
      title={t("설정 오류 점검을 시작할까요?")}
      description={t(
        "이 회차를 앞 회차와 설정 문서에 대조해 어긋나 보이는 곳을 찾아요.",
      )}
      target={{ icon: "file-text", name: title, kind: "manuscript" }}
      actions={
        <>
          <Button size="md" icon="x" onClick={onClose}>
            {t("취소")}
          </Button>
          <Button
            size="md"
            variant="primary"
            icon="scan-text"
            disabled={runningTitle !== null}
            onClick={() => {
              dialogUsage.submitted();
              onStart();
            }}
          >
            {t("점검 시작")}
          </Button>
        </>
      }
    >
      {runningTitle !== null && (
        <InlineNotice icon="loader-circle">
          {t("{title} 점검이 끝나면 시작할 수 있어요.", {
            title: runningTitle,
          })}
        </InlineNotice>
      )}
      <DialogBullets
        items={[
          {
            icon: "pin",
            text: t("중요 설정으로 표시한 문단은 꼭 지킬 사실로 봐요"),
          },
          {
            icon: "clock-3",
            text: t("보통 1–3분 걸려요. 그동안 계속 쓸 수 있어요"),
          },
        ]}
      />
    </DialogCard>
  );
}
