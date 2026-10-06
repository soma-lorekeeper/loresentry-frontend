"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";

import { installGoogleAnalytics, pageLocation } from "./google-analytics";

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
    gtag("set", {
      page_location: location,
      ...(previous.current ? { page_referrer: previous.current } : {}),
    });
    gtag("event", "page_view");
    previous.current = location;
  }, [measurementId, pathname, searchParams]);

  return null;
}
