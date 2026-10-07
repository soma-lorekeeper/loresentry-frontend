"use client";

import { useState } from "react";

import { Button, DialogCard } from "@/design-system/primitives";

/** 랜딩의 문의하기. 페이지를 떠나지 않고 주소를 보여 주고, 메일 앱은 원할 때만 연다. */
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

  return (
    <DialogCard
      open={open}
      onClose={close}
      title="문의하기"
      closeLabel="문의하기 닫기"
      target={{ icon: "mail", name: email }}
      actions={
        <>
          <Button size="md" icon={copied ? "check" : "copy"} onClick={copy}>
            {copied ? "복사했어요" : "주소 복사"}
          </Button>
          <Button
            size="md"
            variant="primary"
            icon="send"
            onClick={() => {
              window.location.href = `mailto:${email}`;
            }}
          >
            메일 쓰기
          </Button>
        </>
      }
    />
  );
}
