export interface AccountProfile {
  email: string;
  name: string;
}

export const defaultAccountProfile: AccountProfile = {
  email: "seungju@lore.kr",
  name: "이승주",
};

export const longAccountProfile: AccountProfile = {
  email: "seungju.with.an.extraordinarily.long.google.account@example.com",
  name: "아주 긴 이름을 사용하는 로어키퍼 창작자 이승주",
};

export function validateAccountName(value: string) {
  return value.trim() ? undefined : "이름을 입력해 주세요.";
}
