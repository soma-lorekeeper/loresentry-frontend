"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";

import { Button, InlineNotice } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { t } from "@/i18n";
import {
  localeSyncSnapshot,
  readLocaleSync,
  setLocaleSync,
  subscribeLocaleSync,
} from "@/i18n/preference";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import styles from "./locale-sync-notice.module.css";

export function LocaleSyncNotice({ user }: { user: User }) {
  const snapshot = useSyncExternalStore(
    subscribeLocaleSync,
    localeSyncSnapshot,
    () => null,
  );
  const pending = snapshot ? readLocaleSync(user.id) : null;
  const services = useServices();
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: () => services.account.updateLocale(pending!.locale),
    onSuccess: (updated) => {
      setLocaleSync(null);
      queryClient.setQueryData(queryKeys.session, updated);
    },
  });
  if (!pending) return null;
  return (
    <aside className={styles.notice}>
      <InlineNotice icon="circle-alert">
        {t("이 기기의 언어는 변경했지만 계정에 저장하지 못했어요.")}
      </InlineNotice>
      <Button disabled={sync.isPending} onClick={() => sync.mutate()} size="sm">
        {sync.isPending ? t("저장 중…") : t("계정 언어 다시 저장")}
      </Button>
    </aside>
  );
}
