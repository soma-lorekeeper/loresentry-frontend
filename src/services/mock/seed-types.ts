import type {
  DocumentType,
  SettingDocumentType,
} from "@/domain/document-types";

export interface SeedEntity {
  key: string;
  title: string;
  description: string;
  body?: string;
}

export interface SeedChapter extends SeedEntity {
  number: number;
}

export interface SeedEpisode {
  key: string;
  title: string;
  chapters: SeedChapter[];
}

export interface SeedOtherProject {
  id: string;
  title: string;
  description: string;
  lastFileTitle: string;
  lastWorkedMinutesAgo: number;
  lastFileType: DocumentType;
}

export interface SeedTrashedProject {
  id: string;
  title: string;
  trashedDaysAgo: number;
}

export interface SeedDocumentText {
  title: string;
  body: string;
  description: string;
}

export interface MockSeed {
  terms: { title: string; content: string };
  account: { displayName: string };
  project: { title: string; description: string };
  episodes: SeedEpisode[];
  settings: Record<SettingDocumentType, SeedEntity[]>;
  draftBody: (description: string) => string;
  settingBody: (description: string) => string;
  trash: {
    prologue: SeedDocumentText;
    folderTitle: string;
    lighthouse: SeedDocumentText;
  };
  projectMemos: Array<{ title: string; body: string }>;
  fileMemos: { chapter: string; lena: string };
  lenaHistory: {
    earlierPhrase: { now: string; before: string };
    versionDescriptions: [string, string, string, string];
    currentDescription: string;
  };
  chat: {
    sessions: { crack: string; lena: string; title: string };
    question: string;
    answer: string;
  };
  otherProjects: SeedOtherProject[];
  trashedProjects: SeedTrashedProject[];
  /**
   * 작가가 관계 칩에 적었을 법한 설명. 두 문서의 key 로 가리킨다(순서는 뜻이 없다).
   * 그래프에서 노드를 고르면 그 엣지 위에 이 글자가 보인다.
   */
  relationNotes: Array<{ between: [string, string]; note: string }>;
  refresh: {
    harinDescription: string;
    harinBodyAddition: string;
    newPlace: SeedDocumentText;
    seoyunDescription: string;
  };
}
