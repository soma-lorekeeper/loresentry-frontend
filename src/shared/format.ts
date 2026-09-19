const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

export function relativeTime(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return "방금";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}분 전`;
  const today = startOfDay(new Date(now));
  if (time >= today) return `${Math.floor(diff / HOUR)}시간 전`;
  if (time >= today - 24 * HOUR) return "어제";
  const days = Math.round((today - startOfDay(new Date(time))) / (24 * HOUR));
  if (days < 7) return `${days}일 전`;
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return sameYear
    ? `${date.getMonth() + 1}월 ${date.getDate()}일`
    : `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function dottedDate(iso: string): string {
  const date = new Date(iso);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

export function clockTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function versionTimeLabel(iso: string, now = Date.now()): string {
  const time = new Date(iso).getTime();
  const today = startOfDay(new Date(now));
  if (time >= today) return `오늘 ${clockTime(iso)}`;
  if (time >= today - 24 * HOUR) return `어제 ${clockTime(iso)}`;
  const date = new Date(time);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${clockTime(iso)}`;
}

export function initialsOf(name: string): string {
  const trimmed = name.replace(/\s+/g, "");
  if (!trimmed) return "?";
  if (/^[가-힣]+$/.test(trimmed)) return trimmed.slice(-2);
  return trimmed.slice(0, 2).toUpperCase();
}

export function countCharacters(text: string) {
  return {
    withSpaces: text.replace(/\n/g, "").length,
    withoutSpaces: text.replace(/\s/g, "").length,
  };
}

export function formatNumber(value: number) {
  return value.toLocaleString("ko-KR");
}
