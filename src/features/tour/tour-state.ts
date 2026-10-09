const KEY = "loresentry.tour.workspace";
const START_EVENT = "loresentry:tour-start";
const END_EVENT = "loresentry:tour-end";

export type TourState = "pending" | "done";

export function readTour(): TourState | null {
  try {
    const value = window.localStorage.getItem(KEY);
    return value === "pending" || value === "done" ? value : null;
  } catch {
    return null;
  }
}

export function writeTour(state: TourState) {
  try {
    window.localStorage.setItem(KEY, state);
  } catch {}
}

export function requestTour() {
  window.dispatchEvent(new Event(START_EVENT));
}

export function onTourRequest(handler: () => void) {
  window.addEventListener(START_EVENT, handler);
  return () => window.removeEventListener(START_EVENT, handler);
}

export function announceTourEnd() {
  window.dispatchEvent(new Event(END_EVENT));
}

export function onTourEnd(handler: () => void) {
  window.addEventListener(END_EVENT, handler);
  return () => window.removeEventListener(END_EVENT, handler);
}
