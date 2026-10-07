import { Fragment, type ReactNode } from "react";

import type { MessageParams } from "./messages";
import { t, type MessageKey } from "./t";

type Tags = Record<string, (chunks: ReactNode) => ReactNode>;

/**
 * 문장 안에 강조·링크가 섞일 때 쓴다. 번역문에 `<b>…</b>` 처럼 이름 붙인 태그를 두고, 태그마다 그릴
 * 요소를 넘긴다. `<br/>` 은 따로 넘기지 않아도 줄바꿈이 된다. 태그는 겹쳐 쓰지 않는다.
 */
export function tRich(
  key: MessageKey,
  tags: Tags = {},
  params?: MessageParams,
): ReactNode {
  const text = t(key, params);
  const parts: ReactNode[] = [];
  const pattern = /<(\w+)>([\s\S]*?)<\/\1>|<br\s*\/>/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const at = match.index ?? 0;
    if (at > last) parts.push(text.slice(last, at));
    const [whole, name, chunk] = match;
    if (whole.startsWith("<br")) {
      parts.push(<br key={index++} />);
    } else {
      const render = tags[name];
      parts.push(
        <Fragment key={index++}>{render ? render(chunk) : chunk}</Fragment>,
      );
    }
    last = at + whole.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts.length === 1 ? parts[0] : parts;
}
