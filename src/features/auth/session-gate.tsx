"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import {
  authTransitionPending,
  subscribeAuthTransition,
} from "@/services/api/auth-transition";
import type { User } from "@/domain/models";
import { LOCALE } from "@/i18n";
import { followAccountLocale } from "@/i18n/preference";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

export function useAuthTransitionPending() {
  return useSyncExternalStore(
    subscribeAuthTransition,
    authTransitionPending,
    () => false,
  );
}

export function useSession(enabled = true) {
  const transitionPending = useAuthTransitionPending();
  const services = useServices();
  return useQuery({
    enabled: enabled && !transitionPending,
    queryKey: queryKeys.session,
    queryFn: () => services.auth.getSession(),
    staleTime: Infinity,
  });
}

/**
 * 계정에 적힌 언어로 맞춘다. 아직 적힌 적이 없는 계정(새 가입, 언어 기능 이전의 회원)이면 지금 보고
 * 있는 언어를 적는다 — 한국에서 가입하면 한국어, 그 밖에서는 영어가 계정 언어가 된다. 적지 못해도
 * 화면은 그대로 쓴다. 다음 로그인 때 다시 시도한다.
 */
function useAccountLocale(user: User | null | undefined) {
  const services = useServices();
  const queryClient = useQueryClient();
  const id = user?.id;
  const locale = user?.locale;
  useEffect(() => {
    if (!id) return;
    if (locale) {
      followAccountLocale(locale);
      return;
    }
    services.account.updateLocale(LOCALE).then(
      (updated) => queryClient.setQueryData(queryKeys.session, updated),
      () => {},
    );
  }, [id, locale, services, queryClient]);
}

/**
 * 로그인한 사용자만 들여보낸다. 온보딩을 마치지 않은 새 계정은 어느 보호 화면으로 들어와도
 * 먼저 `/welcome/` 로 보낸다. 온보딩 화면만 `onboarding` 으로 이 우회를 끈다.
 */
export function SessionGate({
  children,
  onboarding = false,
}: {
  children: (user: User) => ReactNode;
  onboarding?: boolean;
}) {
  const session = useSession();
  const transitionPending = useAuthTransitionPending();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const signedOut = session.isSuccess && session.data === null;
  const needsOnboarding =
    !onboarding && session.data?.onboardingCompleted === false;
  useAccountLocale(session.data);
  useEffect(() => {
    if (!signedOut) return;
    const query = searchParams.toString();
    const returnTo = `${pathname}${query ? `?${query}` : ""}`;
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [signedOut, pathname, searchParams, router]);

  useEffect(() => {
    if (needsOnboarding) router.replace("/welcome/");
  }, [needsOnboarding, router]);

  if (!session.data || transitionPending || needsOnboarding) return null;
  return children(session.data);
}
