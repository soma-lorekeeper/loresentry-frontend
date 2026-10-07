const KEY = "loresentry.tour.workspace";
const START_EVENT = "loresentry:tour-start";

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
