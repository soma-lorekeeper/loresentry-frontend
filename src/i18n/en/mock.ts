import type { Messages } from "../messages";

export default {
  "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.":
    "Couldn't reach the server. Try again in a moment.",

  "mock::다시 로그인해 주세요.": "Please log in again.",
  "새 약관을 확인해 주세요.": "Please review the new terms.",
  "표시 이름은 1~{max}자로 입력해 주세요.":
    "Enter a display name between 1 and {max} characters.",
  "mock::입력한 이메일이 계정 이메일과 달라요.":
    "The email you entered doesn't match your account email.",

  "mock::내용을 1~2,000자로 적어 주세요.":
    "Write between 1 and 2,000 characters.",

  "프로젝트를 찾을 수 없어요.": "Couldn't find this project.",
  "mock::프로젝트 제목을 입력해 주세요.": "Enter a project title.",
  "프로젝트 제목은 {max}자 이하로 입력해 주세요.":
    "Keep the project title to {max} characters or fewer.",
  "mock::같은 이름의 프로젝트가 이미 있어요.":
    "A project with this name already exists.",
  "설명은 {max}자 이하로 입력해 주세요.":
    "Keep the description to {max} characters or fewer.",
  "휴지통에 있는 프로젝트는 열 수 없어요.":
    "Projects in the trash can't be opened.",

  "mock::파일": "Files",
  "mock::폴더": "Folder",
  "mock::설명": "Description",
  "mock::분류": "Category",
  "mock::파일을 찾을 수 없어요.": "Couldn't find this file.",
  "mock::이름을 입력해 주세요.": "Enter a name.",
  "이름은 {max}자 이하로 입력해 주세요.":
    "Keep the name to {max} characters or fewer.",
  "기본 분류 폴더는 바꿀 수 없어요.":
    "Default category folders can't be changed.",
  "폴더 안에만 만들 수 있어요.": "You can only create items inside a folder.",
  "에피소드 안에는 폴더를 만들 수 없어요.":
    "You can't create folders inside an episode.",
  "에피소드 폴더는 원고 아래에만 만들 수 있어요.":
    "Episode folders can only go under Manuscripts.",
  "문서는 폴더 안에 만들어 주세요.": "Create documents inside a folder.",
  "에피소드에는 원고만 둘 수 있어요.": "Episodes can only contain chapters.",
  "폴더 안으로만 옮길 수 있어요.": "You can only move items into a folder.",
  "이 폴더 안에는 폴더를 옮길 수 없어요.":
    "Folders can't be moved into this folder.",
  "폴더를 자기 안으로 옮길 수 없어요.": "A folder can't be moved into itself.",
  "에피소드 폴더만 삭제할 수 있어요.": "Only episode folders can be deleted.",

  "문서를 찾을 수 없어요.": "Couldn't find this document.",
  "mock::잠긴 문서는 편집할 수 없어요.": "Locked documents can't be edited.",
  "잠긴 문서는 새 버전을 저장할 수 없어요.":
    "You can't save a new version of a locked document.",
  "잠긴 문서는 버전을 복원할 수 없어요.":
    "You can't restore a version of a locked document.",
  "버전을 찾을 수 없어요.": "Couldn't find this version.",

  "mock::메모를 찾을 수 없어요.": "Couldn't find this note.",

  "이미 그래프 최신화를 진행하고 있어요.":
    "A graph refresh is already running.",

  "대화를 찾을 수 없어요.": "Couldn't find this conversation.",
  "응답 생성을 중단했어요.": "Stopped generating the response.",
} satisfies Messages;
