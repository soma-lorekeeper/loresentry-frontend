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

const CHAT_DOOR =
  "본문이 있는 가장 최근 회차는 12화예요. 서윤이 북쪽 문을 밀자 **어둠 너머에서 익숙한 목소리가 그의 이름을 불러요.** [[doc:12화 · 균열의 밤|어둠 너머에서 익숙한 목소리가 이름을 불렀다.]] 아주 오래전 정원을 떠난 사람이 마지막으로 불렀던 방식 그대로였다고 적혀 있어요.\n목소리의 주인은 12화에서 밝히지 않아요. 다음 회차 [[doc:13화 · 돌아온 목소리]]가 정체를 다루고, 설정 문서 가운데서는 [[doc:테오|정원을 떠났다가 돌아온 사람]]가 가장 가까워요.\n- 문 앞 발자국은 하나뿐이고, 들어간 흔적만 있고 돌아 나온 흔적은 없어요. [[doc:12화 · 균열의 밤|안으로 들어간 흔적은 있었지만 돌아 나온 흔적은 없었다.]]\n- 문을 밀기 직전 서윤이 떠올린 문장은 프로젝트 메모에도 적어 두셨어요. [[memo:균열의 방향|균열은 문이 아니라 기억의 방향이다.]]";

const CHAT_LENA =
  "주요 인물 가운데 [[doc:레나 아르벨]]에 이어 둔 문서가 가장 많아요. 속성 표에서 다섯 개가 이어져 있어요.\n- **조직** [[doc:은빛 항해단|마지막 항해사]] 항해단은 레나를 ‘마지막 항해사’라 불러요.\n- **장소** [[doc:유리 산맥|처음 각성한 곳]] 레나가 처음 각성한 곳이에요.\n- **이벤트** [[doc:각성|각성한 당사자]] 레나가 이 사건의 당사자예요.\n- **원고** [[doc:11화 · 유리 정원|첫 등장]]에서 처음 나오고, [[doc:12화 · 균열의 밤|북쪽 온실에 도착]]에서 북쪽 온실에 닿아요.\n설정 본문에는 기억을 읽을 때마다 대가를 치른다고 적혀 있지만, 그 대가가 원고에 나온 회차는 아직 없어요. [[doc:레나 아르벨|기억을 읽는 일은 언제나 대가를 요구한다.]]";

const CHAT_OPEN =
  "본문이 있는 회차 가운데서는 **12화에서 북쪽 문 손잡이를 잡는 순간**이 처음이에요. [[doc:12화 · 균열의 밤|손잡이에 손을 얹자 차가운 진동이 손목을 타고 올라왔다.]]\n그때까지 서윤은 세 번의 순찰 내내 균열을 지켜보는 기록관으로만 그려져요. 이 장면에서 처음 망설이고, 등불을 바닥에 내려놓은 뒤 ‘천천히’ 문을 미는 동작이 그 망설임을 보여 줘요.\n조금 더 이른 후보도 있어요. 11화에서 하린과 금 간 창을 올려다보는 장면은 말이 없어서, 흔들림보다는 불안의 예고에 가까워요. [[doc:11화 · 유리 정원|둘은 말없이 금이 간 창을 올려다보았다.]]\n1–8화와 10화는 본문이 비어 있어서 판단에서 뺐어요. 그 회차를 쓰시면 다시 물어봐 주세요.";

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
      chapter(
        9,
        "각성",
        "서윤이 기억의 방향을 처음 읽어 낸다",
        "다섯 번째 순찰을 마친 새벽이었다. 서윤은 유리에 남은 빛을 따라 걷다가, 그 빛이 누군가의 기억이 남긴 방향이라는 것을 처음으로 알아차렸다.\n\n방향은 언제나 북쪽 온실을 가리켰다.",
      ),
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
        "정원은 밤이 오면 유리보다 먼저 숨을 죽였다. 달빛이 온실의 지붕을 훑고 지나갈 때마다, 금이 간 창마다 은빛 선이 번졌다. 서윤은 그 선들이 모두 한곳을 가리키고 있다는 사실을 세 번째 순찰에서야 알아차렸다.\n\n오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다. 안으로 들어간 흔적은 있었지만 돌아 나온 흔적은 없었다. 손잡이에 손을 얹자 차가운 진동이 손목을 타고 올라왔다. 어젯밤 메모에 적어 둔 문장이 떠올랐다. ‘균열은 문이 아니라 기억의 방향이다.’\n\n서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다. 어둠 너머에서 익숙한 목소리가 이름을 불렀다. 아주 오래전, 이 정원을 떠난 사람이 마지막으로 불렀던 방식 그대로였다.\n\n목소리는 한 번 더 들리지 않았다. 대신 문 안쪽의 공기가 바깥보다 따뜻했다. 누군가 방금까지 이곳에 있었던 것처럼, 바닥의 먼지에는 둥근 자국이 남아 있었다.\n\n서윤은 문턱을 넘지 않았다. 기록관의 일은 보는 것이지 들어가는 것이 아니었다. 그녀는 수첩을 펴고, 문이 열린 시각과 목소리가 들린 방향을 적었다.\n\n등불의 심지가 짧게 떨렸다. 바람은 없었다. 유리 지붕 너머로 구름이 달을 반쯤 가렸다가 다시 놓아주었다.\n\n“거기 누구 있어요?” 서윤의 목소리는 생각보다 작게 나왔다. 대답 대신 안쪽 어딘가에서 물방울 떨어지는 소리가 이어졌다.\n\n그때 뒤에서 유리가 깨지는 소리가 났다. 카이론이 금이 간 창에 손바닥을 대고, 튀어나온 조각을 도로 밀어 넣고 있었다. “이대로 두면 아침까지 못 버텨.”\n\n손바닥에서 피가 한 줄 흘러내렸지만 그는 개의치 않았다. 남부에서 온 검술가에게 유리 몇 조각은 대수롭지 않은 상처였다.\n\n“기록단을 불러야 해요.” 서윤이 말했다. 카이론은 고개를 저었다. “불러도 오기 전에 무너질 거야.”\n\n둘은 잠시 말없이 창을 올려다보았다. 은빛 선은 아까보다 더 촘촘해져, 이제는 거미줄처럼 지붕 전체를 덮고 있었다.\n\n서윤은 수첩의 앞장을 넘겼다. 세 번의 순찰 동안 적어 둔 메모가 빼곡했다. 균열이 처음 보인 날, 은빛 선이 번진 방향, 그리고 매번 북쪽을 가리키던 빛.\n\n메모를 따라가면 하나의 결론에 닿았다. 균열은 정원 바깥에서 들어온 것이 아니라, 북쪽 온실 안쪽에서부터 퍼져 나온 것이었다.\n\n“안에 뭐가 있는지 알아야 해.” 카이론이 말했다. 서윤은 대답하지 않고 등불을 다시 들었다. 빛이 닿는 곳마다 은빛 선이 한 방향으로 모였다.\n\n그 방향 끝에서 무언가가 반짝였다. 손바닥만 한 유리병이었다. 병 안에는 연기처럼 흐린 빛이 갇혀 있었다.\n\n서윤이 병을 집어 들자 빛이 병벽에 부딪히며 희미한 소리를 냈다. 아까 이름을 부르던 목소리와 같은 높이였다.\n\n“기억 유리병이야.” 카이론이 낮게 말했다. “누군가 자기 기억을 여기 두고 갔어.”\n\n서윤은 병을 품에 넣었다. 기록관은 기록을 남기는 사람이지 기억을 가져가는 사람이 아니었지만, 이것만은 두고 갈 수 없었다.\n\n둘이 문 밖으로 물러서자 문은 소리 없이 닫혔다. 서윤이 손잡이를 다시 잡기도 전에, 문은 저절로 열렸다.\n\n이번에는 안쪽에서 아무 소리도 들리지 않았다. 열린 문틈으로 새벽의 첫 빛이 스며들었다.\n\n정원의 종이 다섯 번 울렸다. 곧 하린이 이슬을 닦으러 올 시간이었다.\n\n서윤은 수첩을 덮었다. 오늘 밤의 기록은 여기까지였다.",
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
      body: "하린은 북쪽 온실을 맡은 정원사다.\n\n하린은 매일 새벽 북쪽 온실을 돈다. 손에는 늘 젖은 천이 들려 있다.",
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
      body: "북쪽 문은 낡은 열쇠 없이는 열리지 않는다. 열쇠는 기록단 결성 이후 한 번도 정원 안에 들어온 적이 없다.\n\n하린은 매일 새벽 온실 둘레를 돌며 유리에 맺힌 이슬을 닦는다. 문 앞까지는 다가가지 않는다.\n\n온실의 유리는 정원 기록단만 손볼 수 있다.",
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
    {
      key: "i-key",
      title: "낡은 열쇠",
      description: "북쪽 문을 여는 열쇠",
      body: "낡은 열쇠는 기록단 결성 이후 한 번도 정원 안에 들어온 적이 없다.\n\n열쇠의 행방은 기록단장만 안다.",
    },
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
    description:
      "세 세대에 걸친 약속이 마지막 밤에 풀리는 장편. 1부 별의 계약, 2부 돌아오지 않는 밤, 3부 새벽의 증인으로 나누어 쓰고 있다.",
    lastFileTitle: "제17장_돌아오지_않는_밤",
    lastWorkedMinutesAgo: 12,
    lastFileType: "manuscript",
  },
  {
    id: "moonlight-library",
    title: "달빛 도서관 연대기",
    description:
      "밤에만 문을 여는 도서관의 사서들이 금지된 서가를 지키는 이야기",
    lastFileTitle: "2부_금지된_서가",
    lastWorkedMinutesAgo: 60 * 24,
    lastFileType: "manuscript",
  },
  {
    id: "orbit-people",
    title: "주변 궤도의 사람들",
    description: "",
    lastFileTitle: "에필로그_보통의_중력",
    lastWorkedMinutesAgo: 60 * 24 * 21,
    lastFileType: "manuscript",
  },
  {
    id: "sleeping-city",
    title: "비 아래 잠든 도시의 아주 긴 이야기",
    description: "비가 그치지 않는 도시에서 잠든 사람들을 깨우는 아이의 여정",
    lastFileTitle: "초고_제3막_도시가_눈을_뜨는_밤",
    lastWorkedMinutesAgo: 60 * 24 * 28,
    lastFileType: "manuscript",
  },
  {
    id: "nameless-notes",
    title: "이름 없는 세계관 노트",
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
    trashedDaysAgo: 19,
  },
  {
    id: "glass-sea",
    title: "유리 바다의 지도",
    trashedDaysAgo: 23,
  },
  {
    id: "winter-station",
    title: "겨울 정거장의 편지",
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
    sessions: [
      {
        key: "chat-door",
        title: "북쪽 문 장면 확인",
        minutesAgo: 120,
        question: "북쪽 문을 연 뒤 서윤은 무엇을 들었어?",
        answer: CHAT_DOOR,
      },
      {
        key: "chat-lena",
        title: "레나 설정 정리",
        minutesAgo: 60 * 26,
        question: "레나와 연결된 설정을 정리해 줘",
        answer: CHAT_LENA,
      },
      {
        key: "chat-title",
        title: "12화 제목 후보",
        minutesAgo: 60 * 24 * 4,
        question: "12화 제목을 몇 개 더 떠올려 줘",
        answer:
          "지금 제목 「균열의 밤」은 사건 문서 이름과 같아요. [[doc:균열의 밤]] 회차 제목으로 구분하고 싶다면 이런 후보가 있어요.\n- 한 사람의 발자국\n- 돌아 나오지 않은 흔적\n- 기억의 방향",
      },
    ],
    scripts: [
      { keywords: ["레나", "연결된 설정", "주요 인물"], answer: CHAT_LENA },
      { keywords: ["흔들", "무너"], answer: CHAT_OPEN },
      { keywords: ["최근", "문", "목소리", "들었"], answer: CHAT_DOOR },
    ],
    quotedChapter: "12화 · 균열의 밤",
    quoted: {
      ask: "선택하신 문장은 12화의 마지막 문단에 있어요. {cite}\n**문 너머의 목소리는 이 회차에서 처음 나와요.** 원고 다른 곳에 같은 표현은 없고, 정체는 13화로 넘겨 둔 상태예요. 설정 문서 가운데 [[doc:테오|정원을 떠났다가 돌아온 사람]]가 ‘정원을 떠난 사람’이라는 표현과 가장 잘 맞아요.",
      explain:
        "이 부분은 서윤이 망설임을 끝내고 북쪽 문을 여는 순간이에요. {cite}\n- **누가**: 서윤이 혼자예요. 세 번의 순찰 끝에 균열이 한곳을 가리킨다는 걸 알아챈 뒤예요.\n- **무엇을**: 등불을 내려놓고 문을 밀어요. 열쇠 없이 연다는 점이 [[doc:낡은 열쇠|북쪽 문을 여는 열쇠]] 설정과 충돌하지 않는지 확인해 보세요.\n- **왜 중요한가**: 문 너머의 목소리가 13화의 사건으로 이어져요. [[doc:13화 · 돌아온 목소리]]",
      related:
        "선택하신 부분과 이어진 설정은 셋이에요. {cite}\n- [[doc:북쪽 온실|이야기의 무대]] 이 장면의 무대예요.\n- [[doc:낡은 열쇠|북쪽 문을 여는 열쇠]] 서윤은 열쇠 없이 문을 밀었어요. 열쇠를 누가 갖고 있는지는 원고에 아직 나오지 않아요.\n- [[doc:균열의 밤|온실에 처음 균열이 드러난 밤]] 같은 밤의 사건 문서예요.",
      flow: "이 문장은 12화의 전환점이에요. {cite}\n- 앞: 11화에서 서윤과 하린이 금 간 창을 말없이 올려다봐요. [[doc:11화 · 유리 정원|둘은 말없이 금이 간 창을 올려다보았다.]]\n- 뒤: 13화 「돌아온 목소리」가 문 너머 목소리의 정체를 다뤄요. 본문은 아직 비어 있어요. [[doc:13화 · 돌아온 목소리]]",
    },
    quotedOther:
      "선택하신 부분은 {title}에 있어요. {cite}\n예시 데이터로 도는 화면이라 12화 문장에 대해서만 자세히 답해요. [[doc:12화 · 균열의 밤]]을 열고 본문을 드래그해 보세요.",
    fallback:
      "원고와 설정, 메모를 모두 읽고 답하는 자리예요. 지금은 예시 데이터로 도는 화면이라 준비한 질문에만 실제처럼 답해요. 추천 질문을 누르거나, 원고 문장을 드래그해서 물어보세요.",
  },
  otherProjects: OTHER_PROJECTS,
  trashedProjects: TRASHED_PROJECTS,
  relationNotes: [
    { between: ["c-lena", "o-fleet"], note: "마지막 항해사" },
    { between: ["c-lena", "p-range"], note: "처음 각성한 곳" },
    { between: ["c-lena", "e-awaken"], note: "각성한 당사자" },
    { between: ["c-lena", "ch-11"], note: "첫 등장" },
    { between: ["c-lena", "ch-12"], note: "북쪽 온실에 도착" },
    { between: ["ch-12", "p-north"], note: "이야기의 무대" },
  ],
  settingCheck: {
    core: { "p-north": [0, 2], "w-law": [0], "i-key": [0] },
    chapter: "ch-12",
    findings: [
      {
        key: "door",
        kind: "SETTING",
        core: true,
        source: "p-north",
        explanation:
          "‘북쪽 온실’ 설정은 북쪽 문이 낡은 열쇠 없이는 열리지 않는다고 정해 두었어요. 그런데 12화에서 서윤은 등불을 내려놓고 빈손으로 문을 밀어요. 11화까지 서윤이 낡은 열쇠를 받거나 줍는 장면이 없어서, 이 문이 어떻게 열렸는지 원고 안에서 설명되지 않아요. 열쇠를 손에 넣는 장면이나 문이 다른 힘으로 열리는 까닭이 앞에 있어야 두 내용이 함께 성립해요.",
        quote: "서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다.",
        sourceQuote: "북쪽 문은 낡은 열쇠 없이는 열리지 않는다.",
        quoteFocus: "천천히 문을 밀었다",
        sourceFocus: "낡은 열쇠 없이는 열리지 않는다",
      },
      {
        key: "patrol",
        kind: "MANUSCRIPT",
        source: "ch-9",
        explanation:
          "9화는 서윤이 다섯 번째 순찰을 마친 새벽에 빛의 방향을 처음 알아차렸다고 적었어요. 12화는 선들이 모두 한곳을 가리킨다는 걸 세 번째 순찰에서야 알아차렸다고 해요. 두 장면이 같은 깨달음을 말한다면 순찰 횟수가 서로 맞지 않아요. 12화의 ‘세 번째 순찰’이 그날 밤에 돈 횟수라면 그렇다는 단서가 원고에 없어요.",
        quote:
          "서윤은 그 선들이 모두 한곳을 가리키고 있다는 사실을 세 번째 순찰에서야 알아차렸다.",
        sourceQuote: "다섯 번째 순찰을 마친 새벽이었다.",
        quoteFocus: "세 번째 순찰",
        sourceFocus: "다섯 번째 순찰",
      },
      {
        key: "harin",
        kind: "SETTING",
        confidence: "LOW",
        source: "c-harin",
        explanation:
          "‘하린’ 설정은 하린이 매일 새벽 북쪽 온실을 돈다고 정해 두었어요. 그런데 12화에서 오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이에요. 하린이 그날 새벽에도 온실을 돌았다면 문 앞에 하린의 발자국도 남았을 수 있어요. 다만 하린이 문 앞까지 다가가는지는 설정에 없어서 확실한 충돌은 아니에요.",
        quote: "오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다.",
        sourceQuote: "하린은 매일 새벽 북쪽 온실을 돈다.",
        quoteFocus: "발자국이 하나뿐이었다",
        sourceFocus: "매일 새벽 북쪽 온실을 돈다",
      },
      {
        key: "crack",
        kind: "MANUSCRIPT",
        source: "ch-11",
        explanation:
          "11화에서 서윤과 하린은 중앙 온실의 균열이 어젯밤보다 한 뼘 더 자란 것을 함께 봤어요. 그런데 12화는 금이 간 창마다 은빛 선이 번지는 장면을 균열이 처음 드러나는 것처럼 그려요. 11화의 균열과 같은 것인지, 밤사이 온실 전체로 번진 것인지 밝히는 문장이 12화에 없어요. 이대로면 독자는 같은 균열을 두 번 처음 보는 것처럼 읽을 수 있어요.",
        quote:
          "달빛이 온실의 지붕을 훑고 지나갈 때마다, 금이 간 창마다 은빛 선이 번졌다.",
        sourceQuote: "균열은 어젯밤보다 한 뼘 더 자라 있었다.",
        verdict: {
          verdict: "INTENDED",
          reason: "11화의 균열이 밤사이 온실 전체로 번진 거예요.",
        },
      },
      {
        key: "key",
        kind: "SETTING",
        core: true,
        source: "i-key",
        explanation:
          "‘낡은 열쇠’ 설정은 열쇠가 기록단 결성 이후 한 번도 정원 안에 들어온 적이 없다고 정해 두었어요. 그런데 12화에서 서윤은 정원 안에 있는 북쪽 문을 밀어 열어요. 북쪽 문은 이 열쇠로만 열리니, 열쇠가 정원에 들어오지 않았다면 문도 열릴 수 없어요. 열쇠가 정원에 들어온 장면도, 열쇠 없이 문이 열린 까닭도 원고에 없어요.",
        quote: "서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다.",
        sourceQuote:
          "낡은 열쇠는 기록단 결성 이후 한 번도 정원 안에 들어온 적이 없다.",
        quoteFocus: "문을 밀었다",
        sourceFocus: "한 번도 정원 안에 들어온 적이 없다",
      },
      {
        key: "glass",
        kind: "SETTING",
        core: true,
        source: "p-north",
        explanation:
          "‘북쪽 온실’ 설정은 온실의 유리를 정원 기록단만 손볼 수 있다고 정해 두었어요. 그런데 12화에서 카이론은 금이 간 창에 손바닥을 대고 튀어나온 조각을 도로 밀어 넣어요. 앞 회차에 카이론이 기록단에 들었거나 기록단의 허락을 받은 장면이 없어서, 카이론이 유리를 손볼 수 있는 까닭이 보이지 않아요. 카이론이 규칙을 어기는 장면이라면 그렇다는 걸 보여 주는 반응도 원고에 없어요.",
        quote:
          "카이론이 금이 간 창에 손바닥을 대고, 튀어나온 조각을 도로 밀어 넣고 있었다.",
        sourceQuote: "온실의 유리는 정원 기록단만 손볼 수 있다.",
        quoteFocus: "튀어나온 조각을 도로 밀어 넣고 있었다",
        sourceFocus: "정원 기록단만 손볼 수 있다",
      },
      {
        key: "reopen",
        kind: "SETTING",
        core: true,
        source: "p-north",
        explanation:
          "‘북쪽 온실’ 설정은 북쪽 문이 낡은 열쇠 없이는 열리지 않는다고 정해 두었어요. 그런데 12화 후반에서 서윤이 손잡이를 다시 잡기도 전에 문이 저절로 열려요. 이때도 누군가 열쇠를 쓰는 장면이 없어서 문이 열린 까닭을 원고에서 찾을 수 없어요. 문이 스스로 열리는 것이 설정의 예외라면 그 까닭이 어딘가에 드러나야 해요.",
        quote: "서윤이 손잡이를 다시 잡기도 전에, 문은 저절로 열렸다.",
        sourceQuote: "북쪽 문은 낡은 열쇠 없이는 열리지 않는다.",
        quoteFocus: "문은 저절로 열렸다",
        sourceFocus: "낡은 열쇠 없이는 열리지 않는다",
      },
    ],
    earlier: [
      {
        key: "lantern",
        kind: "SETTING",
        source: "i-lantern",
        explanation:
          "‘은빛 등불’ 설정은 등불이 기억의 빛을 비추는 물건이라고 정해 두었어요. 그런데 이 판의 12화에서 서윤은 등불을 끈 채 문을 밀어요. 문 너머에서 기억의 빛을 읽어야 하는 장면이라면, 등불 없이 무엇으로 보는지가 나오지 않아요.",
        quote: "서윤은 등불을 끄고 천천히 문을 밀었다.",
        sourceQuote: "기억의 빛을 비추는 등불.",
      },
      {
        key: "law",
        kind: "SETTING",
        core: true,
        source: "w-law",
        explanation:
          "‘균열의 법칙’ 설정은 균열이 문이 아니라 기억의 방향이라고 못 박아 두었어요. 그런데 이 판의 12화는 균열이 곧 문이었다고 적어요. 비유로 쓴 말이라 해도 설정이 정면으로 부정한 내용을 그대로 말해서, 독자가 균열을 문으로 받아들일 수 있어요.",
        quote: "균열은 곧 문이었다.",
        sourceQuote: "균열은 문이 아니라 기억의 방향이다.",
      },
    ],
    chapters: [
      { chapter: "ch-11", daysAgo: 3, findings: [] },
      {
        chapter: "ch-10",
        daysAgo: 7,
        edited: true,
        findings: [
          {
            key: "compass",
            kind: "SETTING",
            source: "i-compass",
            explanation:
              "‘파편 나침반’ 설정은 나침반이 기억의 흔적을 가리키는 항해 도구라고 정해 두었어요. 그런데 10화는 나침반이 가리키는 곳을 보통 나침반의 방위처럼 그려요. 바늘이 기억의 흔적을 따라 움직인다는 단서가 10화에 없어서, 설정과 다른 물건처럼 읽혀요.",
            quote: "나침반이 가리키는 곳.",
            sourceQuote: "기억의 흔적을 가리키는 항해 도구.",
            verdict: {
              verdict: "NOT_CONFLICT",
              reason: "기억의 흔적이 마침 북쪽에 있어서 북쪽을 가리켜요.",
            },
          },
        ],
      },
      {
        chapter: "ch-9",
        daysAgo: 8,
        findings: [
          {
            key: "awaken",
            kind: "SETTING",
            source: "e-awaken",
            explanation:
              "‘각성’ 사건 설정은 잃어버린 기억의 방향을 처음 읽어 낸 때를 밤으로 정해 두었어요. 그런데 9화는 그 깨달음이 다섯 번째 순찰을 마친 새벽에 왔다고 적어요. 밤 순찰이 새벽까지 이어졌다는 문장이 없어서 시간대가 서로 맞지 않아요.",
            quote: "다섯 번째 순찰을 마친 새벽이었다.",
            sourceQuote: "잃어버린 기억의 방향을 처음 읽어 낸 밤.",
            verdict: {
              verdict: "INTENDED",
              reason: "밤 순찰이 새벽까지 이어진 거예요.",
            },
          },
        ],
      },
    ],
  },
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
