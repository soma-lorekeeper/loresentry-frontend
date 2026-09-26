import { ServiceError, type ServiceErrorCode } from "../errors";

/**
 * 서버 오류 본문은 `{ code, message, next_action }` 이고, 충돌만 `current`·`base` 를 더 싣는다.
 * `code` 가 계약이고 `message` 는 진단용 영어라 화면에 띄우지 않는다 — 사용자 문구는 여기서 고른다.
 */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  next_action?: string;
  upstream?: string;
  current?: unknown;
  base?: unknown;
}

/**
 * 서버 코드를 화면이 분기하는 `ServiceErrorCode` 로 옮긴다. 새 코드가 생기면 이 표에 한 줄 더한다.
 * 표에 없는 코드는 `unknown` 이 되어, 화면은 "알 수 없는 오류"로 안전하게 떨어진다.
 */
const CODE_TO_SERVICE_ERROR: Record<string, ServiceErrorCode> = {
  INVALID_REQUEST: "validation",
  INVALID_PROJECT_NAME: "validation",
  INVALID_PROJECT_DESCRIPTION: "validation",
  INVALID_FILE_TITLE: "validation",
  INVALID_FILE_LOCATION: "validation",
  INVALID_RELATION_TARGET: "validation",
  PROJECT_NOT_TRASHED: "validation",
  FILE_NOT_TRASHED: "validation",
  PROJECT_NAME_TAKEN: "duplicate",
  FILE_TITLE_TAKEN: "duplicate",
  PROJECT_NOT_FOUND: "not-found",
  FILE_NOT_FOUND: "not-found",
  VERSION_NOT_FOUND: "not-found",
  NOT_FOUND: "not-found",
  DOCUMENT_LOCKED: "locked",
  MEMO_NOT_FOUND: "not-found",
  INVALID_MEMO: "validation",
  IMAGE_NOT_FOUND: "not-found",
  INVALID_UPLOAD_REQUEST: "validation",
  OBJECT_NOT_UPLOADED: "validation",
  USER_CONTEXT_REQUIRED: "network",
  UPSTREAM_UNAVAILABLE: "network",
  // BFF 가 Content 에 닿지 못했거나 알 수 없는 응답을 받았다. 둘 다 재시도로 다룬다.
  CONTENT_UNAVAILABLE: "network",
  UPSTREAM_INVALID_RESPONSE: "unknown",
  // 인증·세션. 재발급이 필요한 것과 재로그인이 필요한 것을 구분한다 —
  // 모든 401 을 재발급 조건으로 삼으면 끝없이 재발급을 시도한다.
  ACCESS_TOKEN_MISSING: "unauthenticated",
  ACCESS_TOKEN_EXPIRED: "unauthenticated",
  ACCESS_TOKEN_INVALID: "unauthenticated",
  SESSION_INVALID: "unauthenticated",
  SESSION_UNAVAILABLE: "network",
  INTERNAL_ERROR: "unknown",
};

/** 명시적 재발급을 시도해도 되는 코드. 그 밖의 401 은 재로그인이다. */
const REFRESHABLE = new Set(["ACCESS_TOKEN_MISSING", "ACCESS_TOKEN_EXPIRED"]);

export function isRefreshable(code: string | undefined): boolean {
  return code !== undefined && REFRESHABLE.has(code);
}

const MESSAGES: Partial<Record<ServiceErrorCode, string>> = {
  validation: "입력을 다시 확인해 주세요.",
  duplicate: "같은 이름이 이미 있어요.",
  "not-found": "찾을 수 없어요.",
  locked: "잠긴 문서는 편집할 수 없어요.",
  busy: "처리 중이에요. 잠시 뒤 다시 시도해 주세요.",
  network: "서버에 연결할 수 없어요.",
  unavailable: "이 기능은 아직 준비되지 않았어요.",
  unauthenticated: "다시 로그인해 주세요.",
  unknown: "알 수 없는 오류가 발생했어요.",
};

const CODE_MESSAGES: Record<string, string> = {
  PROJECT_NAME_TAKEN: "같은 이름의 프로젝트가 이미 있어요.",
  FILE_TITLE_TAKEN: "같은 위치에 같은 이름이 이미 있어요.",
  INVALID_PROJECT_NAME: "프로젝트 제목을 확인해 주세요.",
  INVALID_PROJECT_DESCRIPTION: "설명이 너무 길어요.",
  INVALID_FILE_TITLE: "이름을 확인해 주세요.",
  INVALID_FILE_LOCATION: "그 위치에는 둘 수 없어요.",
  INVALID_RELATION_TARGET: "연결할 수 없는 문서예요.",
  PROJECT_NOT_TRASHED: "휴지통으로 옮긴 뒤에 삭제할 수 있어요.",
  FILE_NOT_TRASHED: "휴지통으로 옮긴 뒤에 삭제할 수 있어요.",
  DOCUMENT_LOCKED: "잠긴 문서는 편집할 수 없어요.",
  USER_CONTEXT_REQUIRED: "로그인이 필요해요.",
  INVALID_MEMO: "메모를 확인해 주세요.",
  MEMO_NOT_FOUND: "메모를 찾을 수 없어요.",
  IMAGE_NOT_FOUND: "이미지를 찾을 수 없어요.",
  INVALID_UPLOAD_REQUEST: "올릴 수 없는 파일이에요.",
  OBJECT_NOT_UPLOADED: "업로드가 끝나지 않았어요. 다시 시도해 주세요.",
  CONTENT_UNAVAILABLE: "잠시 뒤 다시 시도해 주세요.",
  SESSION_INVALID: "세션이 만료됐어요. 다시 로그인해 주세요.",
  SESSION_UNAVAILABLE: "잠시 뒤 다시 시도해 주세요.",
};

export function toServiceError(
  body: ApiErrorBody | null,
  status: number,
  operation?: string,
): ServiceError {
  const code = body?.code;
  const mapped: ServiceErrorCode =
    (code ? CODE_TO_SERVICE_ERROR[code] : undefined) ?? fallbackFor(status);
  const message =
    (code ? CODE_MESSAGES[code] : undefined) ??
    MESSAGES[mapped] ??
    "알 수 없는 오류가 발생했어요.";
  return new ServiceError(mapped, message, operation);
}

/** 표에 없는 코드이거나 본문이 오지 않은 경우, 상태 코드만으로 판단한다. */
function fallbackFor(status: number): ServiceErrorCode {
  if (status === 404) return "not-found";
  if (status === 409) return "duplicate";
  if (status === 400) return "validation";
  if (status === 401 || status === 403) return "unauthenticated";
  if (status >= 500) return "unknown";
  return "unknown";
}
