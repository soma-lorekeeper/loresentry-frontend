"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Suspense,
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_RUNTIME_CONFIG,
  PRERENDER_CONFIG,
  loadRuntimeConfig,
  type RuntimeConfig,
} from "@/config/runtime-config";
import { ToastProvider } from "@/design-system/primitives";
import { analyticsEnabled } from "@/features/analytics/google-analytics";
import { GoogleAnalyticsTracker } from "@/features/analytics/google-analytics-tracker";
import { FeedbackProvider } from "@/features/feedback/feedback-provider";
import { createServices } from "@/services/create-services";
import { deferServices } from "@/services/deferred-services";
import { createMockServices } from "@/services/mock";
import { applyMockParam } from "@/services/mock/control";
import { subscribeAuthTransition } from "@/services/api/auth-transition";
import { ServicesProvider } from "@/services/services-context";

const RuntimeConfigContext = createContext<RuntimeConfig>(
  DEFAULT_RUNTIME_CONFIG,
);

export function useRuntimeConfig() {
  return useContext(RuntimeConfigContext);
}

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, staleTime: 30_000, refetchOnWindowFocus: false },
      mutations: { retry: false },
    },
  });
}

/**
 * 화면은 `config.json` 을 기다리지 않고 바로 그린다. 기다리는 것은 서비스 호출이다.
 *
 * <p><b>지키는 것.</b> `config.json` 이 **첫 요청이 어디로 나갈지**를 정한다. 기본값으로 서비스를
 * 먼저 만들면 데이터 출처가 mock 으로 굳고, 그 뒤에 설정이 도착해도 이미 만들어진 서비스는 바뀌지
 * 않는다. 그러면 배포 설정이 `api` 든 `?data=api` 든 앱은 끝까지 mock 으로 돌고, mock 에 남아
 * 있던 로그인으로 남의 계정처럼 보이는 화면이 된다. 실제로 그렇게 배포됐던 적이 있다.
 * 그래서 서비스는 읽어 온 설정으로 **한 번만** 만들고, 그 전의 호출은 붙잡아 둔다
 * (services/deferred-services.ts).
 *
 * <p><b>왜 화면을 막지 않는가.</b> 예전에는 설정이 올 때까지 아무것도 그리지 않았다. 그러면 빌드 때
 * 만드는 HTML 의 본문이 비어, 스크립트를 실행하지 않는 검색 로봇에게 읽을 글이 없다. 랜딩과 약관은
 * 누가 봐도 같은 내용이라 빌드 때 그릴 수 있다.
 *
 * <p><b>구조는 설정 전후로 같아야 한다.</b> 바뀌는 것은 context 의 값뿐이다. provider 를 넣었다
 * 뺐다 하면 그 아래 화면이 처음부터 다시 만들어져, 랜딩의 등장 동작과 입력하던 값이 사라진다.
 * 빌드 때 그린 HTML 과 브라우저의 첫 그림도 같은 모양이어야 한다.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  // 읽어 온 설정. 오기 전에는 null 이고, 그동안 화면은 PRERENDER_CONFIG 로 그린다.
  const [loaded, setLoaded] = useState<RuntimeConfig | null>(null);
  // 화면에 건네는 서비스. mock 에서는 포트와 함수의 이름만 빌리고, 호출은 아래 settle 이 넘긴
  // 서비스로만 간다.
  const [deferred] = useState(() => deferServices(createMockServices()));
  useEffect(
    () =>
      subscribeAuthTransition(() => {
        queryClient.clear();
      }),
    [queryClient],
  );

  useEffect(() => {
    applyMockParam(new URLSearchParams(window.location.search).get("mock"));
    let active = true;
    loadRuntimeConfig().then((config) => {
      if (!active) return;
      // 붙잡아 둔 호출이 여기서 풀려, 읽어 온 설정의 출처로 나간다.
      deferred.settle(createServices(config));
      setLoaded(config);
    });
    return () => {
      active = false;
    };
  }, [deferred]);

  return (
    <RuntimeConfigContext.Provider value={loaded ?? PRERENDER_CONFIG}>
      {/* 측정은 읽어 온 설정이 켜라고 할 때만 한다. 자리는 늘 여기라 아래 화면이 다시 만들어지지
          않고, 설정이 없는 동안(빌드 때 포함)에는 window 를 읽지 않는다. */}
      {loaded && analyticsEnabled(loaded, window.location.hostname) && (
        <Suspense fallback={null}>
          <GoogleAnalyticsTracker measurementId={loaded.gaMeasurementId} />
        </Suspense>
      )}
      <QueryClientProvider client={queryClient}>
        <ServicesProvider services={deferred.services}>
          <ToastProvider>
            <FeedbackProvider>{children}</FeedbackProvider>
          </ToastProvider>
        </ServicesProvider>
      </QueryClientProvider>
    </RuntimeConfigContext.Provider>
  );
}
