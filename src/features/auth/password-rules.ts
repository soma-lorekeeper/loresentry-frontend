import { t } from "@/i18n";

export const LOGIN_ID_MAX = 32;
export const PASSWORD_MAX = 72;
export const DISPLAY_NAME_MAX = 50;

const LOGIN_ID = /^[a-z0-9][a-z0-9._-]{2,31}$/;

export function normalizeLoginId(value: string) {
  return value.trim().toLowerCase();
}

export function loginIdError(value: string): string | null {
  const id = normalizeLoginId(value);
  if (!id) return t("아이디를 입력해 주세요.");
  if (!LOGIN_ID.test(id))
    return t("아이디는 영문 소문자·숫자·._- 3~32자로 입력해 주세요.");
  return null;
}

export function passwordError(value: string): string | null {
  if (!value) return t("비밀번호를 입력해 주세요.");
  if (
    /\s/.test(value) ||
    [...value].length < 8 ||
    new TextEncoder().encode(value).length > PASSWORD_MAX
  )
    return t("비밀번호는 공백 없이 8~72자로 입력해 주세요.");
  return null;
}

export function displayNameError(value: string): string | null {
  if ([...value.trim()].length > DISPLAY_NAME_MAX)
    return t("이름은 50자까지 쓸 수 있어요.");
  return null;
}
