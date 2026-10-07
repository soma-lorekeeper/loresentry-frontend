export type MessageParams = Record<string, string | number>;

/**
 * 영어 문구 한 항목. 대부분은 문자열이고 `{name}` 자리에 값이 들어간다. 단수·복수처럼 값에 따라
 * 문장이 달라지면 함수로 쓴다.
 */
export type Message = string | ((params: MessageParams) => string);

export type Messages = Record<string, Message>;
