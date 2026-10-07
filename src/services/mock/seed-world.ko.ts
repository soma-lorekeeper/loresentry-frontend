// i18n-exempt-file: Korean story data of the mock sample world; the English build uses seed-world.en.ts.
import type {
  MockSeed,
  SeedChapter,
  SeedEntity,
  SeedEpisode,
  SeedOtherProject,
  SeedTrashedProject,
} from "./seed-types";
import type { SettingDocumentType } from "@/domain/document-types";

const chapter = (
  number: number,
  subtitle: string,
  description: string,
  body?: string,
): SeedChapter => ({
  key: `ch-${number}`,
  number,
  title: `${number}화 · ${subtitle}`,
  description,
  body,
});

const EPISODES: SeedEpisode[] = [
  {
    key: "ep-1",
    title: "Episode 1. 유리의 계절",
    chapters: [
      chapter(1, "첫 번째 온실", "서윤이 정원 기록단에 들어오는 날"),
      chapter(2, "빛의 순찰", "처음으로 밤 순찰을 도는 서윤"),
      chapter(3, "금 간 렌즈", "렌즈에 남은 기억의 흔적을 발견한다"),
    ],
  },
  {
    key: "ep-2",
    title: "Episode 2. 북쪽 문",
    chapters: [
      chapter(4, "잠긴 문", "북쪽 온실의 문이 오래 잠겨 있던 이유"),
      chapter(5, "등대의 침묵", "라벤더 항구의 등대가 꺼진다"),
      chapter(6, "항해 일지", "레나가 남긴 항해 일지를 찾는다"),
      chapter(7, "유리 산맥", "기록단이 유리 산맥으로 향한다"),
    ],
  },
  {
    key: "ep-3",
    title: "Episode 3. 기억 항로",
    chapters: [
      chapter(8, "은빛 항구", "은빛 항해단과 처음 마주친다"),
      chapter(9, "각성", "서윤이 기억의 방향을 처음 읽어 낸다"),
      chapter(10, "파편 나침반", "나침반이 가리키는 곳"),
      chapter(
        11,
        "유리 정원",
        "정원에 모인 사람들의 첫 합의",
        "유리 정원에 아침이 들면 밤새 맺힌 이슬이 작은 렌즈처럼 빛을 모았다. 서윤은 가장 먼저 깨어난 빛을 따라 중앙 온실로 걸었다.\n\n하린은 이미 그곳에 와 있었다. 둘은 말없이 금이 간 창을 올려다보았다. 균열은 어젯밤보다 한 뼘 더 자라 있었다.",
      ),
    ],
  },
  {
    key: "ep-4",
    title: "Episode 4. 새 원고",
    chapters: [
      chapter(
        12,
        "균열의 밤",
        "온실에서 균열이 처음 드러나는 밤",
        "정원은 밤이 오면 유리보다 먼저 숨을 죽였다. 달빛이 온실의 지붕을 훑고 지나갈 때마다, 금이 간 창마다 은빛 선이 번졌다. 서윤은 그 선들이 모두 한곳을 가리키고 있다는 사실을 세 번째 순찰에서야 알아차렸다.\n\n오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다. 안으로 들어간 흔적은 있었지만 돌아 나온 흔적은 없었다. 손잡이에 손을 얹자 차가운 진동이 손목을 타고 올라왔다. 어젯밤 메모에 적어 둔 문장이 떠올랐다. ‘균열은 문이 아니라 기억의 방향이다.’\n\n서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다. 어둠 너머에서 익숙한 목소리가 이름을 불렀다. 아주 오래전, 이 정원을 떠난 사람이 마지막으로 불렀던 방식 그대로였다.",
      ),
      chapter(13, "돌아온 목소리", "문 너머의 목소리가 누구인지 밝혀진다"),
      chapter(14, "축제의 정전", "축제 다음 날 도시 전체가 멈춘다"),
    ],
  },
];

const SETTINGS: Record<SettingDocumentType, SeedEntity[]> = {
  character: [
    {
      key: "c-seoyun",
      title: "서윤",
      description: "정원 기록단의 막내 기록관",
      body: "서윤은 정원 기록단에 가장 늦게 들어온 기록관이다.\n밤 순찰을 맡으면서 유리에 남은 빛의 방향을 읽기 시작했다.\n\n말수가 적지만 한 번 적은 문장은 끝까지 지킨다.",
    },
    {
      key: "c-lena",
      title: "레나 아르벨",
      description: "타인의 기억이 남긴 방향을 감각으로 읽는 항해사",
      body: "레나는 타인의 기억이 남긴 방향을 감각으로 읽는다.\n짙은 안개 속에서도 그는 한 번도 길을 잃지 않았다.\n은빛 항해단은 그를 마지막 항해사라 불렀다.\n유리 산맥에서 처음 각성한 뒤로 그 이름이 붙었다.\n스스로는 그 호칭을 쓰지 않는다.\n기억을 읽는 일은 언제나 대가를 요구한다.\n읽은 기억의 일부는 그의 것이 되어 남는다.",
    },
    {
      key: "c-harin",
      title: "하린",
      description: "북쪽 온실을 관리하는 정원사",
    },
    { key: "c-kairon", title: "카이론", description: "남부 출신의 검술가" },
    {
      key: "c-ethan",
      title: "에단 벨",
      description: "등대 수호회의 마지막 등대지기",
    },
    { key: "c-mira", title: "미라 온", description: "유리 조합의 장인" },
    {
      key: "c-noah",
      title: "노아 크레인",
      description: "기억 항로를 지도로 옮기는 지도 제작자",
    },
    {
      key: "c-teo",
      title: "테오",
      description: "정원을 떠났다가 돌아온 사람",
    },
  ],
  place: [
    {
      key: "p-north",
      title: "북쪽 온실",
      description: "오래 잠겨 있던 정원의 북쪽 끝",
    },
    {
      key: "p-garden",
      title: "유리 정원",
      description: "왕도 북쪽의 유리 정원",
    },
    {
      key: "p-range",
      title: "유리 산맥",
      description: "대륙 중앙에 솟은 유리 능선",
    },
    {
      key: "p-harbor",
      title: "은빛 항구",
      description: "기억 항로가 모이는 항구 도시",
    },
    {
      key: "p-lavender",
      title: "라벤더 항구",
      description: "유리 등대가 밤마다 북쪽 항로를 밝히는 항구",
    },
    {
      key: "p-capital",
      title: "왕도",
      description: "정원 기록단의 본부가 있는 도시",
    },
  ],
  organization: [
    {
      key: "o-fleet",
      title: "은빛 항해단",
      description: "안전한 기억 항로를 확보하려는 항해 조직",
    },
    {
      key: "o-archive",
      title: "정원 기록단",
      description: "정원의 빛과 균열을 기록하는 사람들",
    },
    {
      key: "o-lighthouse",
      title: "등대 수호회",
      description: "꺼져 가는 등대를 지키는 모임",
    },
    {
      key: "o-guild",
      title: "유리 조합",
      description: "유리 렌즈를 다루는 장인 조합",
    },
  ],
  item: [
    {
      key: "i-lantern",
      title: "은빛 등불",
      description: "기억의 빛을 비추는 등불",
    },
    {
      key: "i-compass",
      title: "파편 나침반",
      description: "기억의 흔적을 가리키는 항해 도구",
    },
    { key: "i-key", title: "낡은 열쇠", description: "북쪽 문을 여는 열쇠" },
    {
      key: "i-bottle",
      title: "기억 유리병",
      description: "한 사람의 기억을 담아 두는 병",
    },
    {
      key: "i-log",
      title: "항해 일지",
      description: "레나가 남긴 항해 기록",
    },
    {
      key: "i-lens",
      title: "금 간 렌즈",
      description: "빛의 방향을 비틀어 보여 주는 렌즈",
    },
  ],
  event: [
    {
      key: "e-crack",
      title: "균열의 밤",
      description: "온실에 처음 균열이 드러난 밤",
    },
    {
      key: "e-awaken",
      title: "각성",
      description: "잃어버린 기억의 방향을 처음 읽어 낸 밤",
    },
    {
      key: "e-silence",
      title: "등대의 침묵",
      description: "라벤더 항구의 등대가 꺼진 사건",
    },
    {
      key: "e-door",
      title: "북쪽 문 개방",
      description: "잠겨 있던 북쪽 문이 열린다",
    },
    { key: "e-patrol", title: "첫 순찰", description: "서윤의 첫 밤 순찰" },
    {
      key: "e-lost",
      title: "항로 소실",
      description: "기억 항로 하나가 지도에서 사라진다",
    },
    {
      key: "e-founding",
      title: "기록단 결성",
      description: "정원 기록단이 만들어진 날",
    },
    {
      key: "e-collapse",
      title: "유리 산맥 붕괴",
      description: "능선 일부가 무너진 사건",
    },
    {
      key: "e-blackout",
      title: "축제의 정전",
      description: "축제 다음 날 도시가 멈춘다",
    },
    {
      key: "e-return",
      title: "귀환",
      description: "떠났던 사람이 정원으로 돌아온다",
    },
  ],
  worldview: [
    {
      key: "w-law",
      title: "균열의 법칙",
      description: "균열은 문이 아니라 기억의 방향이다",
    },
    {
      key: "w-route",
      title: "기억 항로",
      description: "기억이 항로가 되는 세계의 규칙",
    },
    {
      key: "w-scent",
      title: "진향",
      description: "인물마다 잔향을 감지하는 방식",
    },
    {
      key: "w-glass",
      title: "유리 마법",
      description: "빛을 유리에 가두는 기술",
    },
  ],
};

const OTHER_PROJECTS: SeedOtherProject[] = [
  {
    id: "starlight-promise",
    title: "별빛 아래 마지막 약속 — 장편 3부작",
    icon: "sparkles",
    description:
      "세 세대에 걸친 약속이 마지막 밤에 풀리는 장편. 1부 별의 계약, 2부 돌아오지 않는 밤, 3부 새벽의 증인으로 나누어 쓰고 있다.",
    lastFileTitle: "제17장_돌아오지_않는_밤",
    lastWorkedMinutesAgo: 12,
    lastFileType: "manuscript",
  },
  {
    id: "moonlight-library",
    title: "달빛 도서관 연대기",
    icon: "library",
    description:
      "밤에만 문을 여는 도서관의 사서들이 금지된 서가를 지키는 이야기",
    lastFileTitle: "2부_금지된_서가",
    lastWorkedMinutesAgo: 60 * 24,
    lastFileType: "manuscript",
  },
  {
    id: "orbit-people",
    title: "주변 궤도의 사람들",
    icon: "orbit",
    description: "",
    lastFileTitle: "에필로그_보통의_중력",
    lastWorkedMinutesAgo: 60 * 24 * 21,
    lastFileType: "manuscript",
  },
  {
    id: "sleeping-city",
    title: "비 아래 잠든 도시의 아주 긴 이야기",
    icon: "cloud-rain",
    description: "비가 그치지 않는 도시에서 잠든 사람들을 깨우는 아이의 여정",
    lastFileTitle: "초고_제3막_도시가_눈을_뜨는_밤",
    lastWorkedMinutesAgo: 60 * 24 * 28,
    lastFileType: "manuscript",
  },
  {
    id: "nameless-notes",
    title: "이름 없는 세계관 노트",
    icon: "notebook-tabs",
    description: "",
    lastFileTitle: "인물_관계_정리",
    lastWorkedMinutesAgo: 60 * 24 * 46,
    lastFileType: "worldview",
  },
];

const TRASHED_PROJECTS: SeedTrashedProject[] = [
  {
    id: "starlight-draft",
    title: "별빛 아래 마지막 약속",
    icon: "book-open",
    trashedDaysAgo: 19,
  },
  {
    id: "glass-sea",
    title: "유리 바다의 지도",
    icon: "book-open",
    trashedDaysAgo: 23,
  },
  {
    id: "winter-station",
    title: "겨울 정거장의 편지",
    icon: "book-open",
    trashedDaysAgo: 31,
  },
];

export const KO_SEED: MockSeed = {
  terms: {
    title: "Lore Sentry 서비스 이용약관",
    content:
      "화면 개발용 테스트 약관입니다.\n작성한 소설의 권리는 사용자에게 있습니다.\n운영 동의에는 서버에서 제공하는 확정 원문을 사용합니다.",
  },
  account: { displayName: "서윤주" },
  project: {
    title: "유리 정원의 기록",
    description: "빛이 지난 자리에 남는 기억을 기록하는 사람들의 이야기",
  },
  episodes: EPISODES,
  settings: SETTINGS,
  draftBody: (description) =>
    `${description}.\n\n이 회차의 초고는 아직 비어 있다. 장면의 순서와 인물의 동선만 메모로 남겨 두었다.`,
  settingBody: (description) => `${description}.`,
  trash: {
    prologue: {
      title: "옛 프롤로그",
      body: "정원이 생기기 전의 이야기.",
      description: "초기 구상의 프롤로그",
    },
    folderTitle: "보류한 설정",
    lighthouse: {
      title: "사라진 등대",
      body: "지도에서 지워진 등대.",
      description: "초기 설정에만 있던 등대",
    },
  },
  projectMemos: [
    {
      title: "균열의 방향",
      body: "균열은 문이 아니라 기억의 방향이다. 다음 장면에서 유리 조각의 의미를 다시 연결한다.",
    },
    {
      title: "북쪽 온실",
      body: "서윤과 하린이 처음 마주치는 장소는 북쪽 온실. 빛이 유리 벽을 통과하는 시간을 확인한다.",
    },
    {
      title: "진향 용어",
      body: "세계관 용어는 ‘진향’으로 통일한다. 인물마다 잔향을 감지하는 방식이 다르다.",
    },
    {
      title: "사건 순서",
      body: "후반부 사건 순서를 다시 검토한다. 축제 다음 날에 정전이 발생하도록 조정.",
    },
    {
      title: "표지 문구",
      body: "표지 후보 문구: 기억은 언제나 빛이 지난 자리에 남는다.",
    },
  ],
  fileMemos: {
    chapter:
      "손잡이 진동 묘사는 한 번만 사용한다. ‘균열’이라는 단어는 마지막 문장까지 아껴 두기.",
    lena: "레나의 말투는 항해 용어를 섞되 설명하지 않는다.",
  },
  lenaHistory: {
    earlierPhrase: {
      now: "한 번도 길을 잃지 않았다",
      before: "길을 잃지 않았다",
    },
    versionDescriptions: [
      "타인의 기억이 남긴 방향을 감각으로 읽는 항해사",
      "타인의 기억이 남긴 방향을 감각으로 읽는 항해사",
      "은빛 항해단의 항해사",
      "항해사",
    ],
    currentDescription: "기억 항로를 읽어 내는 은빛 항해단의 항해사",
  },
  chat: {
    sessions: {
      crack: "균열 장면 다듬기",
      lena: "레나 설정 정리",
      title: "12화 제목 후보",
    },
    question: "문이 열리기 직전 장면의 긴장감을 더 높일 방법을 알려줘.",
    answer:
      "문을 열기 전에 세 가지 감각을 짧게 쌓아 보세요. 손잡이의 진동, 등불이 흔들리는 소리, 그리고 문 너머의 목소리를 한 문장씩 좁혀 가면 독자가 서윤의 망설임을 함께 느낄 수 있습니다.",
  },
  otherProjects: OTHER_PROJECTS,
  trashedProjects: TRASHED_PROJECTS,
  refresh: {
    harinDescription: "북쪽 온실의 문이 열린 뒤 기록단에 합류한 정원사",
    harinBodyAddition:
      "13화에서 문 너머의 목소리를 가장 먼저 알아본다.\n그 뒤로 북쪽 온실의 열쇠를 서윤에게 맡긴다.",
    newPlace: {
      title: "잿빛 등대",
      body: "13화에서 처음 언급된 등대. 불이 꺼진 뒤에도 재가 빛을 머금고 있다.",
      description: "13화에 처음 등장한 꺼진 등대",
    },
    seoyunDescription: "정원 기록단의 막내 기록관이자 북쪽 문의 첫 방문자",
  },
};
