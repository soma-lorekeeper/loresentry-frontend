"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Services } from "./ports";

const ServicesContext = createContext<Services | null>(null);

export function ServicesProvider({
  services,
  children,
}: {
  services: Services;
  children: ReactNode;
}) {
  return (
    <ServicesContext.Provider value={services}>
      {children}
    </ServicesContext.Provider>
  );
}

export function useServices(): Services {
  const services = useContext(ServicesContext);
  if (!services) throw new Error("ServicesProvider가 필요합니다.");
  return services;
}
