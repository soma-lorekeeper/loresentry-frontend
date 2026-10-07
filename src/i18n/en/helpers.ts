import type { MessageParams } from "../messages";

/** `count` 에 따라 단수·복수를 고른다. `{count}` 는 그대로 두면 t() 가 채운다. */
export function plural(one: string, other: string) {
  return (params: MessageParams) => (Number(params.count) === 1 ? one : other);
}
