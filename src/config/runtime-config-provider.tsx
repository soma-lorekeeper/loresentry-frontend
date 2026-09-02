"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import { loadRuntimeConfig, type RuntimeConfig } from "./runtime-config";

type RuntimeConfigState =
  | { config: null; error: null; status: "loading" }
  | { config: null; error: Error; status: "error" }
  | { config: RuntimeConfig; error: null; status: "ready" };

const RuntimeConfigContext = createContext<RuntimeConfigState | null>(null);

export function RuntimeConfigProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<RuntimeConfigState>({
    config: null,
    error: null,
    status: "loading",
  });

  useEffect(() => {
    let active = true;

    loadRuntimeConfig().then(
      (config) => {
        if (active) setState({ config, error: null, status: "ready" });
      },
      (error: unknown) => {
        if (!active) return;
        setState({
          config: null,
          error: error instanceof Error ? error : new Error(String(error)),
          status: "error",
        });
      },
    );

    return () => {
      active = false;
    };
  }, []);

  return (
    <RuntimeConfigContext.Provider value={state}>
      {children}
    </RuntimeConfigContext.Provider>
  );
}

export function useRuntimeConfig(): RuntimeConfigState {
  const state = useContext(RuntimeConfigContext);
  if (!state) {
    throw new Error(
      "useRuntimeConfig는 RuntimeConfigProvider 안에서 사용해야 합니다.",
    );
  }

  return state;
}
