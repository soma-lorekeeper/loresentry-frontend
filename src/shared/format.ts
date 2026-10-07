// i18n-exempt-file: 날짜·시간 표기는 언어마다 문장 구조가 달라 문구 사전 대신 여기서 언어별로 만든다.
import { INTL_LOCALE, LOCALE } from "@/i18n/locale";

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy.getTime();
}

const monthDay = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
});
const monthDayYear = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function relativeTime(iso: string, now = Date.now()): string {
  const en = LOCALE === "en";
  const time = new Date(iso).getTime();
  const diff = Math.max(0, now - time);
  if (diff < MINUTE) return en ? "Just now" : "방금";
  if (diff < HOUR) {
    const minutes = Math.floor(diff / MINUTE);
    return en ? `${minutes} min ago` : `${minutes}분 전`;
  }
  const today = startOfDay(new Date(now));
  if (time >= today) {
    const hours = Math.floor(diff / HOUR);
    return en ? `${hours} hr ago` : `${hours}시간 전`;
  }
  if (time >= today - 24 * HOUR) return en ? "Yesterday" : "어제";
  const days = Math.round((today - startOfDay(new Date(time))) / (24 * HOUR));
  if (days < 7) return en ? `${days} days ago` : `${days}일 전`;
  const date = new Date(time);
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  if (en) return (sameYear ? monthDay : monthDayYear).format(date);
  return sameYear
    ? `${date.getMonth() + 1}월 ${date.getDate()}일`
    : `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`;
}

export function dottedDate(iso: string): string {
  const date = new Date(iso);
  if (LOCALE === "en") return monthDayYear.format(date);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()}.`;
}

export function clockTime(iso: string): string {
  const date = new Date(iso);
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function versionTimeLabel(iso: string, now = Date.now()): string {
  const en = LOCALE === "en";
  const time = new Date(iso).getTime();
  const today = startOfDay(new Date(now));
  if (time >= today) return `${en ? "Today" : "오늘"} ${clockTime(iso)}`;
  if (time >= today - 24 * HOUR)
    return `${en ? "Yesterday" : "어제"} ${clockTime(iso)}`;
  const date = new Date(time);
  if (en) return `${monthDay.format(date)} ${clockTime(iso)}`;
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
  return value.toLocaleString(INTL_LOCALE[LOCALE]);
}
