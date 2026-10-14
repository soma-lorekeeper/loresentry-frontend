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
  title: `Ch. ${number} · ${subtitle}`,
  description,
  body,
});

const CHAT_DOOR =
  "The latest chapter with text is Ch. 12. When Seoyun pushes the North Door, **a familiar voice from beyond the darkness calls her name.** [[doc:Ch. 12 · Night of the Fracture|From beyond the darkness, a familiar voice called her name.]] The text says it was exactly the way someone who had left the garden long ago last called it.\nCh. 12 doesn't reveal whose voice it is. The next chapter, [[doc:Ch. 13 · The Voice That Returned]], takes that up, and among your setting documents [[doc:Theo|The one who left the garden and came back]] is the closest match.\n- There is only one set of footprints at the door: signs of someone going in, none of anyone coming back out. [[doc:Ch. 12 · Night of the Fracture|There were signs of someone going in, but none of anyone coming back out.]]\n- The sentence Seoyun recalls right before pushing the door is also in one of your project notes. [[memo:Direction of the fracture|A fracture is not a door but the direction of a memory.]]";

const CHAT_LENA =
  "Among the main characters, [[doc:Lena Arbel]] has the most links: five documents in her property table.\n- **Organization** [[doc:Silver Voyagers|Their last navigator]] The Voyagers call Lena their last navigator.\n- **Place** [[doc:Glass Mountains|Where she first awakened]] Where Lena first awakened.\n- **Event** [[doc:Awakening|The one who awakened]] Lena is the one it happened to.\n- **Manuscript** She first appears in [[doc:Ch. 11 · The Glass Garden|First appearance]] and reaches the North Greenhouse in [[doc:Ch. 12 · Night of the Fracture|Arrives at the greenhouse]].\nHer setting says every memory she reads comes at a price, but no chapter has shown that price yet. [[doc:Lena Arbel|Reading memories always demands a price.]]";

const CHAT_OPEN =
  "Among the chapters that have text, the first is **the moment in Ch. 12 when she grips the handle of the North Door**. [[doc:Ch. 12 · Night of the Fracture|When she laid her hand on the handle, a cold tremor climbed up her wrist.]]\nUp to that point Seoyun is drawn only as a recorder watching the fractures over three patrols. Here she hesitates for the first time, and setting the lantern down before she “slowly” pushes the door shows it.\nThere is an earlier candidate. In Ch. 11 she and Harin look up at the cracked pane in silence, which reads more like a warning of unease than wavering. [[doc:Ch. 11 · The Glass Garden|The two of them looked up at the cracked pane without a word.]]\nCh. 1–10 have no text yet, so I left them out. Ask again once you've written them.";

const EPISODES: SeedEpisode[] = [
  {
    key: "ep-1",
    title: "Episode 1. Season of Glass",
    chapters: [
      chapter(
        1,
        "The First Greenhouse",
        "The day Seoyun joins the Garden Recorders",
      ),
      chapter(
        2,
        "Light Patrol",
        "Seoyun walks the night patrol for the first time",
      ),
      chapter(
        3,
        "The Cracked Lens",
        "Finding the traces of memory left in a lens",
      ),
    ],
  },
  {
    key: "ep-2",
    title: "Episode 2. The North Door",
    chapters: [
      chapter(
        4,
        "The Locked Door",
        "Why the North Greenhouse door stayed locked so long",
      ),
      chapter(
        5,
        "The Silent Lighthouse",
        "The lighthouse at Lavender Harbor goes dark",
      ),
      chapter(6, "The Logbook", "Finding the logbook Lena left behind"),
      chapter(
        7,
        "The Glass Mountains",
        "The Recorders head for the Glass Mountains",
      ),
    ],
  },
  {
    key: "ep-3",
    title: "Episode 3. Memory Routes",
    chapters: [
      chapter(8, "Silver Harbor", "A first encounter with the Silver Voyagers"),
      chapter(
        9,
        "Awakening",
        "Seoyun reads the direction of a memory for the first time",
      ),
      chapter(10, "The Shard Compass", "Where the compass points"),
      chapter(
        11,
        "The Glass Garden",
        "The first agreement among those gathered in the garden",
        "When morning came to the Glass Garden, the dew that had gathered overnight collected the light like tiny lenses. Seoyun followed the first light to wake and walked to the central greenhouse.\n\nHarin was already there. The two of them looked up at the cracked pane without a word. The fracture had grown a hand's span longer since the night before.",
      ),
    ],
  },
  {
    key: "ep-4",
    title: "Episode 4. New Chapters",
    chapters: [
      chapter(
        12,
        "Night of the Fracture",
        "The night the fracture first shows itself in the greenhouses",
        "When night came, the garden held its breath before the glass did. Each time the moonlight swept across the greenhouse roofs, silver lines spread through every cracked pane. Only on the third patrol did Seoyun realize that all of those lines pointed to the same place.\n\nIn front of the long-locked North Door there was only a single set of footprints. There were signs of someone going in, but none of anyone coming back out. When she laid her hand on the handle, a cold tremor climbed up her wrist. A sentence she had written in her notes the night before came back to her: “A fracture is not a door but the direction of a memory.”\n\nSeoyun set the lantern down on the ground and slowly pushed the door open. From beyond the darkness, a familiar voice called her name. It was exactly the way it had been called the last time, long ago, by someone who had left this garden.",
      ),
      chapter(
        13,
        "The Voice That Returned",
        "It comes to light whose voice is beyond the door",
      ),
      chapter(
        14,
        "Festival Blackout",
        "The day after the festival, the whole city stops",
      ),
    ],
  },
];

const SETTINGS: Record<SettingDocumentType, SeedEntity[]> = {
  character: [
    {
      key: "c-seoyun",
      title: "Seoyun",
      description: "The youngest recorder in the Garden Recorders",
      body: "Seoyun is the most recent recorder to join the Garden Recorders.\nSince taking on the night patrol, she has begun to read the direction of the light left on the glass.\n\nShe says little, but once she has written a sentence down, she keeps to it to the end.",
    },
    {
      key: "c-lena",
      title: "Lena Arbel",
      description:
        "A navigator who reads by feel the directions other people's memories leave behind",
      body: "Lena reads by feel the directions that other people's memories leave behind.\nEven in the thickest fog, she has never once lost her way.\nThe Silver Voyagers called her the last navigator.\nThe name stuck after she first awakened in the Glass Mountains.\nShe never uses the title herself.\nReading memories always demands a price.\nPart of every memory she reads stays with her as her own.",
    },
    {
      key: "c-harin",
      title: "Harin",
      description: "The gardener who tends the North Greenhouse",
    },
    {
      key: "c-kairon",
      title: "Kairon",
      description: "A swordmaster from the south",
    },
    {
      key: "c-ethan",
      title: "Ethan Bell",
      description: "The last lighthouse keeper among the Lighthouse Keepers",
    },
    {
      key: "c-mira",
      title: "Mira On",
      description: "An artisan of the Glassmakers' Guild",
    },
    {
      key: "c-noah",
      title: "Noah Crane",
      description: "A cartographer who maps the memory routes",
    },
    {
      key: "c-teo",
      title: "Theo",
      description: "The one who left the garden and came back",
    },
  ],
  place: [
    {
      key: "p-north",
      title: "North Greenhouse",
      description: "The northern end of the garden, locked for a long time",
    },
    {
      key: "p-garden",
      title: "The Glass Garden",
      description: "The Glass Garden north of the Royal City",
    },
    {
      key: "p-range",
      title: "Glass Mountains",
      description: "A ridge of glass rising in the middle of the continent",
    },
    {
      key: "p-harbor",
      title: "Silver Harbor",
      description: "A harbor city where the memory routes meet",
    },
    {
      key: "p-lavender",
      title: "Lavender Harbor",
      description:
        "A harbor where a glass lighthouse lights the northern route every night",
    },
    {
      key: "p-capital",
      title: "The Royal City",
      description:
        "The city where the Garden Recorders have their headquarters",
    },
  ],
  organization: [
    {
      key: "o-fleet",
      title: "Silver Voyagers",
      description: "A seafaring company working to secure safe memory routes",
    },
    {
      key: "o-archive",
      title: "Garden Recorders",
      description: "The people who record the garden's light and fractures",
    },
    {
      key: "o-lighthouse",
      title: "Lighthouse Keepers",
      description: "A society that guards the fading lighthouses",
    },
    {
      key: "o-guild",
      title: "Glassmakers' Guild",
      description: "A guild of artisans who work glass lenses",
    },
  ],
  item: [
    {
      key: "i-lantern",
      title: "Silver Lantern",
      description: "A lantern that casts the light of memory",
    },
    {
      key: "i-compass",
      title: "Shard Compass",
      description: "A navigation tool that points to traces of memory",
    },
    {
      key: "i-key",
      title: "Old Key",
      description: "The key that opens the North Door",
    },
    {
      key: "i-bottle",
      title: "Memory Vial",
      description: "A vial that holds one person's memories",
    },
    {
      key: "i-log",
      title: "Logbook",
      description: "The voyage records Lena left behind",
    },
    {
      key: "i-lens",
      title: "Cracked Lens",
      description: "A lens that shows the direction of light twisted",
    },
  ],
  event: [
    {
      key: "e-crack",
      title: "Night of the Fracture",
      description: "The night a fracture first appeared in the greenhouses",
    },
    {
      key: "e-awaken",
      title: "Awakening",
      description: "The night the direction of a lost memory was first read",
    },
    {
      key: "e-silence",
      title: "The Silent Lighthouse",
      description: "When the lighthouse at Lavender Harbor went dark",
    },
    {
      key: "e-door",
      title: "Opening of the North Door",
      description: "The locked North Door opens",
    },
    {
      key: "e-patrol",
      title: "First Patrol",
      description: "Seoyun's first night patrol",
    },
    {
      key: "e-lost",
      title: "Lost Route",
      description: "A memory route vanishes from the map",
    },
    {
      key: "e-founding",
      title: "Founding of the Recorders",
      description: "The day the Garden Recorders were founded",
    },
    {
      key: "e-collapse",
      title: "Collapse of the Glass Mountains",
      description: "The collapse of part of the ridge",
    },
    {
      key: "e-blackout",
      title: "Festival Blackout",
      description: "The day after the festival, the city stops",
    },
    {
      key: "e-return",
      title: "Return",
      description: "Someone who left comes back to the garden",
    },
  ],
  worldview: [
    {
      key: "w-law",
      title: "Law of Fractures",
      description: "A fracture is not a door but the direction of a memory",
    },
    {
      key: "w-route",
      title: "Memory Routes",
      description: "The rule of a world where memories become sea routes",
    },
    {
      key: "w-scent",
      title: "Jinhyang",
      description: "How each character senses lingering echoes",
    },
    {
      key: "w-glass",
      title: "Glass Magic",
      description: "The art of trapping light in glass",
    },
  ],
};

const OTHER_PROJECTS: SeedOtherProject[] = [
  {
    id: "starlight-promise",
    title: "A Last Promise Under Starlight — Trilogy",
    description:
      "A novel in which a promise spanning three generations is resolved on the last night. It is being written in three parts: Part 1, The Star Covenant; Part 2, The Night That Never Returns; Part 3, Witness at Dawn.",
    lastFileTitle: "Chapter_17_The_Night_That_Never_Returns",
    lastWorkedMinutesAgo: 12,
    lastFileType: "manuscript",
  },
  {
    id: "moonlight-library",
    title: "Chronicles of the Moonlight Library",
    description:
      "The librarians of a library that opens only at night guard the forbidden stacks",
    lastFileTitle: "Part_2_The_Forbidden_Stacks",
    lastWorkedMinutesAgo: 60 * 24,
    lastFileType: "manuscript",
  },
  {
    id: "orbit-people",
    title: "People in Nearby Orbits",
    description: "",
    lastFileTitle: "Epilogue_Ordinary_Gravity",
    lastWorkedMinutesAgo: 60 * 24 * 21,
    lastFileType: "manuscript",
  },
  {
    id: "sleeping-city",
    title: "A Very Long Story of the City Asleep Under Rain",
    description:
      "A child's journey to wake the sleepers of a city where the rain never stops",
    lastFileTitle: "Draft_Act_3_The_Night_the_City_Wakes",
    lastWorkedMinutesAgo: 60 * 24 * 28,
    lastFileType: "manuscript",
  },
  {
    id: "nameless-notes",
    title: "Untitled Worldbuilding Notes",
    description: "",
    lastFileTitle: "Character_Relationships",
    lastWorkedMinutesAgo: 60 * 24 * 46,
    lastFileType: "worldview",
  },
];

const TRASHED_PROJECTS: SeedTrashedProject[] = [
  {
    id: "starlight-draft",
    title: "A Last Promise Under Starlight",
    trashedDaysAgo: 19,
  },
  {
    id: "glass-sea",
    title: "Map of the Glass Sea",
    trashedDaysAgo: 23,
  },
  {
    id: "winter-station",
    title: "Letters from the Winter Station",
    trashedDaysAgo: 31,
  },
];

export const EN_SEED: MockSeed = {
  terms: {
    title: "Lore Sentry Terms of Service",
    content:
      "These are test terms for UI development.\nThe rights to the novels you write belong to you.\nConsent in production uses the final text provided by the server.",
  },
  account: { displayName: "Yunju Seo" },
  project: {
    title: "The Glass Garden Records",
    description:
      "The story of the people who record the memories left where the light has passed",
  },
  episodes: EPISODES,
  settings: SETTINGS,
  draftBody: (description) =>
    `${description}.\n\nThe draft of this chapter is still empty. Only the order of the scenes and the characters' movements are noted down.`,
  settingBody: (description) => `${description}.`,
  trash: {
    prologue: {
      title: "Old Prologue",
      body: "The story from before the garden existed.",
      description: "A prologue from the early plans",
    },
    folderTitle: "Shelved Settings",
    lighthouse: {
      title: "The Vanished Lighthouse",
      body: "A lighthouse erased from the map.",
      description: "A lighthouse that existed only in the early settings",
    },
  },
  projectMemos: [
    {
      title: "Direction of the fracture",
      body: "A fracture is not a door but the direction of a memory. Tie the meaning of the glass shards back in during the next scene.",
    },
    {
      title: "North Greenhouse",
      body: "Seoyun and Harin first meet in the North Greenhouse. Check what time the light passes through the glass walls.",
    },
    {
      title: "Jinhyang terminology",
      body: "Settle on “Jinhyang” as the worldbuilding term. Each character senses lingering echoes in a different way.",
    },
    {
      title: "Order of events",
      body: "Review the order of events in the second half again. Adjust it so the blackout happens the day after the festival.",
    },
    {
      title: "Cover copy",
      body: "Cover copy idea: Memory always stays where the light has passed.",
    },
  ],
  fileMemos: {
    chapter:
      "Describe the tremor in the handle only once. Save the word “fracture” for the last sentence.",
    lena: "Lena's speech mixes in sailing terms without explaining them.",
  },
  lenaHistory: {
    earlierPhrase: {
      now: "has never once lost her way",
      before: "has never lost her way",
    },
    versionDescriptions: [
      "A navigator who reads by feel the directions other people's memories leave behind",
      "A navigator who reads by feel the directions other people's memories leave behind",
      "A navigator with the Silver Voyagers",
      "Navigator",
    ],
    currentDescription:
      "A Silver Voyagers navigator who reads the memory routes",
  },
  chat: {
    sessions: [
      {
        key: "chat-door",
        title: "Checking the North Door scene",
        minutesAgo: 120,
        question: "What does Seoyun hear after she opens the North Door?",
        answer: CHAT_DOOR,
      },
      {
        key: "chat-lena",
        title: "Sorting out Lena's profile",
        minutesAgo: 60 * 26,
        question: "Sum up the settings linked to Lena",
        answer: CHAT_LENA,
      },
      {
        key: "chat-title",
        title: "Title ideas for Ch. 12",
        minutesAgo: 60 * 24 * 4,
        question: "Give me a few more title ideas for Ch. 12",
        answer:
          "The current title, “Night of the Fracture”, is the same as the event document's name. [[doc:Night of the Fracture]] If you want the chapter title to stand apart, here are a few options.\n- A Single Set of Footprints\n- No Way Back Out\n- The Direction of a Memory",
      },
    ],
    scripts: [
      { keywords: ["lena", "linked", "main character"], answer: CHAT_LENA },
      { keywords: ["waver", "break"], answer: CHAT_OPEN },
      { keywords: ["latest", "door", "voice", "hear"], answer: CHAT_DOOR },
    ],
    quotedChapter: "Ch. 12 · Night of the Fracture",
    quoted: {
      ask: "The sentence you picked is in the last paragraph of Ch. 12. {cite}\n**The voice beyond the door appears for the first time in this chapter.** The same phrase isn't used anywhere else in the manuscript, and who it belongs to is held over to Ch. 13. Among your setting documents, [[doc:Theo|The one who left the garden and came back]] fits “someone who had left this garden” best.",
      explain:
        "This is the moment Seoyun stops hesitating and opens the North Door. {cite}\n- **Who**: Seoyun, alone, right after noticing on her third patrol that every crack points the same way.\n- **What**: She sets the lantern down and pushes the door. She opens it without a key, so check this against [[doc:Old Key|The key that opens the North Door]].\n- **Why it matters**: The voice beyond the door leads into the events of Ch. 13. [[doc:Ch. 13 · The Voice That Returned]]",
      related:
        "Three settings are linked to the part you picked. {cite}\n- [[doc:North Greenhouse|Where the chapter is set]] This is where the scene takes place.\n- [[doc:Old Key|The key that opens the North Door]] Seoyun pushes the door without a key. Who holds the key hasn't come up in the manuscript yet.\n- [[doc:Night of the Fracture|The night a fracture first appeared in the greenhouses]] The event document for the same night.",
      flow: "This sentence is the turning point of Ch. 12. {cite}\n- Before: in Ch. 11, Seoyun and Harin look up at the cracked pane without a word. [[doc:Ch. 11 · The Glass Garden|The two of them looked up at the cracked pane without a word.]]\n- After: Ch. 13, “The Voice That Returned”, reveals whose voice it is. Its text is still empty. [[doc:Ch. 13 · The Voice That Returned]]",
    },
    quotedOther:
      "The part you picked is in {title}. {cite}\nThis screen runs on sample data, so it only answers in detail about sentences in Ch. 12. Open [[doc:Ch. 12 · Night of the Fracture]] and select some of its text.",
    fallback:
      "This is where AI reads your whole manuscript, settings and notes and answers. Right now the screen runs on sample data, so it only answers the prepared questions as it really would. Try a suggested question, or select a sentence in your manuscript and ask about it.",
  },
  otherProjects: OTHER_PROJECTS,
  trashedProjects: TRASHED_PROJECTS,
  relationNotes: [
    { between: ["c-lena", "o-fleet"], note: "Their last navigator" },
    { between: ["c-lena", "p-range"], note: "Where she first awakened" },
    { between: ["c-lena", "e-awaken"], note: "The one who awakened" },
    { between: ["c-lena", "ch-11"], note: "First appearance" },
    { between: ["c-lena", "ch-12"], note: "Arrives at the greenhouse" },
    { between: ["ch-12", "p-north"], note: "Where the chapter is set" },
  ],
  refresh: {
    harinDescription:
      "The gardener who joined the Recorders after the North Greenhouse door opened",
    harinBodyAddition:
      "In Ch. 13, she is the first to recognize the voice beyond the door.\nAfter that, she leaves the key to the North Greenhouse with Seoyun.",
    newPlace: {
      title: "The Ashen Lighthouse",
      body: "A lighthouse first mentioned in Ch. 13. Even after its fire went out, the ashes still hold the light.",
      description: "A dark lighthouse that first appears in Ch. 13",
    },
    seoyunDescription:
      "The youngest recorder in the Garden Recorders and the first visitor through the North Door",
  },
};
