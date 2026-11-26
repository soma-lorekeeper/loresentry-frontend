"use client";

import { useState, useSyncExternalStore } from "react";

import {
  Button,
  DialogCard,
  Icon,
  type IconName,
} from "@/design-system/primitives";
import { t } from "@/i18n";

import styles from "./shutdown-notice.module.css";

const SEEN_KEY = "ls.shutdown-notice.seen";
const FALLBACK_EMAIL = "contact@loresentry.com";

function seen() {
  try {
    return window.sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}

function remember() {
  try {
    window.sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    return;
  }
}

const subscribeNothing = () => () => {};

export function ShutdownNotice({ contactEmail }: { contactEmail: string }) {
  const unseen = useSyncExternalStore(
    subscribeNothing,
    () => !seen(),
    () => false,
  );
  const [dismissed, setDismissed] = useState(false);
  const open = unseen && !dismissed;

  const close = () => {
    remember();
    setDismissed(true);
  };

  const email = contactEmail || FALLBACK_EMAIL;
  const items: Array<{ icon: IconName; text: string }> = [
    {
      icon: "log-out",
      text: t("종료 후에는 로그인하거나 원고를 열 수 없습니다."),
    },
    {
      icon: "download",
      text: t(
        "보관할 원고와 설정 문서는 종료 전에 내려받아 주시기 바랍니다. 문서를 열고 위쪽의 '내보내기'를 누르면 됩니다. 문서마다 따로 내려받아야 합니다.",
      ),
    },
    {
      icon: "mail",
      text: t(
        "종료 후에도 2026년 12월 29일까지는 가입한 이메일로 {email} 에 요청하시면 원고와 설정 문서를 파일로 보내 드립니다.",
        { email },
      ),
    },
    {
      icon: "trash-2",
      text: t("보관한 데이터는 2026년 12월 29일 이후 모두 파기합니다."),
    },
  ];

  return (
    <DialogCard
      open={open}
      onClose={close}
      size="md"
      title={t("서비스 종료 안내")}
      description={t(
        "Lore Sentry는 2026년 11월 29일에 서비스를 종료합니다. 그동안 이용해 주셔서 감사합니다.",
      )}
      closeLabel={t("닫기")}
      actions={
        <Button variant="primary" onClick={close}>
          {t("확인")}
        </Button>
      }
    >
      <ul className={styles.items}>
        {items.map((item) => (
          <li key={item.icon} className={styles.item}>
            <Icon name={item.icon} size={16} />
            <span>{item.text}</span>
          </li>
        ))}
      </ul>
    </DialogCard>
  );
}
