import { t } from "@/i18n";

import { ServiceError, type ServiceErrorCode } from "../errors";

/**
 * 서버 오류 본문은 `{ code, message, next_action }` 이고, 충돌만 `current`·`base` 를 더 싣는다.
 * `code` 가 계약이고 `message` 는 진단용 영어라 화면에 띄우지 않는다 — 사용자 문구는 여기서 고른다.
 *
 * <p>그래프 최신화 확정이 거절되면 그 까닭이 함께 온다: 맞추지 않은 작업본(`drafts`), 작업본을 뜬
 * 뒤 바뀐 문서(`documents`), 그대로 쓸 수 없는 이유(`problems`).
 */
export interface ApiErrorBody {
  code?: string;
  message?: string;
  next_action?: string;
  upstream?: string;
  current?: unknown;
  base?: unknown;
  drafts?: string[];
  documents?: { draft_id: string; file_id: string }[];
  problems?: Record<string, string>[];
}

/**
 * 서버 코드를 화면이 분기하는 `ServiceErrorCode` 로 옮긴다. 새 코드가 생기면 이 표에 한 줄 더한다.
 * 표에 없는 코드는 `unknown` 이 되어, 화면은 "알 수 없는 오류"로 안전하게 떨어진다.
 */
const CODE_TO_SERVICE_ERROR: Record<string, ServiceErrorCode> = {
  INVALID_REQUEST: "validation",
  CONSENT_REQUEST_INVALID: "consent-invalid",
  TERMS_VERSION_MISMATCH: "terms-version-mismatch",
  CSRF_REJECTED: "csrf-rejected",
  ACCOUNT_CONFIRMATION_MISMATCH: "confirmation-mismatch",
  ACCOUNT_DELETION_UNAVAILABLE: "network",
  ACCOUNT_UNAVAILABLE: "network",
  USER_NOT_FOUND: "not-found",
  LOGIN_UNAVAILABLE: "network",
  INVALID_PROJECT_NAME: "validation",
  INVALID_PROJECT_DESCRIPTION: "validation",
  INVALID_FILE_TITLE: "validation",
  INVALID_FILE_LOCATION: "validation",
  INVALID_RELATION_TARGET: "validation",
  PROJECT_NOT_TRASHED: "validation",
  FILE_NOT_TRASHED: "validation",
  PROJECT_NAME_TAKEN: "duplicate",
  INVALID_FEEDBACK: "validation",
  FEEDBACK_RATE_LIMITED: "busy",
  FILE_TITLE_TAKEN: "duplicate",
  PROJECT_NOT_FOUND: "not-found",
  FILE_NOT_FOUND: "not-found",
  VERSION_NOT_FOUND: "not-found",
  NOT_FOUND: "not-found",
  DOCUMENT_LOCKED: "locked",
  DOCUMENT_REFRESH_LOCKED: "refresh-locked",
  // 그래프 최신화. 결과를 기다리거나 검토를 기다리는 run 이 있으면 새로 시작할 수 없다.
  REFRESH_IN_PROGRESS: "busy",
  REFRESH_REVIEW_PENDING: "busy",
  REFRESH_UNAVAILABLE: "network",
  REFRESH_NOT_FOUND: "not-found",
  // 검토가 이미 끝났거나(확정·실패) 작업본이 없다. 화면은 상태를 다시 읽는다.
  REFRESH_DRAFT_NOT_FOUND: "not-found",
  REFRESH_NOT_READY: "not-found",
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
  // 인증. BFF 는 단일 세션 ID 쿠키를 쓰고, 보호 요청이 성공할 때마다 수명을 연장한다
  // (`loresentry-gateway/docs/auth/SESSION_FLOW.md`). 그래서 프론트가 할 재발급이 없다.
  SESSION_REQUIRED: "unauthenticated",
  SESSION_INVALID: "unauthenticated",
  // 저장소 장애·시간 초과다. 세션이 끝난 것이 아니므로 로그아웃시키지 않는다.
  SESSION_UNAVAILABLE: "network",
  INVALID_SESSION_ID: "unauthenticated",
  REVOCATION_UNCONFIRMED: "network",
  INTERNAL_ERROR: "unknown",
  CHAT_NOT_ENABLED: "unavailable",
  AI_CHAT_UNAVAILABLE: "network",
  CHAT_SESSION_NOT_FOUND: "not-found",
  CHAT_TITLE_REQUIRED: "validation",
  CHAT_QUESTION_REQUIRED: "validation",
  CHAT_NOT_LAST_QUESTION: "validation",
  CHAT_ANSWER_IN_PROGRESS: "busy",
  CHAT_ANOTHER_ANSWER_IN_PROGRESS: "busy",
  CHAT_CONTEXT_TOO_LARGE: "validation",
  CHAT_DAILY_LIMIT_REACHED: "busy",
  CHAT_MODEL_UNAVAILABLE: "network",
  SETTING_CHECK_NOT_FOUND: "not-found",
  SETTING_CHECK_FINDING_NOT_FOUND: "not-found",
  SETTING_CHECK_DOCUMENT_NOT_FOUND: "not-found",
  SETTING_CHECK_IN_PROGRESS: "busy",
};

const MESSAGES: Partial<Record<ServiceErrorCode, string>> = {
  validation: t("입력을 다시 확인해 주세요."),
  "consent-invalid": t("동의 대기가 만료됐어요. 다시 로그인해 주세요."),
  "terms-version-mismatch": t("약관이 변경됐어요. 새 약관을 확인해 주세요."),
  "csrf-rejected": t("요청을 확인할 수 없어요. 로그인부터 다시 시작해 주세요."),
  "confirmation-mismatch": t("입력한 이메일이 계정 이메일과 달라요."),
  duplicate: t("같은 이름이 이미 있어요."),
  "not-found": t("찾을 수 없어요."),
  locked: t("잠긴 문서는 편집할 수 없어요."),
  "refresh-locked": t("설정 문서 최신화 결과를 확정해야 잠금이 풀려요."),
  busy: t("처리 중이에요. 잠시 뒤 다시 시도해 주세요."),
  network: t("서버에 연결할 수 없어요."),
  unavailable: t("이 기능은 아직 준비되지 않았어요."),
  unauthenticated: t("다시 로그인해 주세요."),
  unknown: t("알 수 없는 오류가 발생했어요."),
};

const CODE_MESSAGES: Record<string, string> = {
  CHAT_DAILY_LIMIT_REACHED: t("오늘 AI 챗 사용량을 다 썼어요."),
  INVALID_FEEDBACK: t("내용을 1~2,000자로 적어 주세요."),
  FEEDBACK_RATE_LIMITED: t(
    "짧은 시간에 많이 보냈어요. 잠시 뒤에 다시 보내 주세요.",
  ),
  PROJECT_NAME_TAKEN: t("같은 이름의 프로젝트가 이미 있어요."),
  ACCOUNT_DELETION_UNAVAILABLE: t(
    "계정을 삭제하지 못했어요. 계정과 작업은 그대로 있어요. 잠시 뒤 다시 시도해 주세요.",
  ),
  FILE_TITLE_TAKEN: t("같은 위치에 같은 이름이 이미 있어요."),
  INVALID_PROJECT_NAME: t("프로젝트 제목을 확인해 주세요."),
  INVALID_PROJECT_DESCRIPTION: t("설명이 너무 길어요."),
  INVALID_FILE_TITLE: t("이름을 확인해 주세요."),
  INVALID_FILE_LOCATION: t("그 위치에는 둘 수 없어요."),
  INVALID_RELATION_TARGET: t("연결할 수 없는 문서예요."),
  PROJECT_NOT_TRASHED: t("휴지통으로 옮긴 뒤에 삭제할 수 있어요."),
  FILE_NOT_TRASHED: t("휴지통으로 옮긴 뒤에 삭제할 수 있어요."),
  DOCUMENT_LOCKED: t("잠긴 문서는 편집할 수 없어요."),
  REFRESH_IN_PROGRESS: t("이미 설정 문서 최신화를 진행하고 있어요."),
  REFRESH_REVIEW_PENDING: t("검토를 기다리는 최신화 결과가 있어요."),
  REFRESH_UNAVAILABLE: t("잠시 뒤 다시 시도해 주세요."),
  REFRESH_NOT_READY: t("이미 끝난 최신화예요."),
  REFRESH_DRAFT_NOT_FOUND: t("이미 끝난 최신화예요."),
  USER_CONTEXT_REQUIRED: t("로그인이 필요해요."),
  INVALID_MEMO: t("메모를 확인해 주세요."),
  MEMO_NOT_FOUND: t("메모를 찾을 수 없어요."),
  IMAGE_NOT_FOUND: t("이미지를 찾을 수 없어요."),
  INVALID_UPLOAD_REQUEST: t("올릴 수 없는 파일이에요."),
  OBJECT_NOT_UPLOADED: t("업로드가 끝나지 않았어요. 다시 시도해 주세요."),
  CONTENT_UNAVAILABLE: t("잠시 뒤 다시 시도해 주세요."),
  SESSION_INVALID: t("세션이 만료됐어요. 다시 로그인해 주세요."),
  SESSION_UNAVAILABLE: t("잠시 뒤 다시 시도해 주세요."),
  CHAT_SESSION_NOT_FOUND: t("대화를 찾을 수 없어요."),
  CHAT_TITLE_REQUIRED: t("대화 이름을 입력해 주세요."),
  CHAT_QUESTION_REQUIRED: t("질문을 입력해 주세요."),
  CHAT_NOT_LAST_QUESTION: t("마지막 질문만 고칠 수 있어요."),
  CHAT_ANOTHER_ANSWER_IN_PROGRESS: t(
    "다른 대화에서 답을 쓰는 중이에요. 끝난 뒤에 다시 보내 주세요.",
  ),
  CHAT_ANSWER_IN_PROGRESS: t(
    "이 대화에서 답을 쓰는 중이에요. 끝난 뒤에 다시 보내 주세요.",
  ),
  CHAT_CONTEXT_TOO_LARGE: t("작품이 커서 AI 챗을 열 수 없어요"),
  CHAT_MODEL_UNAVAILABLE: t(
    "AI가 지금 답할 수 없어요. 잠시 뒤 다시 물어봐 주세요.",
  ),
  AI_CHAT_UNAVAILABLE: t("AI 챗 서버에 연결할 수 없어요."),
  SETTING_CHECK_NOT_FOUND: t("점검 기록을 찾을 수 없어요."),
  SETTING_CHECK_FINDING_NOT_FOUND: t(
    "이 설정 충돌을 찾을 수 없어요. 다시 불러와 주세요.",
  ),
  SETTING_CHECK_DOCUMENT_NOT_FOUND: t("점검할 원고를 찾을 수 없어요."),
  SETTING_CHECK_IN_PROGRESS: t(
    "다른 회차를 점검하고 있어요. 끝난 뒤에 다시 시도해 주세요.",
  ),
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
    t("알 수 없는 오류가 발생했어요.");
  return new ServiceError(
    mapped,
    message,
    operation,
    mapped === "unauthenticated" &&
      (status === 401 || body?.next_action === "RELOGIN"),
  );
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
