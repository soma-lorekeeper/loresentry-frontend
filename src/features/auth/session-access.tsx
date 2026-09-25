"use client";
import { createContext, useContext } from "react";
export const SessionAccessContext = createContext<{
  userId: string | null;
  blocked: boolean;
}>({ userId: null, blocked: false });
export const useSessionAccess = () => useContext(SessionAccessContext);
