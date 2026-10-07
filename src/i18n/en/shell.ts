import type { Messages } from "../messages";

import { plural } from "./helpers";

export default {
  "분류::원고": "Manuscripts",
  "분류::캐릭터": "Characters",
  "분류::장소": "Places",
  "분류::조직": "Organizations",
  "분류::아이템": "Items",
  "분류::이벤트": "Events",
  "분류::세계관": "Worldbuilding",
  "분류 하나::원고": "Manuscript",
  "분류 하나::캐릭터": "Character",
  "분류 하나::장소": "Place",
  "분류 하나::조직": "Organization",
  "분류 하나::아이템": "Item",
  "분류 하나::이벤트": "Event",
  "분류 하나::세계관": "Worldbuilding",
  "관련 원고": "Related manuscripts",
  "관련 캐릭터": "Related characters",
  "관련 장소": "Related places",
  "관련 조직": "Related organizations",
  "관련 아이템": "Related items",
  "관련 이벤트": "Related events",
  "관련 세계관": "Related worldbuilding",

  "저장되지 않은 변경사항": "Unsaved changes",
  "설정을 저장하고 있습니다": "Saving settings",
  "설정이 저장되었습니다": "Settings saved",
  "설정을 저장하지 못했어요": "Couldn't save settings",
  "입력한 값은 유지됩니다.": "Your entries are kept.",
  "변경사항 저장": "Save changes",
  "화면 테마": "Theme",
  "시스템 설정 따르기": "Use system setting",
  다크: "Dark",
  라이트: "Light",

  프로젝트: "Projects",
  "프로젝트 메뉴": "Project navigation",
  휴지통: "Trash",
  "사용 가이드": "Guide",
  "피드백 보내기": "Send feedback",
  정책: "Policies",
  이용약관: "Terms of Service",
  개인정보처리방침: "Privacy Policy",
  "계정 메뉴": "Account menu",
  "계정 설정": "Account settings",
  로그아웃: "Log out",

  "프로젝트 수::{count}개": "{count}",
  "새 프로젝트": "New project",
  "{title} 더보기": "More actions for {title}",
  "{title} 메뉴": "{title} menu",
  "휴지통으로 이동": "Move to trash",
  "프로젝트를 불러오지 못했어요": "Couldn't load your projects",
  "네트워크 연결을 확인한 뒤 다시 시도해 주세요.":
    "Check your network connection and try again.",
  "아직 프로젝트가 없어요": "No projects yet",
  "첫 프로젝트를 만들고 세계와 이야기를 한곳에서 정리해 보세요.":
    "Create your first project and keep your world and story in one place.",
  "첫 프로젝트 만들기": "Create your first project",
  "최근 작업순 프로젝트": "Projects by most recent work",
  "프로젝트를 수정했어요.": "Project updated.",
  "프로젝트를 휴지통으로 이동했어요.": "Project moved to the trash.",
  "휴지통 보기": "View trash",

  "새 프로젝트 만들기": "New project",
  "새 프로젝트 만들기 닫기": "Close new project",
  "프로젝트 만드는 중…": "Creating project…",
  "프로젝트 만들기": "Create project",
  "프로젝트 제목": "Project title",
  "프로젝트 제목을 입력하세요": "Enter a project title",
  "프로젝트 제목을 입력해 주세요.": "Enter a project title.",
  설명: "Description",
  "어떤 이야기인지 짧게 적어 두세요": "A short note on what the story is about",
  "프로젝트를 만들지 못했어요. 입력을 유지했으니 다시 시도해 주세요.":
    "Couldn't create the project. What you entered is still here, so try again.",
  "프로젝트 수정": "Edit project",
  "프로젝트 수정 닫기": "Close edit project",
  "프로젝트 이름": "Project name",
  "프로젝트 이름을 입력하세요": "Enter a project name",
  "프로젝트 이름을 입력해 주세요.": "Enter a project name.",
  "변경한 내용을 저장하지 못했어요. 입력은 그대로 두었어요.":
    "Couldn't save your changes. What you entered is still here.",
  "프로젝트를 휴지통으로 이동할까요?": "Move this project to the trash?",
  "파일과 설정은 그대로 남고, 휴지통에서 다시 복원할 수 있어요.":
    "Its files and settings stay as they are, and you can restore it from the trash.",
  "이동 중…": "Moving…",
  "프로젝트를 이동하지 못했어요. 목록은 그대로 유지했어요.":
    "Couldn't move the project. Your list is unchanged.",

  "프로젝트를 영구 삭제할까요?": "Delete this project permanently?",
  "프로젝트의 모든 파일과 설정이 완전히 삭제되며 복원할 수 없습니다.":
    "All of the project's files and settings will be deleted. This can't be undone.",
  "삭제 중…": "Deleting…",
  "프로젝트를 영구 삭제하지 못했어요. 다시 시도해 주세요.":
    "Couldn't delete the project. Try again.",
  "프로젝트를 복원했어요.": "Project restored.",
  "목록에서 보기": "View in projects",
  "휴지통을 불러오지 못했어요": "Couldn't load the trash",
  "잠시 후 다시 시도해 주세요.": "Try again in a moment.",
  "휴지통이 비어 있어요": "The trash is empty",
  "휴지통으로 이동한 프로젝트가 여기에 보관돼요.":
    "Projects you move to the trash are kept here.",
  "{date}에 삭제": "Deleted {date}",
  "프로젝트를 복원하지 못했어요. 다시 시도해 주세요.":
    "Couldn't restore the project. Try again.",
  "프로젝트를 영구 삭제했어요.": "Project deleted permanently.",
  "‘{title}’은 이제 복원할 수 없어요.": "‘{title}’ can no longer be restored.",

  "저장되지 않은 이름 변경": "Unsaved name change",
  "계정 정보를 저장하고 있습니다": "Saving your account details",
  "계정 정보가 저장되었습니다": "Account details saved",
  "계정 정보를 저장하지 못했어요": "Couldn't save your account details",
  "입력한 이름은 유지됩니다.": "The name you entered is kept.",
  "계정 설정 닫기": "Close account settings",
  이름: "Name",
  "이름을 입력해 주세요.": "Enter your name.",
  이메일: "Email",
  "Google 계정": "Google account",
  언어: "Language",
  "계정 삭제": "Delete account",
  "모든 프로젝트와 휴지통 항목이 함께 영구 삭제되며 되돌릴 수 없어요.":
    "All your projects and trash items are deleted with it. This can't be undone.",

  "모든 프로젝트와 그 안의 원고, 설정 문서, 메모, 버전":
    "All projects and their manuscripts, setting documents, notes and versions",
  "프로젝트 {count}개와 그 안의 원고, 설정 문서, 메모, 버전": plural(
    "{count} project and its manuscripts, setting documents, notes and versions",
    "{count} projects and their manuscripts, setting documents, notes and versions",
  ),
  "휴지통에 있는 프로젝트": "Projects in the trash",
  "휴지통에 있는 프로젝트 {count}개": plural(
    "{count} project in the trash",
    "{count} projects in the trash",
  ),
  "올린 이미지와 AI 분석 결과": "Uploaded images and AI analysis results",
  "계정을 삭제하고 있어요": "Deleting your account",
  "계정을 삭제할까요?": "Delete your account?",
  "모든 자료를 지우는 중이에요. 창을 닫지 말고 잠시만 기다려 주세요.":
    "Erasing all your data. Keep this window open and wait a moment.",
  "이 계정과 모든 작업이 바로 삭제되며 되돌릴 수 없어요.":
    "This account and all your work will be deleted right away. This can't be undone.",
  "계정을 삭제하지 못했어요. 계정과 작업은 그대로 있어요.":
    "Couldn't delete your account. Your account and work are unchanged.",
  "함께 영구 삭제돼요": "Also deleted permanently",
  "확인을 위해 이메일을 입력하세요": "Enter your email to confirm",
  "입력한 이메일이 계정 이메일과 달라요.":
    "This email doesn't match your account email.",
  "계정이 삭제되었어요": "Account deleted",
  "같은 Google 계정으로 다시 로그인하면 새 계정으로 시작해요.":
    "If you log in again with the same Google account, you'll start with a new account.",
  "로그인 화면으로 이동": "Go to login",

  로그아웃되었습니다: "You're logged out",
  "잠시 후 로그인 화면으로 이동합니다.":
    "Taking you to the login page in a moment.",
  "로그아웃하고 있습니다": "Logging out",
  "로그아웃하지 못했어요": "Couldn't log out",
  "지금 화면과 작업은 그대로예요. 연결을 확인한 뒤 다시 시도해 주세요.":
    "Your screen and work are unchanged. Check your connection and try again.",
  "로그아웃할까요?": "Log out?",
  "로그아웃 중…": "Logging out…",

  로그인: "Log in",
  "Google로 계속하기": "Continue with Google",
  "Google 로그인으로 이동 중…": "Going to Google…",
  "Google로 다시 계속하기": "Continue with Google again",
  "다시 로그인해 주세요": "Log in again",
  "Google로 다시 로그인": "Log in again with Google",
  "Lore Sentry 소개": "About Lore Sentry",
  "Google 로그인이 취소됐어요.": "Google login was canceled.",
  "로그인을 완료하지 못했어요. 다시 시도해 주세요.":
    "Couldn't finish logging in. Try again.",
  "세션이 만료됐어요.": "Your session expired.",
  "세션이 만료됐어요. 로그인하면 하던 작업으로 돌아가요.":
    "Your session expired. Log in to get back to what you were doing.",

  "약관을 불러올 수 없어요. Google 로그인부터 다시 시작해 주세요.":
    "Couldn't load the terms. Start again from Google login.",
  "약관이 변경됐어요. 새 원문을 확인하고 다시 동의해 주세요.":
    "The terms have changed. Read the new version and agree again.",
  "약관을 확인할 수 없어요. 다시 로그인해 주세요.":
    "Couldn't check the terms. Log in again.",
  "동의 대기가 만료됐어요. Google 로그인부터 다시 시작해 주세요.":
    "The consent request expired. Start again from Google login.",
  "동의 결과를 확인할 수 없어요. Google 로그인부터 다시 시작해 주세요.":
    "Couldn't confirm your consent. Start again from Google login.",
  "서비스 이용약관을 불러오고 있어요.": "Loading the Terms of Service.",
  "로그인으로 돌아가기": "Back to login",
  "서비스 이용약관 동의": "Agree to the Terms of Service",
  "약관 닫기": "Close terms",
  나중에: "Not now",
  "동의하고 계속": "Agree and continue",
  "버전 {version} · 시행일 {date}": "Version {version} · Effective {date}",
  "서비스 이용약관 전문": "Full Terms of Service",
  "[필수] Lore Sentry 서비스 이용약관에 동의합니다.":
    "[Required] I agree to the Lore Sentry Terms of Service.",
  "개인정보 처리에 관한 안내는 <link>개인정보 처리방침</link>에서 확인할 수 있습니다.":
    "See the <link>Privacy Policy</link> for how your personal information is handled.",

  "불편했던 점이나 있었으면 하는 기능을 자유롭게 적어 주세요.":
    "Tell us what got in your way or what you'd like to see.",
  "피드백을 보냈어요": "Feedback sent",
  "피드백을 보내지 못했어요. 쓴 내용은 그대로 있으니 연결을 확인하고 다시 보내 주세요.":
    "Couldn't send your feedback. What you wrote is still here, so check your connection and send it again.",
  "피드백을 보내지 못했어요. 다시 보내 주세요.":
    "Couldn't send your feedback. Send it again.",
  "보내는 중…": "Sending…",
  "다시 보내기": "Send again",
  보내기: "Send",
  내용: "Message",
  "계정 정보와 지금 보고 있던 화면 위치({page})가 함께 전달돼요.":
    "Your account details and the page you were on ({page}) are sent with it.",

  "{what}은 아직 준비 중이에요": "{what} isn't ready yet",
  "서버가 연결되면 여기에서 바로 쓸 수 있어요. 지금은 보여 드릴 것이 없어요.":
    "You can use it here once the server is connected. There's nothing to show yet.",

  "로그인 상태가 변경됐어요. 다시 확인해 주세요.":
    "Your login status changed. Check and try again.",
  "계정 정보를 확인할 수 없어요.": "Couldn't read your account details.",
  "약관 정보를 확인할 수 없어요.": "Couldn't read the terms.",
  "약관 버전을 확인해 주세요.": "Check the terms version.",
  "로그아웃은 됐지만 서버 확인을 받지 못했어요.":
    "You're logged out, but the server didn't confirm it.",
  "서버 응답을 확인할 수 없어요.": "Couldn't read the server's response.",
  "서버에 연결할 수 없어요.": "Can't connect to the server.",
  "문서가 다른 곳에서 먼저 저장됐어요.":
    "This document was saved somewhere else first.",
  "내보내기::분류": "Type",
  "저장하지 못했어요.": "Couldn't save.",
  별칭: "Alias",
  "파일을 찾을 수 없어요.": "Couldn't find the file.",
  "{what}는 아직 서버에 저장할 수 없어요.":
    "{what} isn't supported by the server yet.",
  "이 위치의 폴더": "A folder in this location",
  "에피소드 순서 바꾸기": "Reordering episodes",
  "이 위치": "This location",

  "입력을 다시 확인해 주세요.": "Check what you entered.",
  "동의 대기가 만료됐어요. 다시 로그인해 주세요.":
    "The consent request expired. Log in again.",
  "약관이 변경됐어요. 새 약관을 확인해 주세요.":
    "The terms have changed. Read the new terms.",
  "요청을 확인할 수 없어요. 로그인부터 다시 시작해 주세요.":
    "Couldn't verify the request. Start again from login.",
  "같은 이름이 이미 있어요.": "That name is already taken.",
  "찾을 수 없어요.": "Not found.",
  "잠긴 문서는 편집할 수 없어요.": "Locked documents can't be edited.",
  "처리 중이에요. 잠시 뒤 다시 시도해 주세요.":
    "Still working on it. Try again in a moment.",
  "이 기능은 아직 준비되지 않았어요.": "This feature isn't ready yet.",
  "다시 로그인해 주세요.": "Log in again.",
  "알 수 없는 오류가 발생했어요.": "Something went wrong.",
  "내용을 1~2,000자로 적어 주세요.": "Write between 1 and 2,000 characters.",
  "짧은 시간에 많이 보냈어요. 잠시 뒤에 다시 보내 주세요.":
    "You've sent a lot in a short time. Try again in a moment.",
  "같은 이름의 프로젝트가 이미 있어요.":
    "A project with this name already exists.",
  "계정을 삭제하지 못했어요. 계정과 작업은 그대로 있어요. 잠시 뒤 다시 시도해 주세요.":
    "Couldn't delete your account. Your account and work are unchanged. Try again in a moment.",
  "같은 위치에 같은 이름이 이미 있어요.":
    "Something with this name already exists here.",
  "프로젝트 제목을 확인해 주세요.": "Check the project title.",
  "설명이 너무 길어요.": "The description is too long.",
  "이름을 확인해 주세요.": "Check the name.",
  "그 위치에는 둘 수 없어요.": "It can't go there.",
  "연결할 수 없는 문서예요.": "This document can't be linked.",
  "휴지통으로 옮긴 뒤에 삭제할 수 있어요.":
    "Move it to the trash before deleting it.",
  "로그인이 필요해요.": "You need to log in.",
  "메모를 확인해 주세요.": "Check the note.",
  "메모를 찾을 수 없어요.": "Couldn't find the note.",
  "이미지를 찾을 수 없어요.": "Couldn't find the image.",
  "올릴 수 없는 파일이에요.": "This file can't be uploaded.",
  "업로드가 끝나지 않았어요. 다시 시도해 주세요.":
    "The upload didn't finish. Try again.",
  "잠시 뒤 다시 시도해 주세요.": "Try again in a moment.",
  "세션이 만료됐어요. 다시 로그인해 주세요.":
    "Your session expired. Log in again.",
} satisfies Messages;
