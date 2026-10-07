"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import type { User } from "@/domain/models";
import type { Locale } from "@/i18n";
import { switchLocale } from "@/i18n/preference";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

/**
 * 언어를 바꾼다. 로그인해 있으면 계정에도 적어 다른 기기에서도 같은 언어로 열리게 한다. 계정에 적지
 * 못해도 이 기기에서는 바꾼다 — 언어는 바로 보이는 선택이라 서버 오류로 막지 않는다.
 */
export function useLocaleSwitch() {
  const services = useServices();
  const queryClient = useQueryClient();
  const [pending, setPending] = useState(false);
  const switchTo = async (locale: Locale) => {
    setPending(true);
    const user = queryClient.getQueryData<User | null>(queryKeys.session);
    if (user) {
      try {
        await services.account.updateLocale(locale);
      } catch {
        // 위 주석대로 이 기기의 선택은 그대로 진행한다.
      }
    }
    switchLocale(locale);
  };
  return { switchTo, pending };
}
