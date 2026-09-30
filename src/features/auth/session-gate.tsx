"use client";

import { useQuery } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useSyncExternalStore, type ReactNode } from "react";

import {
  authTransitionPending,
  subscribeAuthTransition,
} from "@/services/api/auth-transition";
import type { User } from "@/domain/models";
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
