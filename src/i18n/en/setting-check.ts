import type { Messages } from "../messages";
import { plural } from "./helpers";

/** 설정 오류 점검: 점검 탭, 사이드바 항목, 원고 도구 막대, 설정 문서의 중요 설정 표시 */
export default {
  "설정 오류 점검": "Setting check",
  "설정 오류 점검 (준비 중)": "Setting check (coming soon)",
  "확인할 것 {count}개": plural("{count} to review", "{count} to review"),
  "점검 중 · 결과 보기": "Checking · View results",
  "설정 오류 점검을 시작할까요?": "Start a setting check?",
  "점검 시작": "Start check",
  "원고 한 편을 앞 회차와 설정 문서에 대조해 어긋나 보이는 곳을 찾아요.":
    "Compare one chapter with earlier chapters and your setting documents to find what seems to conflict.",
  "점검할 원고": "Chapter to check",
  "점검할 원고: {title}": "Chapter to check: {title}",
  "지난 점검": "Past checks",
  "분석 중": "Analyzing",
  "어긋나 보이는 곳을 찾고 있어요": "Looking for what seems to conflict",
  "앞 회차와 설정 읽기": "Read earlier chapters and settings",
  "어긋남 찾기": "Find conflicts",
  "다시 확인": "Double-check",
  "보통 1–3분 걸려요. 다른 작업을 해도 계속돼요.":
    "It usually takes 1–3 minutes and keeps going while you work on something else.",
  근거: "Source",
  "대상 원고": "Chapter",
  "문단 {count}개 펼치기": plural(
    "Show {count} paragraph",
    "Show {count} paragraphs",
  ),
  "이전 어긋남": "Previous conflict",
  "다음 어긋남": "Next conflict",
  "확신 낮음 · {text}": "Low confidence · {text}",
  "{title} 점검이 끝나면 시작할 수 있어요.":
    "You can start once the check on {title} finishes.",
  "중요 설정으로 표시한 문단은 꼭 지킬 사실로 봐요":
    "Paragraphs marked as key settings are treated as must-keep facts",
  "보통 1–3분 걸려요. 그동안 계속 쓸 수 있어요":
    "Usually takes 1–3 minutes. You can keep writing meanwhile",

  회차: "Chapters",
  점검: "Check",
  "점검 안 함": "Not checked",
  "점검할 원고가 없어요": "No chapters to check",
  "원고 회차를 쓰면 여기에서 점검할 수 있어요.":
    "Once you write a chapter, you can check it here.",
  "점검 기록을 불러오지 못했어요": "Couldn't load setting checks",
  "점검 결과를 불러오지 못했어요": "Couldn't load the check results",

  "점검하지 못함": "Failed",
  취소함: "Canceled",
  "어긋남 {count}": plural("{count} conflict", "{count} conflicts"),
  "어긋남 없음": "No conflicts",
  "다시 점검하기": "Check again",
  "아직 점검하지 않았어요": "Not checked yet",
  "이 회차를 앞 회차와 설정 문서에 대조해 어긋나 보이는 곳을 찾아요.":
    "Compares this chapter with earlier chapters and your setting documents to find places that seem to conflict.",
  "점검하지 못했어요": "Couldn't finish the check",
  "원고는 바뀌지 않았어요. 잠시 뒤 다시 시도해 주세요.":
    "Your manuscript wasn't changed. Try again in a moment.",
  "점검이 중간에 멈췄어요. 원고는 바뀌지 않았어요. 다시 시도해 주세요.":
    "The check stopped partway. Your manuscript wasn't changed. Try again.",
  "점검하는 동안 회차를 찾을 수 없게 됐어요. 원고는 바뀌지 않았어요.":
    "The chapter couldn't be found while checking. Your manuscript wasn't changed.",
  "이 회차와 설정 문서가 한 번에 읽을 수 있는 양을 넘어요. 다시 시도해도 같아요. 회차나 설정 문서를 줄이면 점검할 수 있어요.":
    "This chapter and your setting documents are more than can be read at once. Trying again won't help; shorten the chapter or setting documents to check it.",
  "점검을 취소했어요": "Check canceled",
  "점검한 뒤 원고가 바뀌었어요": "The chapter changed after this check",

  "어긋남 걸러 보기": "Filter conflicts",
  "확인할 것": "To review",
  의도함: "Intended",
  "충돌 아님": "Not a conflict",
  "{title}에서 보기: {quote}": "Show in {title}: {quote}",
  "충돌 아니에요": "Not a conflict",
  "의도한 거예요": "It's intended",
  "의도한 이유": "Why it's intended",
  "충돌이 아닌 이유": "Why it isn't a conflict",
  "선택 · 다음 점검에서 AI가 이 이유를 읽어요":
    "Optional · The next check reads this reason",
  "의도함으로 옮겼어요.": "Moved to Intended.",
  "충돌 아님으로 옮겼어요.": "Moved to Not a conflict.",
  "확인할 것으로 되돌렸어요.": "Moved back to To review.",
  "판정을 저장하지 못했어요.": "Couldn't save your decision.",
  "판정 단추 설명": "What these buttons do",
  "충돌 아니에요 · 점검이 잘못 짚었어요. 두 내용은 함께 성립해요.\n의도한 거예요 · 설정과 다른 걸 알고 일부러 썼어요.\n\n어느 쪽이든 다음 점검부터 같은 곳은 확인할 것에 올리지 않고, 남긴 이유는 AI가 참고해요. 판정 기록에서 되돌릴 수 있어요.":
    "Not a conflict · The check got it wrong. Both can be true.\nIt's intended · You know it differs from the setting and wrote it on purpose.\n\nEither way, the next check won't list this place to review again, and the AI takes your reason into account. You can undo it from Decisions.",
  "판정 기록": "Decisions",
  "판정 기록 {count}": "Decisions {count}",
  "판정 기록을 불러오지 못했어요": "Couldn't load your decisions",
  "남긴 판정이 없어요": "No decisions yet",
  "점검 결과에서 ‘충돌 아니에요’나 ‘의도한 거예요’를 고르면 여기에 모여요.":
    "When you mark a result as “Not a conflict” or “It's intended,” it's collected here.",
  "어긋나 보이는 곳이 없어요": "Nothing seems to conflict",
  "어긋나 보이는 곳이 없어요.": "Nothing seems to conflict.",
  "중요 설정 {count}개와 앞 회차의 사실을 모두 지켰어요.": plural(
    "The chapter keeps {count} key setting and the facts of earlier chapters.",
    "The chapter keeps all {count} key settings and the facts of earlier chapters.",
  ),
  "중요 설정 {count}개를 모두 지켰어요.": plural(
    "The chapter keeps {count} key setting.",
    "The chapter keeps all {count} key settings.",
  ),
  "앞 회차와 설정 문서의 사실을 모두 지켰어요.":
    "The chapter keeps the facts of earlier chapters and setting documents.",
  "설정 문서의 사실을 모두 지켰어요.":
    "The chapter keeps the facts of your setting documents.",
  "의도한 것으로 남긴 어긋남이 없어요.": "Nothing marked as intended.",
  "충돌이 아니라고 남긴 어긋남이 없어요.": "Nothing marked as not a conflict.",
  "확인할 것이 남지 않았어요.": "Nothing left to review.",

  "문서를 저장하지 못해 점검을 시작하지 않았어요.":
    "The check didn't start because a document couldn't be saved.",
  "점검을 시작하지 못했어요.": "Couldn't start the check.",
  "{title} 점검을 마쳤어요.": "Finished checking {title}.",
  "{title} 점검을 마치지 못했어요.": "Couldn't finish checking {title}.",
  "어긋나 보이는 곳 {count}개를 찾았어요.": plural(
    "Found {count} place that seems to conflict.",
    "Found {count} places that seem to conflict.",
  ),
  "원고는 바뀌지 않았어요.": "Your manuscript wasn't changed.",
  "결과 보기": "View results",
  "새 회차를 만들었어요. 앞 회차를 점검할까요?":
    "New chapter created. Check the previous chapter?",
  "이 문장을 찾지 못했어요.": "Couldn't find this sentence.",
  "점검한 뒤 고쳤을 수 있어요.": "It may have been edited after the check.",

  "점검 기록을 찾을 수 없어요.": "The check couldn't be found.",
  "이 어긋남을 찾을 수 없어요. 다시 불러와 주세요.":
    "This conflict couldn't be found. Reload and try again.",
  "점검할 원고를 찾을 수 없어요.": "The chapter to check couldn't be found.",
  "다른 회차를 점검하고 있어요. 끝난 뒤에 다시 시도해 주세요.":
    "Another chapter is being checked. Try again when it finishes.",

  "중요 설정": "Key setting",
  "{count}개": "{count}",
  "중요 설정 {count}개 · 첫 문단으로 가기": plural(
    "{count} key setting · Go to the first one",
    "{count} key settings · Go to the first one",
  ),
  "중요 설정으로 표시": "Mark as key setting",
  "표시 풀기": "Unmark",
  "선택한 문단": "Selected paragraphs",
} satisfies Messages;
