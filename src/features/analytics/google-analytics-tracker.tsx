"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import {
  installGoogleAnalytics,
  pageLocation,
  pageReferrer,
} from "./google-analytics";

export function GoogleAnalyticsTracker({
  measurementId,
}: {
  measurementId: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const previous = useRef<string | null>(null);

  useEffect(() => {
    const gtag = installGoogleAnalytics(measurementId);
    const location = pageLocation(window.location.href);
    if (location === previous.current) return;
    const page = {
      page_location: location,
      page_referrer: previous.current ?? pageReferrer(document.referrer),
    };
    gtag("set", page);
    gtag("event", "page_view", page);
    previous.current = location;
  }, [measurementId, pathname, searchParams]);

  return null;
}
