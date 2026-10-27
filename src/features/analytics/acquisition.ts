import { CLICK_ID_TYPES, type Acquisition } from "@/domain/models";

export const LANDING_STORAGE_KEY = "loresentry.landing";
export const ACQUISITION_STORAGE_KEY = "loresentry.acquisition";
export const ACQUISITION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

const MAX_LANDINGS = 5;
const CLICK_ID = /^[A-Za-z0-9_-]{1,255}$/;
const HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*$/;
const INTERNAL_HOST = /(^|\.)loresentry\.com$|^accounts\.google\.com$/;

interface Landing {
  href: string;
  referrer: string;
  at: number;
}

interface Stored {
  acquisition: Acquisition;
  savedAt: number;
}

export function createLandingScript() {
  return `(function(){try{var k=${JSON.stringify(LANDING_STORAGE_KEY)},s=sessionStorage,a;try{a=JSON.parse(s.getItem(k)||"[]")}catch(e){a=[]}if(!Array.isArray(a))a=[];a.push({href:location.href,referrer:document.referrer,at:Date.now()});s.setItem(k,JSON.stringify(a.slice(-${MAX_LANDINGS})))}catch(e){}})();`;
}

function text(value: string | null, limit: number) {
  if (value === null) return null;
  const cleaned = value.replace(/\p{Cc}/gu, "").trim();
  if (!cleaned) return null;
  const cut = cleaned.slice(0, limit);
  return /[\uD800-\uDBFF]$/.test(cut) ? cut.slice(0, -1) : cut;
}

function clickIdOf(params: URLSearchParams) {
  for (const type of CLICK_ID_TYPES) {
    const value = params.get(type);
    if (value && CLICK_ID.test(value)) return { clickId: value, type };
  }
  return null;
}

function referrerHostOf(referrer: string) {
  if (!referrer) return null;
  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (host.length > 253 || !HOST.test(host) || INTERNAL_HOST.test(host))
      return null;
    return host;
  } catch {
    return null;
  }
}

export function acquisitionFrom(landing: Landing): Acquisition | null {
  let url: URL;
  try {
    url = new URL(landing.href);
  } catch {
    return null;
  }
  const params = url.searchParams;
  const click = clickIdOf(params);
  return {
    utmSource: text(params.get("utm_source"), 100),
    utmMedium: text(params.get("utm_medium"), 100),
    utmCampaign: text(params.get("utm_campaign"), 100),
    utmTerm: text(params.get("utm_term"), 200),
    utmContent: text(params.get("utm_content"), 100),
    clickId: click?.clickId ?? null,
    clickIdType: click?.type ?? null,
    referrerHost: referrerHostOf(landing.referrer),
    landingPath: url.pathname.slice(0, 255),
    landedAt: new Date(landing.at).toISOString(),
  };
}

function hasSource(acquisition: Acquisition) {
  return [
    acquisition.utmSource,
    acquisition.utmMedium,
    acquisition.utmCampaign,
    acquisition.utmTerm,
    acquisition.utmContent,
    acquisition.clickId,
    acquisition.referrerHost,
  ].some((value) => value !== null);
}

function isLanding(value: unknown): value is Landing {
  if (!value || typeof value !== "object") return false;
  const landing = value as Partial<Landing>;
  return (
    typeof landing.href === "string" &&
    typeof landing.referrer === "string" &&
    typeof landing.at === "number" &&
    Number.isFinite(landing.at)
  );
}

function readLandings(): Landing[] {
  const raw = window.sessionStorage.getItem(LANDING_STORAGE_KEY);
  window.sessionStorage.removeItem(LANDING_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isLanding) : [];
  } catch {
    return [];
  }
}

function readStored(now: number): Stored | null {
  const raw = window.localStorage.getItem(ACQUISITION_STORAGE_KEY);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<Stored> | null;
    if (
      !parsed ||
      typeof parsed.savedAt !== "number" ||
      !parsed.acquisition ||
      typeof parsed.acquisition !== "object" ||
      now - parsed.savedAt > ACQUISITION_MAX_AGE_MS
    )
      return null;
    return parsed as Stored;
  } catch {
    return null;
  }
}

export function settleLandings(now = Date.now()) {
  try {
    let stored = readStored(now);
    for (const landing of readLandings()) {
      const acquisition = acquisitionFrom(landing);
      if (acquisition && (!stored || hasSource(acquisition)))
        stored = { acquisition, savedAt: landing.at };
    }
    if (stored)
      window.localStorage.setItem(
        ACQUISITION_STORAGE_KEY,
        JSON.stringify(stored),
      );
    else window.localStorage.removeItem(ACQUISITION_STORAGE_KEY);
  } catch {}
}

export function pendingAcquisition(now = Date.now()): Acquisition | null {
  settleLandings(now);
  try {
    return readStored(now)?.acquisition ?? null;
  } catch {
    return null;
  }
}

export function clearAcquisition() {
  try {
    window.localStorage.removeItem(ACQUISITION_STORAGE_KEY);
  } catch {}
}
