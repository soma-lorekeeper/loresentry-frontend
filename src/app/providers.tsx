"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
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
  const [config, setConfig] = useState(DEFAULT_RUNTIME_CONFIG);
  const [services] = useState(() => createServices(DEFAULT_RUNTIME_CONFIG));

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
