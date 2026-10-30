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
  chat: SeedChat;
  otherProjects: SeedOtherProject[];
  trashedProjects: SeedTrashedProject[];
  /**
   * 작가가 관계 칩에 적었을 법한 설명. 두 문서의 key 로 가리킨다(순서는 뜻이 없다).
   * 그래프에서 노드를 고르면 그 엣지 위에 이 글자가 보인다.
   */
  relationNotes: Array<{ between: [string, string]; note: string }>;
  settingCheck: SeedSettingCheck;
  refresh: {
    harinDescription: string;
    harinBodyAddition: string;
    newPlace: SeedDocumentText;
    seoyunDescription: string;
  };
}

export interface SeedSettingFinding {
  key: string;
  kind: "SETTING" | "MANUSCRIPT";
  core?: boolean;
  confidence?: "HIGH" | "LOW";
  /** 근거 문서의 key */
  source: string;
  /** 충돌로 본 근거. 서버의 판정처럼 서너 문장 */
  explanation: string;
  quote: string;
  sourceQuote: string;
  /** 인용 가운데 어긋나는 표현 */
  quoteFocus?: string;
  sourceFocus?: string;
  verdict?: { verdict: "INTENDED" | "NOT_CONFLICT"; reason: string | null };
}

/**
 * 설정 오류 점검의 예시 기록. 12화의 최근 점검과 그보다 앞선 두 번, 9·10·11화의 지난 점검이다.
 * 새로 돌리는 점검은 `findings` 가운데 인용이 아직 원문에 있는 것만 낸다.
 */
export interface SeedSettingCheck {
  /** 문서 key → 중요 설정으로 표시할 최상위 문단의 순서 */
  core: Record<string, number[]>;
  chapter: string;
  findings: SeedSettingFinding[];
  /** 12화의 지난 점검에만 있던 어긋남. 그 뒤 고쳐서 최근 점검에는 없다 */
  earlier: SeedSettingFinding[];
  chapters: Array<{
    chapter: string;
    daysAgo: number;
    edited?: boolean;
    findings: SeedSettingFinding[];
  }>;
}

export interface SeedChatScript {
  keywords: string[];
  answer: string;
}

export interface SeedChat {
  sessions: Array<{
    key: string;
    title: string;
    minutesAgo: number;
    question: string;
    answer: string;
  }>;
  scripts: SeedChatScript[];
  quotedChapter: string;
  quoted: Record<"ask" | "explain" | "related" | "flow", string>;
  quotedOther: string;
  fallback: string;
}
