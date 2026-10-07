import type { MessageParams, Messages } from "../messages";
import { plural } from "./helpers";

const KIND_NOUN: Record<string, string> = {
  manuscript: "manuscript",
  character: "character",
  place: "place",
  organization: "organization",
  item: "item",
  event: "event",
  worldview: "worldbuilding",
};

function kindNoun(params: MessageParams) {
  return KIND_NOUN[String(params.type)] ?? "{kind}";
}

function capitalize(text: string) {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function count(value: string | number | undefined, one: string, other: string) {
  return `${value} ${Number(value) === 1 ? one : other}`;
}

export default {
  "작업공간::새 탭": "New tab",
  "작업공간::그래프": "Graph",
  "작업공간::타임라인": "Timeline",
  "작업공간::메모": "Notes",
  "작업공간::휴지통": "Trash",
  "작업공간::설정": "Settings",
  "작업공간::사용 가이드": "User guide",
  "프로젝트 설정": "Project settings",

  "사이드바 열기": "Open sidebar",
  "사이드바 닫기": "Close sidebar",
  "열린 탭": "Open tabs",
  "{title} 탭 닫기": "Close {title} tab",
  "작업공간::불러오는 중": "Loading",
  "찾을 수 없는 파일": "File not found",
  "창 {number}": "Pane {number}",

  작업공간: "Workspace",
  "작업공간::즐겨찾기": "Favorites",
  "작업공간::파일": "Files",
  "문서의 별을 눌러 즐겨찾기에 추가하세요.":
    "Click a document's star to add it to favorites.",
  "{title} 더보기": "More actions for {title}",
  "{title} 메뉴": "{title} menu",
  "작업공간::이름": "Name",
  "작업공간::잠시 후 다시 시도해 주세요.": "Please try again in a moment.",
  "새 {kind}": (p) => `New ${kindNoun(p)}`,
  "새 에피소드": "New episode",
  "새 폴더": "New folder",
  "이름을 바꾸지 못했어요.": "Couldn't rename it.",
  "만들지 못했어요.": "Couldn't create it.",
  "옮기지 못했어요.": "Couldn't move it.",
  "에피소드 추가": "Add episode",
  "{kind} 추가": (p) => `Add ${kindNoun(p)}`,
  "원고 추가": "Add manuscript",
  "에피소드 폴더 삭제": "Delete episode folder",
  "작업공간::휴지통으로 이동": "Move to trash",
  "옆에 열기": "Open to the side",
  "작업공간::즐겨찾기에 추가": "Add to favorites",
  "작업공간::즐겨찾기에서 제거": "Remove from favorites",
  "휴지통으로 옮겼어요.": "Moved to trash.",
  "‘{title}’은 휴지통에서 복원할 수 있어요.":
    "You can restore ‘{title}’ from the trash.",
  "휴지통으로 옮길까요?": "Move to trash?",
  "휴지통에서 원래 위치로 복원할 수 있어요.":
    "You can restore it to its original place from the trash.",
  "휴지통으로 옮기지 못했어요. 다시 시도해 주세요.":
    "Couldn't move it to the trash. Please try again.",
  "에피소드 폴더를 삭제할까요?": "Delete this episode folder?",
  "폴더만 사라지고 안에 있던 회차는 원고 폴더로 돌아갑니다.":
    "Only the folder is removed. Its chapters go back to the Manuscripts folder.",
  "에피소드 폴더를 삭제하지 못했어요. 다시 시도해 주세요.":
    "Couldn't delete the episode folder. Please try again.",
  "섹션을 삭제하지 못했습니다": "Couldn't delete the section",
  "{title} 섹션을 삭제할까요?": "Delete the {title} section?",
  "{title}와 내부 항목은 변경되지 않았습니다. 잠시 후 다시 시도해 주세요.":
    "{title} and everything in it were not changed. Please try again in a moment.",
  "파일 {files}개와 폴더 {folders}개는 파일 > {title}로 이동합니다.": (p) =>
    `${count(p.files, "file", "files")} and ${count(p.folders, "folder", "folders")} will move to Files > {title}.`,
  "{title} · 파일 {files}개 · 폴더 {folders}개": (p) =>
    `{title} · ${count(p.files, "file", "files")} · ${count(p.folders, "folder", "folders")}`,
  "파일 / {title} · 총 {count}개 항목": plural(
    "Files / {title} · {count} item in total",
    "Files / {title} · {count} items in total",
  ),
  "섹션 삭제": "Delete section",

  "그래프 최신화 (준비 중)": "Graph refresh (soon)",
  "작업공간::그래프 추출 중…": "Extracting graph…",
  "작업공간::변경 사항 반영": "Apply changes",
  "작업공간::그래프 최신화": "Graph refresh",
  "그래프 최신화를 시작하지 못했어요.": "Couldn't start the graph refresh.",

  "작업공간::도움말": "Help",
  "도움말 메뉴": "Help menu",
  "작업공간 둘러보기": "Tour the workspace",
  "작업공간::피드백 보내기": "Send feedback",

  "작업공간::프로젝트 목록": "All projects",
  "프로젝트 전환, 현재 {title}": "Switch project, current: {title}",
  "프로젝트 전환": "Switch project",

  "가져온 원고": "Imported manuscript",
  "원고를 가져왔어요.": "Manuscript imported.",
  "파일을 가져오지 못했어요.": "Couldn't import the file.",
  "텍스트(.txt)나 마크다운(.md) 파일인지 확인해 주세요.":
    "Make sure it's a text (.txt) or Markdown (.md) file.",

  "제목 없는 {kind}": (p) => `Untitled ${kindNoun(p)}`,
  "작업공간::이어서 작업하기": "Continue working",
  "첫 파일을 만들어 시작하세요": "Create your first file to get started",
  "원고 만들기": "Create manuscript",
  "작업공간::새로 만들기": "Create new",
  가져오기: "Import",
  "작업공간::최근에 연 파일": "Recently opened",
  "최근에 연 파일이 없어요": "No recently opened files",

  "작업공간을 열 수 없어요": "Can't open this workspace",
  "프로젝트가 휴지통에 있거나 접근할 수 없어요. 프로젝트 목록에서 다시 선택해 주세요.":
    "The project is in the trash or you can't access it. Choose a project again from your project list.",
  "프로젝트 목록으로 이동": "Go to your projects",

  "메모를 삭제할까요?": "Delete this note?",
  "이 메모는 바로 삭제되며 되돌릴 수 없습니다. 파일 메모를 삭제해도 원본 파일은 유지됩니다.":
    "This note is deleted right away and can't be undone. Deleting a file note keeps the file itself.",
  "이 메모는 바로 삭제되며 되돌릴 수 없습니다.":
    "This note is deleted right away and can't be undone.",
  "빈 메모": "Empty note",
  "메모를 삭제했어요.": "Note deleted.",
  "작업공간::삭제 중…": "Deleting…",
  "메모 삭제": "Delete note",
  "메모를 삭제하지 못했어요. 다시 시도해 주세요.":
    "Couldn't delete the note. Please try again.",
  "메모를 저장하지 못했어요.": "Couldn't save the note.",
  "작업공간::연결을 확인한 뒤 다시 시도해 주세요.":
    "Check your connection and try again.",
  "메모 메뉴": "Note menu",
  "눌러서 내용을 적으세요.": "Click to start writing.",
  "메모 내용": "Note text",
  "메모를 적으세요.": "Write a note.",
  "불러오는 중…": "Loading…",
  "메모를 불러오지 못했어요": "Couldn't load notes",
  아래: "Bottom",
  오른쪽: "Right",
  "메모 패널 크기 조절": "Resize notes panel",
  "메모 닫기": "Close notes",
  "메모 위치": "Notes position",
  "메모 종류": "Which notes",
  "{kind} 메모": (p) => `${capitalize(kindNoun(p))} notes`,
  "작품 메모": "Story notes",
  "{kind} 메모 추가": (p) => `Add ${kindNoun(p)} note`,
  "작품 메모 추가": "Add story note",
  "메모 추가": "Add note",
  "{title}에 적은 메모가 없어요": "No notes on {title} yet",
  "이 {kind}에 대해 기억할 것을 적어 두세요.": (p) =>
    `Write down what you want to remember about this ${kindNoun(p)}.`,
  "작품 메모가 없어요": "No story notes yet",
  "작품 전체에 걸친 생각을 적어 두세요.":
    "Write down thoughts that span the whole story.",
  "문서 메모": "Document notes",
  "찾을 수 없는 문서": "Document not found",
  "파일로 이동": "Go to file",
  "작업공간::메모 범위": "Notes scope",
  "문서 메모가 없어요": "No document notes yet",
  "문서를 열어 메모 패널에서 적으면 여기에 모여요.":
    "Notes you write in a document's notes panel gather here.",

  "작업공간::설정이 저장되었습니다": "Settings saved",
  "사이드바와 프로젝트 목록에 바로 반영됐어요.":
    "The sidebar and your project list are already updated.",
  "작업공간::설정을 저장하지 못했어요": "Couldn't save settings",
  "입력값은 유지됩니다.": "What you entered is kept.",
  "프로젝트 이름 · {title}": "Project name · {title}",
  "프로젝트 설명": "Project description",
  "작업공간::프로젝트를 휴지통으로 이동할까요?":
    "Move this project to the trash?",
  "프로젝트 안의 파일도 함께 이동합니다.": "Its files move with it.",
  "프로젝트를 휴지통으로 옮겼어요.": "Project moved to trash.",
  "프로젝트 휴지통에서 복원할 수 있어요.":
    "You can restore it from the project trash.",
  "작업공간::이동 중…": "Moving…",
  "이동할 프로젝트": "Project to move",
  "프로젝트를 이동하지 못했어요. 작업공간은 그대로 유지했어요.":
    "Couldn't move the project. Your workspace is unchanged.",
  일반: "General",
  "작업공간::프로젝트 이름": "Project name",
  "작업공간::프로젝트 이름을 입력해 주세요.": "Enter a project name.",
  "위험 영역": "Danger zone",
  "프로젝트를 휴지통으로 이동": "Move project to trash",
  "프로젝트 목록의 휴지통에서 복원하거나 영구 삭제할 수 있어요.":
    "You can restore it or delete it permanently from the trash in your project list.",
  이동: "Move",
  "변경사항을 저장하지 않고 나갈까요?": "Leave without saving your changes?",
  "현재 프로젝트 설정의 변경사항이 사라집니다.":
    "Your changes to the project settings will be lost.",
  "계속 편집": "Keep editing",
  "변경사항 버리기": "Discard changes",
  "설정을 불러오는 중이에요": "Loading settings",
  "설정을 불러오지 못했어요": "Couldn't load settings",

  "이 항목을 영구 삭제할까요?": "Delete this item permanently?",
  "안에 있는 {count}개 항목도 함께 완전히 삭제되고 복원할 수 없어요.": plural(
    "The item inside is also deleted for good and can't be restored.",
    "The {count} items inside are also deleted for good and can't be restored.",
  ),
  "이 항목은 프로젝트에서 완전히 삭제되고 복원할 수 없어요.":
    "This item is deleted from the project for good and can't be restored.",
  "영구 삭제했어요.": "Deleted permanently.",
  "‘{title}’을 휴지통에서 지웠어요.": "Removed ‘{title}’ from the trash.",
  "영구 삭제하지 못했어요. 다시 시도해 주세요.":
    "Couldn't delete it permanently. Please try again.",
  "휴지통::{count}개": plural("{count} item", "{count} items"),
  "원래 위치로 복원했어요.": "Restored to its original place.",
  "‘{title}’을 다시 열 수 있어요.": "You can open ‘{title}’ again.",
  "‘{title}’ 폴더를 파일 목록에 되돌렸어요.":
    "The ‘{title}’ folder is back in your files.",
  열기: "Open",
  "휴지통을 불러오는 중이에요": "Loading the trash",
  "작업공간::휴지통을 불러오지 못했어요": "Couldn't load the trash",
  "작업공간::휴지통이 비어 있어요": "The trash is empty",
  "삭제한 파일과 폴더는 여기에서 복원하거나 영구 삭제할 수 있어요.":
    "Files and folders you delete appear here, where you can restore them or delete them permanently.",
  "삭제한 항목": "Deleted items",
  "복원 중…": "Restoring…",
  "복원하지 못했어요. 다시 시도해 주세요.":
    "Couldn't restore it. Please try again.",
} satisfies Messages;
