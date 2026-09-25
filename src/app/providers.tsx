"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
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
  const services = useMemo(
    () => (config ? createServices(config) : null),
    [config],
  );

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
