"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  Button,
  DialogCard,
  Icon,
  InlineNotice,
  TextAreaField,
  TextField,
} from "@/design-system/primitives";
import type { User, WithdrawalReason } from "@/domain/models";
import { t } from "@/i18n";
import { settleSessionHint } from "@/features/auth/session-hint";
import { AccountRow } from "@/features/projects/user-menu";
import {
  useDeleteAccount,
  useProjects,
  useProjectTrash,
} from "@/features/projects/queries";
import { isServiceError } from "@/services/errors";

import styles from "./account.module.css";

const sameEmail = (typed: string, email: string) =>
  typed.trim().toLowerCase() === email.trim().toLowerCase();

const COMMENT_MAX = 1000;

const REASONS: Array<{ value: WithdrawalReason; label: string }> = [
  { value: "RARELY_USED", label: t("탈퇴 사유::자주 쓰지 않아요") },
  { value: "MISSING_FEATURE", label: t("탈퇴 사유::필요한 기능이 없어요") },
  { value: "HARD_TO_USE", label: t("탈퇴 사유::쓰기 어렵거나 불편해요") },
  { value: "UNRELIABLE", label: t("탈퇴 사유::오류가 잦거나 느려요") },
  {
    value: "SWITCHED_SERVICE",
    label: t("탈퇴 사유::다른 도구를 쓰기로 했어요"),
  },
  { value: "PRIVACY", label: t("탈퇴 사유::원고와 개인정보가 걱정돼요") },
  {
    value: "PAUSED_WRITING",
    label: t("탈퇴 사유::연재를 마쳤거나 쉬고 있어요"),
  },
  { value: "OTHER", label: t("탈퇴 사유::기타") },
];

export function AccountDeleteDialog({
  open,
  user,
  onClose,
}: {
  open: boolean;
  user: User;
  onClose: () => void;
}) {
  return open ? <AccountDeleteCard user={user} onClose={onClose} /> : null;
}

function AccountDeleteCard({
  user,
  onClose,
}: {
  user: User;
  onClose: () => void;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const remove = useDeleteAccount();
  const projects = useProjects();
  const trash = useProjectTrash();
  const [step, setStep] = useState<"reasons" | "confirm">("reasons");
  const [reasons, setReasons] = useState<WithdrawalReason[]>([]);
  const [comment, setComment] = useState("");
  const [typed, setTyped] = useState("");
  const matches = sameEmail(typed, user.email);
  const pending = remove.isPending;
  const mismatch =
    remove.error &&
    isServiceError(remove.error) &&
    remove.error.code === "confirmation-mismatch";
  const failed = remove.isError && !mismatch;

  const close = () => {
    if (pending) return;
    remove.reset();
    onClose();
  };

  const confirm = () => {
    if (!matches || pending) return;
    const answered = reasons.length > 0 || comment.trim().length > 0;
    remove.mutate(
      {
        confirmationEmail: typed.trim(),
        survey: answered ? { reasons, comment: comment.trim() } : undefined,
      },
      {
        onSuccess: () => {
          queryClient.clear();
          // 다음에 랜딩을 열 때 버튼을 숨기지 않게, 로그인했다는 표시를 지운다.
          settleSessionHint(false);
          router.replace("/goodbye/");
        },
      },
    );
  };

  const toggleReason = (reason: WithdrawalReason, checked: boolean) =>
    setReasons((current) =>
      checked
        ? REASONS.map((item) => item.value).filter(
            (value) => value === reason || current.includes(value),
          )
        : current.filter((value) => value !== reason),
    );

  const active = projects.data?.length;
  const trashed = trash.data?.length;
  const impact = [
    {
      icon: "book-open" as const,
      text:
        active === undefined
          ? t("모든 프로젝트와 그 안의 원고, 설정 문서, 메모, 버전")
          : t("프로젝트 {count}개와 그 안의 원고, 설정 문서, 메모, 버전", {
              count: active,
            }),
    },
    {
      icon: "trash-2" as const,
      text:
        trashed === undefined
          ? t("휴지통에 있는 프로젝트")
          : t("휴지통에 있는 프로젝트 {count}개", { count: trashed }),
    },
    { icon: "image" as const, text: t("올린 이미지와 AI 분석 결과") },
  ];

  if (step === "reasons") {
    return (
      <DialogCard
        open
        onClose={close}
        size="md"
        title={t("떠나시는 이유를 알려 주시겠어요?")}
        description={t(
          "답하지 않아도 돼요. 답은 계정과 따로 보관하고 서비스를 고치는 데만 써요.",
        )}
        actions={
          <>
            <Button size="md" icon="x" className={styles.ghost} onClick={close}>
              {t("취소")}
            </Button>
            <Button
              size="md"
              variant="primary"
              icon="arrow-right"
              onClick={() => setStep("confirm")}
            >
              {t("다음")}
            </Button>
          </>
        }
      >
        <div className={styles.deleteBody}>
          <fieldset className={styles.reasons}>
            <legend className="lk-visually-hidden">
              {t("탈퇴 사유::떠나는 이유")}
            </legend>
            {REASONS.map((reason, index) => (
              <label key={reason.value} className={styles.reason}>
                <input
                  type="checkbox"
                  autoFocus={index === 0}
                  checked={reasons.includes(reason.value)}
                  onChange={(event) =>
                    toggleReason(reason.value, event.target.checked)
                  }
                />
                {reason.label}
              </label>
            ))}
          </fieldset>
          <TextAreaField
            label={t("탈퇴 사유::더 알려 주실 내용")}
            labelHint={t("선택")}
            value={comment}
            maxLength={COMMENT_MAX}
            rows={3}
            onChange={(event) => setComment(event.target.value)}
          />
        </div>
      </DialogCard>
    );
  }

  return (
    <DialogCard
      open
      onClose={close}
      dismissible={!pending}
      size="md"
      title={pending ? t("계정을 삭제하고 있어요") : t("계정을 삭제할까요?")}
      description={
        pending
          ? t(
              "모든 자료를 지우는 중이에요. 창을 닫지 말고 잠시만 기다려 주세요.",
            )
          : t("이 계정과 모든 작업이 바로 삭제되며 되돌릴 수 없어요.")
      }
      footerHint={
        <Button
          size="md"
          variant="ghost"
          icon="arrow-left"
          onClick={() => {
            remove.reset();
            setStep("reasons");
          }}
          disabled={pending}
        >
          {t("이전")}
        </Button>
      }
      actions={
        <>
          <Button
            size="md"
            icon="x"
            className={styles.ghost}
            onClick={close}
            disabled={pending}
          >
            {t("취소")}
          </Button>
          <Button
            size="md"
            variant={matches ? "primary" : "outline"}
            icon={failed ? "refresh-cw" : "trash-2"}
            busy={pending}
            disabled={!matches}
            className={matches ? undefined : styles.muted}
            onClick={confirm}
          >
            {pending ? t("삭제 중…") : failed ? t("다시 시도") : t("계정 삭제")}
          </Button>
        </>
      }
    >
      <div className={styles.deleteBody}>
        {failed && (
          <InlineNotice icon="circle-alert">
            {remove.error?.message ??
              t("계정을 삭제하지 못했어요. 계정과 작업은 그대로 있어요.")}
          </InlineNotice>
        )}
        <div className={styles.deleteScope}>
          <AccountRow user={user} />
          <div className={styles.deleteImpact}>
            <p className={styles.deleteImpactTitle}>
              {t("함께 영구 삭제돼요")}
            </p>
            <ul>
              {impact.map((item) => (
                <li key={item.icon}>
                  <Icon name={item.icon} size={14} />
                  {item.text}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <TextField
          label={t("확인을 위해 이메일을 입력하세요")}
          value={typed}
          onChange={(event) => {
            setTyped(event.target.value);
            if (mismatch) remove.reset();
          }}
          placeholder={user.email}
          error={
            mismatch ? t("입력한 이메일이 계정 이메일과 달라요.") : undefined
          }
          readOnly={pending}
          autoFocus
          autoComplete="off"
          spellCheck={false}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              confirm();
            }
          }}
        />
      </div>
    </DialogCard>
  );
}
