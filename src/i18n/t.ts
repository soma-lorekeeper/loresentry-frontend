import { EN } from "./en";
import { LOCALE } from "./locale";
import type { Message, MessageParams } from "./messages";

export type MessageKey = keyof typeof EN & string;

/**
 * 같은 한국어가 자리마다 다른 영어가 되어야 할 때 열쇠 앞에 `맥락::` 을 붙인다. 한국어판은 `::`
 * 뒤만 쓴다.
 */
const CONTEXT = "::";

function interpolate(text: string, params: MessageParams) {
  return text.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in params ? String(params[name]) : whole,
  );
}

function korean(key: string) {
  const at = key.lastIndexOf(CONTEXT);
  return at < 0 ? key : key.slice(at + CONTEXT.length);
}

/** 지금 빌드의 언어로 문구를 낸다. 한국어판에서는 열쇠(한국어 원문)를 그대로 쓴다. */
export function t(key: MessageKey, params?: MessageParams): string {
  const entry: Message =
    LOCALE === "en"
      ? ((EN as Record<string, Message>)[key] ?? key)
      : korean(key);
  const text = typeof entry === "function" ? entry(params ?? {}) : entry;
  return params ? interpolate(text, params) : text;
}
