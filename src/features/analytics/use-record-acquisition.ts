"use client";

import { useEffect, useRef } from "react";

import { useServices } from "@/services/services-context";

import { clearAcquisition, pendingAcquisition } from "./acquisition";

export function useRecordAcquisition(enabled: boolean) {
  const services = useServices();
  const sent = useRef(false);
  useEffect(() => {
    if (!enabled || sent.current) return;
    sent.current = true;
    services.account
      .recordAcquisition(pendingAcquisition())
      .then(clearAcquisition, () => {});
  }, [enabled, services]);
}
