import type { Messages } from "../messages";
import { plural } from "./helpers";

export default {
  "작품 하나에\n작업공간 하나": "One story,\none workspace",
  "회차 원고와 설정 문서가 한 프로젝트에 함께 놓여요.":
    "Your chapters and setting documents sit together in one project.",
  "원고도\n여기서 써요": "Write chapters\nhere, too",
  "회차를 열면 이 창에서 바로 쓰고, 쓰는 대로 저장돼요.":
    "Open a chapter and write right in this window. It saves as you type.",
  "속성 표로\n문서를 이어요": "Link documents\nwith properties",
  "관련 원고와 장소, 조직을 고르면 그 관계가 그래프와 타임라인이 돼요.":
    "Pick related chapters, places and organizations, and those links become your graph and timeline.",
  "관계는\n그래프로": "See links\nas a graph",
  "문서를 고르면 바로 이어진 문서만 밝아져요.":
    "Select a document and only the ones directly linked to it light up.",
  "누가 몇 화에\n나오는지": "Who appears\nin which chapter",
  "회차를 열로, 인물과 장소를 행으로 놓고 등장한 회차를 막대로 그려요.":
    "Chapters run across as columns, characters and places down as rows, and bars mark where each one appears.",
  "새 회차를 쓰면\n그래프 최신화": "New chapter?\nRefresh the graph",
  "AI가 설정 문서에 바뀔 점을 찾고, 고르는 건 작가예요. 원고는 고치지 않아요.":
    "AI finds what should change in your setting documents, and you decide what to keep. Your manuscript stays untouched.",
  "작가명을\n정해 주세요": "Choose your\npen name",
  "프로젝트 목록과 작업공간에 보이는 이름이에요.":
    "This name appears in your project list and workspace.",
  "어디서\n시작할까요?": "Where would you\nlike to start?",

  "예시 프로젝트를 만들지 못했어요. 잠시 뒤 다시 시도하거나 새 프로젝트로 시작해 주세요.":
    "Couldn't create the sample project. Try again in a moment, or start with a new project.",
  "온보딩::서버에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요.":
    "Couldn't reach the server. Check your connection and try again.",
  "안내를 마치지 못했어요. 다시 시도해 주세요.":
    "Couldn't finish onboarding. Please try again.",
  "예시 프로젝트 둘러보기": "Explore the sample project",
  "‘유리 정원의 기록’으로 직접 눌러 봐요.":
    "Click around “The Glass Garden Records” yourself.",
  "온보딩::새 프로젝트 만들기": "Create a new project",
  "제목만 정하면 바로 시작해요.": "Just give it a title and start writing.",
  "사용 가이드로 돌아가기": "Back to the guide",
  "나중에 할게요": "Maybe later",
  "작가명을 입력해 주세요.": "Enter a pen name.",
  "작가명을 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요.":
    "Couldn't save your pen name. Check your connection and try again.",
  "온보딩::건너뛰기": "Skip",
  "안내 진행": "Onboarding progress",
  "온보딩::{step}단계 {title}": "Step {step}: {title}",
  "온보딩::작가명": "Pen name",
  "이 이름으로 계속": "Continue with this name",
  "온보딩::시작하기": "Get started",
  "시작 방법 고르기": "Choose how to start",

  "원고는 여기서 써요": "Write your chapters here",
  "쓰는 대로 저장되고, 저장 상태와 글자 수는 위 도구 줄에 보여요.":
    "Your writing saves as you type. The save status and character count are in the toolbar above.",
  "원고를 만들면 이 창에서 바로 쓰고, 쓰는 대로 저장돼요.":
    "Create a chapter to write right in this window. It saves as you type.",
  "속성 표로 문서를 이어요": "Link documents in the property table",
  "관련 원고와 인물, 장소를 고르면 그 관계가 그래프와 타임라인이 돼요.":
    "Pick related chapters, characters and places, and those links become your graph and timeline.",
  "캐릭터나 장소 문서를 만들면 속성 표에서 관련 원고와 인물을 이을 수 있어요.":
    "Create a character or place document, then link related chapters and characters in its property table.",
  "새 회차를 쓴 다음엔": "After you write a new chapter",
  "그래프 최신화를 누르면 AI가 설정 문서에 바뀔 점을 찾아요. 받을지는 작가가 골라요.":
    "Click Graph refresh and AI finds what should change in your setting documents. You choose what to accept.",
  "회차별 등장은 타임라인에서": "Track appearances in the timeline",
  "누가 몇 화에 나왔는지 회차 순서대로 한눈에 봐요.":
    "See at a glance who appeared in which chapter, in chapter order.",
  "투어::{total}단계 중 {step}단계": "Step {step} of {total}",
  "투어::건너뛰기": "Skip",
  "투어::완료": "Done",

  "무대::유리 정원의 기록": "The Glass Garden Records",
  "무대::레나 아르벨": "Lena Arbel",
  "무대::서윤": "Seoyun",
  "무대::하린": "Harin",
  "무대::노아 크레인": "Noah Crane",
  "무대::유리 마법": "Glass Magic",
  "무대::기억 항로": "Memory Routes",
  "무대::북쪽 온실": "North Greenhouse",
  "무대::유리 산맥": "Glass Mountains",
  "무대::은빛 항해단": "Silver Voyagers",
  "무대::등대 수호회": "Lighthouse Keepers",
  "무대::낡은 열쇠": "Old Key",
  "무대::각성": "Awakening",
  "무대::Episode 1. 유리의 계절": "Episode 1. Season of Glass",
  "무대::Episode 2. 북쪽 문": "Episode 2. The North Door",
  "무대::Episode 3. 기억 항로": "Episode 3. Memory Routes",
  "무대::Episode 4. 새 원고": "Episode 4. New Chapters",
  "무대::1화 · 첫 번째 온실": "Ch. 1 · The First Greenhouse",
  "무대::2화 · 빛의 순찰": "Ch. 2 · Light Patrol",
  "무대::3화 · 금 간 렌즈": "Ch. 3 · The Cracked Lens",
  "무대::6화 · 항해 일지": "Ch. 6 · The Logbook",
  "무대::11화 · 유리 정원": "Ch. 11 · The Glass Garden",
  "무대::12화 · 균열의 밤": "Ch. 12 · Night of the Fracture",
  "무대::기억 항로를 읽어 내는 은빛 항해단의 항해사":
    "A Silver Voyagers navigator who reads the Memory Routes",
  "무대::북쪽 문 너머에서 돌아온 은빛 항해단의 항해사":
    "A Silver Voyagers navigator who came back from beyond the North Door",
  "무대::유리 산맥, 북쪽 온실": "Glass Mountains, North Greenhouse",
  "무대::레나는 타인의 기억이 남긴 방향을 감각으로 읽는다.":
    "Lena reads by feel the directions that other people's memories leave behind.",
  "무대::짙은 안개 속에서도 그는 한 번도 길을 잃지 않았다.":
    "Even in the thickest fog, she has never once lost her way.",
  "무대::은빛 항해단은 그를 마지막 항해사라 불렀다.":
    "The Silver Voyagers called her the last navigator.",
  "무대::유리 정원의 종이 세 번 울렸다. 밤새 금이 간 천장 너머로 별빛이 새어 들었고, 하린은 등불을 낮춘 채 북쪽 회랑을 걸었다.":
    "The bell of the Glass Garden rang three times. Starlight seeped in through the ceiling that had cracked in the night, and Harin walked the north corridor with her lantern lowered.",
  "무대::유리 정원의 종이 세 번 울렸다. 밤새 금이 간 천장 너머로 별빛이 새어 들었다.":
    "The bell of the Glass Garden rang three times. Starlight seeped in through the ceiling that had cracked in the night.",
  "무대::기록단의 지도에는 그 문이 없었다. 다만 6화의 항해 일지 끝에 누군가 연필로 적어 둔 한 줄이 있었을 뿐이다. 문은 기억하는 사람에게만 열린다.":
    "The door was not on the Recorders' map. There was only one line, penciled by someone at the end of the logbook in Chapter 6: the door opens only for those who remember.",
  "무대::안개가 걷히자 {name}은 북쪽 온실의 문 앞에 서 있었다.":
    "When the mist lifted, {name} was standing at the door of the North Greenhouse.",
  "무대::열쇠 복선 회수": "Pay off the key foreshadowing",
  "무대::6화 항해 일지의 낡은 열쇠를 여기서 쓴다. 문장은 은빛 항해단.":
    "Use the Old Key from the Ch. 6 logbook here. Crest: Silver Voyagers.",
  "무대::13화로 넘길 것": "Save for Ch. 13",
  "무대::온실 안에서 들리는 목소리의 정체는 아직 밝히지 않는다.":
    "Don't reveal yet whose voice is heard inside the greenhouse.",

  "무대::그래프": "Graph",
  "무대::타임라인": "Timeline",
  "무대::메모": "Notes",
  "무대::그래프 최신화": "Graph refresh",
  "무대::그래프 추출 중…": "Extracting graph…",
  "무대::변경 사항 반영": "Apply changes",
  "무대::즐겨찾기": "Favorites",
  "무대::파일": "Files",
  "무대::휴지통": "Trash",
  "무대::설정": "Settings",
  "무대::도움말": "Help",
  "무대::새 탭": "New tab",
  "무대::18분 전": "18 min ago",
  "무대::{count}시간 전": "{count} hr ago",
  "무대::이어서 작업하기": "Continue writing",
  "무대::새로 만들기": "Create new",
  "무대::최근에 연 파일": "Recently opened",
  "무대::자동 저장됨": "Saved",
  "무대::분류": "Category",
  "무대::설명": "Description",
  "무대::속성 추가": "Add property",
  "무대::에피소드": "Episode",
  "무대::전체": "All",
  "무대::화면 맞춤": "Fit to screen",
  "무대::{number}화": "Ch. {number}",
  "무대::변경 사항": "Changes",
  "무대::문서 {count}개": plural("{count} document", "{count} documents"),
  "무대::현재 버전 전체 반영": "Accept all current",
  "무대::신규 버전 전체 반영": "Accept all new",
  "무대::<b>변경 {changed}</b> 확정 {resolved}":
    "<b>{changed} changed</b> · {resolved} confirmed",
  "무대::수정": "Modified",
  "무대::현재 버전": "Current version",
  "무대::신규 버전": "New version",
  "무대::1,284자": "1,284 characters",
  "무대::문서": "Document",
  "무대::작품": "Project",
} satisfies Messages;
