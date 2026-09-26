"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_RUNTIME_CONFIG,
  loadRuntimeConfig,
  type RuntimeConfig,
} from "@/config/runtime-config";
import { ToastProvider } from "@/design-system/primitives";
import { createServices } from "@/services/create-services";
import { applyMockParam } from "@/services/mock/control";
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

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  const [config, setConfig] = useState<RuntimeConfig | null>(null);

  useEffect(() => {
    applyMockParam(new URLSearchParams(window.location.search).get("mock"));
    let active = true;
    loadRuntimeConfig().then((loaded) => {
      if (active) setConfig(loaded);
    });
    return () => {
      active = false;
    };
  }, []);

  const services = useMemo(
    () => (config ? createServices(config) : null),
    [config],
  );

  /**
   * `config.json` 을 읽기 전에는 아무것도 그리지 않는다.
   *
   * <p>그 값이 **첫 질의가 어디로 나갈지**를 정한다. 기본값으로 서비스를 먼저 만들면 데이터 출처가
   * mock 으로 굳고, 그 뒤에 설정이 도착해도 이미 만들어진 서비스는 바뀌지 않는다. 그러면 배포
   * 설정이 `api` 든 `?data=api` 든 앱은 끝까지 mock 으로 돈다 — mock 은 씨앗 사용자를 로그인된
   * 것으로 보고하므로 남의 계정으로 로그인된 화면이 된다.
   *
   * <p>본문은 어차피 클라이언트에서만 그려지고(정적 내보내기의 본문은 비어 있다) 이 파일은
   * 같은 출처의 작은 JSON 하나다. 한 번 기다리는 편이 잘못된 출처로 요청을 내보내는 것보다 낫다.
   */
  if (!config || !services) return null;

  return (
    <RuntimeConfigContext.Provider value={config}>
      <QueryClientProvider client={queryClient}>
        <ServicesProvider services={services}>
          <ToastProvider>{children}</ToastProvider>
        </ServicesProvider>
      </QueryClientProvider>
    </RuntimeConfigContext.Provider>
  );
}
