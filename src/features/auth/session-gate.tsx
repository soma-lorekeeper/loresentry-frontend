"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRuntimeConfig } from "@/app/providers";
import { Button, StatusNotice } from "@/design-system/primitives";
import type { User } from "@/domain/models";
import { authCoordinator } from "@/services/api/auth-coordinator";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import {
  downloadDrafts,
  unsavedDrafts,
} from "@/features/documents/draft-recovery";
import { SessionAccessContext } from "./session-access";
import styles from "./session-gate.module.css";

function useAuthState() {
  const config = useRuntimeConfig();
  const value = useSyncExternalStore(
    authCoordinator.subscribe,
    () => {
      const state = authCoordinator.state();
      return `${state.generation}:${state.phase}`;
    },
    () => "initial:active",
  );
  if (config.dataSource !== "api")
    return { generation: "mock", phase: "active" };
  const [generation, phase] = value.split(":");
  return { generation, phase };
}

export function useSession() {
  const services = useServices();
  const state = useAuthState();
  return useQuery({
    queryKey: [...queryKeys.session, state.generation],
    queryFn: () => services.auth.getSession(),
    enabled: state.phase === "active",
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
}

export function SessionGate({
  children,
}: {
  children: (user: User) => ReactNode;
}) {
  const session = useSession();
  const state = useAuthState();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [knownUser, setKnownUser] = useState<User | null>(null);
  if (session.data && !knownUser) setKnownUser(session.data);
  const signedOut =
    (session.isSuccess && session.data === null) ||
    ["required", "signed-out"].includes(state.phase);
  const changing = state.phase === "transition" || state.phase === "login";
  const differentAccount =
    !!knownUser && !!session.data && knownUser.id !== session.data.id;
  const blocked =
    state.phase !== "active" ||
    session.isError ||
    !session.data ||
    differentAccount;
  const returnTo = `${pathname}${searchParams.toString() ? `?${searchParams}` : ""}`;

  useEffect(() => {
    if (signedOut && !knownUser)
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
  }, [signedOut, knownUser, returnTo, router]);
  useEffect(() => {
    if (state.phase !== "active") void queryClient.cancelQueries();
  }, [state.phase, state.generation, queryClient]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (unsavedDrafts().length) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, []);

  if (!knownUser)
    return session.isError ? (
      <StatusNotice tone="error">
        로그인 상태를 확인할 수 없어요.{" "}
        <Button onClick={() => session.refetch()}>다시 확인</Button>
      </StatusNotice>
    ) : changing ? (
      <StatusNotice tone="info">
        다른 탭에서 로그인 처리가 진행 중이에요.
      </StatusNotice>
    ) : null;

  const user = !differentAccount && session.data ? session.data : knownUser;
  return (
    <SessionAccessContext.Provider value={{ userId: knownUser.id, blocked }}>
      <div inert={blocked}>{children(user)}</div>
      {blocked && (
        <div className={styles.backdrop}>
          <section
            className={styles.notice}
            role="dialog"
            aria-modal="true"
            aria-labelledby="session-notice-title"
          >
            <h2 id="session-notice-title">
              {differentAccount
                ? "다른 계정으로 로그인했어요"
                : changing
                  ? "로그인 상태를 전환하고 있어요"
                  : signedOut
                    ? "다시 로그인해 주세요"
                    : "로그인 상태를 확인할 수 없어요"}
            </h2>
            <p>
              작성 중인 내용은 이 화면에 유지합니다. 저장되지 않은 내용은
              내려받아 보관할 수 있어요.
            </p>
            {differentAccount && (
              <p>
                기존 작업을 계속하려면 원래 계정으로 로그인해 주세요. 다른
                계정으로 저장하지 않습니다.
              </p>
            )}
            {changing && (
              <p>
                로그인 창을 마친 뒤 이 탭으로 돌아오세요. 응답을 기다리는 탭이
                멈췄다면 재개하거나 닫아 주세요.
              </p>
            )}
            <Button onClick={downloadDrafts}>미저장 내용 내려받기</Button>
            {!changing && (
              <Button
                onClick={() =>
                  window.open(
                    `/login?data=api&returnTo=${encodeURIComponent(returnTo)}`,
                    "_blank",
                    "noopener",
                  )
                }
              >
                새 탭에서 로그인
              </Button>
            )}
            {state.phase === "active" && !differentAccount && (
              <Button onClick={() => session.refetch()}>상태 다시 확인</Button>
            )}
          </section>
        </div>
      )}
    </SessionAccessContext.Provider>
  );
}
