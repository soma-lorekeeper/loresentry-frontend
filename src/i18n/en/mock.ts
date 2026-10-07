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
  "mock::분류": "Kind",
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
  "반영할 변경 사항이 없어요.": "There are no changes to apply.",
  "아직 결정하지 않은 변경이 있어요.": "Some changes haven't been decided yet.",
  "‘{title}’이 추출 뒤에 수정됐어요. 그래프를 다시 최신화해 주세요.":
    "“{title}” was edited after extraction. Refresh the graph again.",

  "새 채팅": "New chat",
  "세션 이름을 입력해 주세요.": "Enter a session name.",
  "대화를 찾을 수 없어요.": "Couldn't find this conversation.",
  "응답 생성을 중단했어요.": "Stopped generating the response.",
  "장면의 목적을 한 문장으로 먼저 정해 보세요. 그 문장에서 벗어나는 묘사를 덜어 내면 긴장이 한곳에 모입니다.":
    "Start by stating the purpose of the scene in one sentence. Trim the description that strays from that sentence, and the tension gathers in one place.",
  "인물이 무엇을 원하고 무엇이 그것을 막는지 대사보다 행동으로 먼저 보여 주면 좋겠습니다. 마지막 문장은 다음 장면의 질문으로 남겨 두세요.":
    "Show what the character wants and what stands in the way through action before dialogue. Leave the last sentence as a question for the next scene.",
  "지금 열린 문서의 설정과 겹치는 표현이 있어요. 같은 사물을 부르는 이름을 하나로 맞추면 독자가 덜 헷갈립니다.":
    "Some wording overlaps with the settings in the open document. Using one name for the same thing makes it easier for readers to follow.",
} satisfies Messages;
