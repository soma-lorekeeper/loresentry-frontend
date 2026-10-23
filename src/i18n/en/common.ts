import type { Messages } from "../messages";

/**
 * 여러 화면이 함께 쓰는 짧은 말과 앱 전체의 메타 정보. 영역 파일에 같은 열쇠를 다시 두지 않는다.
 */
export default {
  "원고와 설정을 하나의 흐름으로 연결하는 집필 작업공간":
    "A writing workspace that keeps your manuscript and your world in one flow",
  "Lore Sentry · 웹소설 작가를 위한 집필 에디터와 AI 에이전트":
    "Lore Sentry · A writing editor and AI agent for web novelists",
  "웹소설 작가를 위한 집필 에디터이자 AI 에이전트예요. 회차를 쓰면 설정 문서에 바뀔 점을 AI가 찾아 두고, 반영은 작가가 골라요.":
    "A writing editor and AI agent for web novelists. When you write a new chapter, AI finds what should change in your setting documents, and you choose what to apply.",
  // 검색엔진에 알리는 소프트웨어 분류(app/page.tsx 의 구조화 데이터). 화면에는 나오지 않는다.
  "글쓰기 도구": "Writing tool",
  "로그인 · Lore Sentry": "Log in · Lore Sentry",
  "계정 삭제 완료 · Lore Sentry": "Account deleted · Lore Sentry",
  "로그아웃 · Lore Sentry": "Logged out · Lore Sentry",

  취소: "Cancel",
  저장: "Save",
  "저장 중…": "Saving…",
  삭제: "Delete",
  닫기: "Close",
  "다시 시도": "Try again",
  복원: "Restore",
  "영구 삭제": "Delete permanently",
  "이름 변경": "Rename",
  수정: "Edit",
  확인: "OK",
  계속: "Continue",
  이전: "Back",
  다음: "Next",
  더보기: "More",
  선택: "Optional",
  "언어 바꾸기": "Change language",
  "{title} 더보기": "More actions for {title}",
  "{title} 메뉴": "{title} menu",
  "잠시 후 다시 시도해 주세요.": "Try again in a moment.",
  "로그인 정보를 불러오지 못했어요": "Couldn't load your login status",
  "로그인 정보를 확인하고 있어요.": "Checking your login status.",
  "작업공간 배치를 불러오지 못했어요": "Couldn't load the workspace layout",
  "파일 목록을 불러오지 못했어요": "Couldn't load the file list",
  "파일을 불러오는 중…": "Loading files…",
  "즐겨찾기를 불러오지 못했어요": "Couldn't load favorites",
  "즐겨찾기를 불러오는 중…": "Loading favorites…",
  "파일 목록을 다시 불러오면 즐겨찾기도 확인할 수 있어요.":
    "Reload the file list to see your favorites.",
  "최신화 상태를 불러오지 못했어요": "Couldn't load the refresh status",
  "최신화 상태를 불러오는 중…": "Loading refresh status…",
  "대화 목록을 불러오지 못했어요": "Couldn't load conversations",
  "대화 검색을 마치지 못했어요": "Couldn't search conversations",
  "대화 내용을 불러오지 못했어요": "Couldn't load this conversation",
  "대화를 불러오는 중…": "Loading conversations…",
  별칭: "Alias",
} satisfies Messages;
