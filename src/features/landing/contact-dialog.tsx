"use client";

import { useState } from "react";

import { Button, DialogCard } from "@/design-system/primitives";
import { t } from "@/i18n";

/** 랜딩의 문의하기. 페이지를 떠나지 않고 주소를 보여 주고, 메일 쓰기 창은 원할 때만 연다. */
export function ContactDialog({
  email,
  open,
  onClose,
}: {
  email: string;
  open: boolean;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const close = () => {
    setCopied(false);
    onClose();
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
    } catch {
      // 클립보드가 막힌 환경에서는 주소가 화면에 그대로 있으니 직접 고르면 된다.
    }
  };

  /**
   * `mailto:` 는 기본 메일 앱이 없는 컴퓨터에서 아무 일도 하지 않는다. Lore Sentry 는 Google 계정으로만
   * 가입하므로 Gmail 쓰기 창을 새 탭으로 연다. 다른 메일을 쓰면 주소를 복사하면 된다.
   */
  const compose = () => {
    window.open(
      `https://mail.google.com/mail/?view=cm&fs=1&to=${encodeURIComponent(email)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <DialogCard
      open={open}
      onClose={close}
      title={t("문의하기")}
      closeLabel={t("문의하기 닫기")}
      target={{ icon: "mail", name: email }}
      actions={
        <>
          <Button size="md" icon={copied ? "check" : "copy"} onClick={copy}>
            {copied ? t("복사했어요") : t("주소 복사")}
          </Button>
          <Button size="md" variant="primary" icon="send" onClick={compose}>
            {t("Gmail로 쓰기")}
          </Button>
        </>
      }
    />
  );
}
