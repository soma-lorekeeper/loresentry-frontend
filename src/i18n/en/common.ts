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
  "이 기기의 언어는 변경했지만 계정에 저장하지 못했어요.":
    "The language changed on this device, but couldn't be saved to your account.",
  "계정 언어 다시 저장": "Retry saving account language",
  "내보내기 중…": "Exporting…",

  "서비스 종료 안내": "Service closing notice",
  "Lore Sentry는 2026년 11월 29일에 서비스를 종료합니다. 그동안 이용해 주셔서 감사합니다.":
    "Lore Sentry closes on November 29, 2026. Thank you for writing with us.",
  "종료 후에는 로그인하거나 원고를 열 수 없습니다.":
    "After that date you can't log in or open your manuscripts.",
  "보관할 원고와 설정 문서는 종료 전에 내려받아 주시기 바랍니다. 문서를 열고 위쪽의 '내보내기'를 누르면 됩니다. 문서마다 따로 내려받아야 합니다.":
    "Download the manuscripts and setting documents you want to keep before then. Open a document and choose Export at the top. Each document is exported separately.",
  "종료 후에도 2026년 12월 29일까지는 가입한 이메일로 {email} 에 요청하시면 원고와 설정 문서를 파일로 보내 드립니다.":
    "Until December 29, 2026 you can still write to {email} from the email address you signed up with, and we'll send your manuscripts and setting documents as files.",
  "보관한 데이터는 2026년 12월 29일 이후 모두 파기합니다.":
    "All stored data is destroyed after December 29, 2026.",
  "휴지통에서 복원했어요.": "Restored from trash.",
  "‘{title}’을 ‘{location}’에 복원했어요.":
    "Restored ‘{title}’ to ‘{location}’.",
  "인용한 메모를 불러오지 못했어요": "Couldn't load the cited note",
  "인용한 메모를 찾을 수 없어요. 삭제됐을 수 있어요.":
    "The cited note couldn't be found. It may have been deleted.",
  "같은 위치에 같은 제목의 원고가 있어요. 파일 이름을 바꾼 뒤 이 항목을 빼고 다시 선택해 주세요.":
    "A manuscript with this title already exists here. Rename the file, remove this item, and select the renamed file.",
  "가져오지 못했어요. 다시 시도해 주세요.":
    "Couldn't import this file. Try again.",
  "파일을 옮기지 못했어요. 이전 위치를 유지합니다. 다시 시도해 주세요.":
    "Couldn't move the file. It remains in its previous location. Try again.",
  "즐겨찾기를 변경하지 못했어요. 다시 시도해 주세요.":
    "Couldn't change favorites. Try again.",
  "대화를 만들지 못했어요. 질문은 유지됩니다.":
    "Couldn't create a conversation. Your question is kept.",
  "대화 이름을 바꾸지 못했어요. 입력한 이름으로 다시 시도해 주세요.":
    "Couldn't rename the conversation. Try again with the name you entered.",
  "대화를 삭제하지 못했어요. 다시 시도해 주세요.":
    "Couldn't delete the conversation. Try again.",
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
  "제안 상태를 불러오지 못했어요": "Couldn't load the suggestion status",
  "제안 상태를 불러오는 중…": "Loading suggestion status…",
  "대화 목록을 불러오지 못했어요": "Couldn't load conversations",
  "대화 검색을 마치지 못했어요": "Couldn't search conversations",
  "대화 내용을 불러오지 못했어요": "Couldn't load this conversation",
  "대화를 불러오는 중…": "Loading conversations…",
  별칭: "Alias",
} satisfies Messages;
