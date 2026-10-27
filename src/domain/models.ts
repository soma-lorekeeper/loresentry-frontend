import type { DocumentBody } from "./document-body";

import type { DocumentType } from "./document-types";
import type { Locale } from "@/i18n/locale";

export type IsoDateTime = string;

export interface User {
  id: string;
  displayName: string;
  email: string;
  onboardingCompleted: boolean;
  /** 계정에 적힌 화면 언어. 아직 적힌 적이 없으면 null 이다. */
  locale?: Locale | null;
}

export const WITHDRAWAL_REASONS = [
  "RARELY_USED",
  "MISSING_FEATURE",
  "HARD_TO_USE",
  "UNRELIABLE",
  "SWITCHED_SERVICE",
  "PRIVACY",
  "PAUSED_WRITING",
  "OTHER",
] as const;

export type WithdrawalReason = (typeof WITHDRAWAL_REASONS)[number];

export interface WithdrawalSurvey {
  reasons: WithdrawalReason[];
  comment: string;
}

export const CLICK_ID_TYPES = ["gclid", "gbraid", "wbraid"] as const;

export type ClickIdType = (typeof CLICK_ID_TYPES)[number];

export interface Acquisition {
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmTerm: string | null;
  utmContent: string | null;
  clickId: string | null;
  clickIdType: ClickIdType | null;
  referrerHost: string | null;
  landingPath: string | null;
  landedAt: IsoDateTime | null;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  createdAt: IsoDateTime;
  lastWorkedAt: IsoDateTime;
  lastFile: { id: string; title: string } | null;
  trashedAt: IsoDateTime | null;
}

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §4.1): 파일과 폴더는 files 한 테이블에 있고
// rank는 드래그 이동을 위한 문자열 fractional index다.
// 와이어프레임(27·86)에 따라 사용자 섹션도 최상위 폴더이며, 섹션을 지우면 같은 이름의
// 일반 폴더(folder)가 되어 파일 영역으로 내려간다. 요구사항 §4.1보다 넓은 해석이다.
export type FolderRole = "category" | "episode" | "section" | "folder";

interface FileNodeBase {
  id: string;
  projectId: string;
  parentId: string | null;
  title: string;
  rank: string;
  trashedAt: IsoDateTime | null;
}

export interface FolderNode extends FileNodeBase {
  kind: "folder";
  role: FolderRole;
  category: DocumentType | null;
}

export interface DocumentNode extends FileNodeBase {
  kind: "document";
  docType: DocumentType;
  locked: boolean;
  /** 그래프 최신화가 잠갔다. `locked` 도 함께 참이고, 최신화가 끝나야 풀린다(사용자가 풀 수 없다) */
  refreshLocked: boolean;
  revisionNo: number;
  updatedAt: IsoDateTime;
  /**
   * 문서의 대표 이미지 주소. 없으면 화면은 분류 아이콘을 그린다.
   *
   * <p>문서 내용이 아니다. 버전·최신화 비교에 들지 않고, 바꿔도 `revisionNo` 가 오르지 않는다.
   */
  imageUrl?: string | null;
}

export type FileNode = FolderNode | DocumentNode;

export interface TextProperty {
  id: string;
  kind: "text";
  key: string;
  label: string;
  value: string;
}

export interface RelationProperty {
  id: string;
  kind: "relation";
  key: string;
  label: string;
  targetType: DocumentType;
  targetIds: string[];
  /**
   * 대상 문서 id → **그 연결**의 설명(요구사항 §10). 대상 문서의 설명이 아니라 "왜 이어져 있는가"
   * 이므로, 같은 인물이라도 회차마다 다르게 적힌다. 서버의 `document_relations.description` 이다.
   *
   * <p>적지 않은 연결은 키가 없다. 빈 문자열과 구분할 이유가 없다.
   */
  descriptions: Record<string, string>;
}

export type DocumentProperty = TextProperty | RelationProperty;

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §2): 본문은 Markdown 문자열 하나로 저장하고,
// revisionNo는 If-Match 낙관적 잠금 토큰이다.
export interface DocumentContent {
  fileId: string;
  projectId: string;
  title: string;
  docType: DocumentType;
  body: DocumentBody;
  properties: DocumentProperty[];
  locked: boolean;
  /** 그래프 최신화가 잠갔다. `locked` 도 함께 참이고, 최신화가 끝나야 풀린다(사용자가 풀 수 없다) */
  refreshLocked: boolean;
  revisionNo: number;
  updatedAt: IsoDateTime;
}

export interface DocumentDraft {
  title: string;
  body: DocumentBody;
  properties: DocumentProperty[];
}

export type MemoScope = "project" | "file";

export interface Memo {
  id: string;
  projectId: string;
  scope: MemoScope;
  fileId: string | null;
  title: string;
  body: string;
  updatedAt: IsoDateTime;
}

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §4.2): 버전은 그 시점의 제목·본문·속성 스냅샷
// 전체를 복사해 둔 한 행이다.
export type VersionKind =
  "AUTO" | "NAMED" | "PRE_RESTORE" | "RESTORE" | "AI_APPLY";

export interface DocumentVersion {
  id: string;
  fileId: string;
  kind: VersionKind;
  label: string | null;
  createdAt: IsoDateTime;
  snapshot: DocumentDraft & { docType: DocumentType };
}

export interface ChatSession {
  id: string;
  projectId: string;
  title: string;
  updatedAt: IsoDateTime;
  preview: string;
}

export type ChatIntent = "ask" | "explain" | "related" | "flow";

export interface ChatQuote {
  fileId: string;
  title: string;
  docType: DocumentType;
  text: string;
}

export type ChatCitation =
  | {
      kind: "document";
      fileId: string;
      title: string;
      docType: DocumentType;
      quote: string | null;
    }
  | { kind: "memo"; memoId: string; title: string; quote: string | null };

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  intent: ChatIntent | null;
  quote: ChatQuote | null;
  citations: ChatCitation[];
  createdAt: IsoDateTime;
}

export interface ChatSearchHit {
  session: ChatSession;
  snippet: { before: string; match: string; after: string } | null;
}

export interface ChatAvailability {
  status: "available" | "too-large";
  size: number;
  limit: number;
}

/** 오늘 쓴 AI 챗 양. `limit` 이 0이면 한도가 없다. 매일 한국 시간 자정에 0으로 돌아간다. */
export interface ChatUsage {
  used: number;
  limit: number;
  resetsAt: IsoDateTime;
}

export type ChatPhase = "gathering" | "reading" | "writing";

/** 답을 기다리는 동안 응답 모델이 하는 일. 서버가 순서대로 보낸다. */
export interface ChatActivityDocument {
  title: string;
  docType: DocumentType | null;
}

export type ChatActivity =
  | { kind: "map"; documents: number }
  | { kind: "think"; step: number; mustAnswer: boolean }
  | {
      kind: "read";
      step: number;
      documents: ChatActivityDocument[];
      skipped: number;
    }
  | { kind: "review"; step: number }
  | {
      kind: "reviewed";
      step: number;
      passed: boolean;
      missing: string[];
      problems: number;
    }
  | { kind: "final" };

export interface SearchHit {
  fileId: string;
  title: string;
  docType: DocumentType;
  path: string[];
  snippet: { before: string; match: string; after: string } | null;
  updatedAt: IsoDateTime;
}

export interface Episode {
  id: string;
  title: string;
  chapterIds: string[];
}

export interface GraphNode {
  id: string;
  title: string;
  docType: DocumentType;
  description: string;
  /** 문서의 대표 이미지. 있으면 노드 원 안에 분류 아이콘 대신 그린다 */
  imageUrl?: string | null;
}

// 서버 가정(GRAPH_INBOX_PATTERN §3): 엣지는 document_relations 의 한 쌍이다.
/**
 * 두 문서를 잇는 연결 하나. 저장은 양방향이지만 **한 쌍에 하나**만 온다 — 두 개면 관계도에 링크가
 * 겹쳐 그려진다. 관계는 대칭이므로 `source`·`target` 은 그리기 순서일 뿐 뜻이 없다.
 */
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  key: string;
  /** 이 연결의 설명(`document_relations.description`). 적지 않은 관계는 빈 문자열이다. */
  description: string;
  /**
   * 누가 이었는가. 지금은 모두 `USER` 다. graph-rag 가 본문에서 찾아낸 관계를 더하면 `AI` 가 생기고,
   * **그때 응답 모양은 바뀌지 않는다** — 화면이 출처를 구분할 자리를 지금부터 둔다.
   */
  origin: "USER" | "AI";
}

export interface ProjectGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  episodes: Episode[];
}

export interface TrashEntry {
  node: FileNode;
  originalPath: string[];
  childCount: number;
}

export interface ProjectSettings {
  title: string;
  description: string;
}

/**
 * 그래프 최신화 한 번(run)의 상태. 서버(content 의 graph-refresh API)가 갖는다.
 *
 * <ul>
 *   <li>IDLE: 이 프로젝트에서 최신화를 한 적이 없다
 *   <li>RUNNING: graph-rag 결과를 기다린다(서버의 GENERATING). 보낸 문서는 잠겨 있다
 *   <li>READY: 결과가 와서 검토 중이다. 확정할 때까지 관련 문서가 잠겨 있다
 *   <li>NO_CHANGE · FAILED · APPLIED: 끝났다. 잠금이 풀렸다
 * </ul>
 */
export type RefreshRunStatus =
  "IDLE" | "RUNNING" | "READY" | "NO_CHANGE" | "FAILED" | "APPLIED";

/** 고칠 기존 문서(modified)인가, 새로 만들 설정 문서(added)인가 */
export type ProposalKind = "modified" | "added";

/**
 * 검토 작업본 하나. 왼쪽(current)은 지금 문서, 오른쪽(proposed)은 AI 제안이고 둘 다 고칠 수 있다.
 * 두 쪽이 같아지면 정해진 것이고, 모든 작업본이 정해져야 확정할 수 있다.
 */
export interface RefreshProposal {
  /** 작업본 id. 자동 저장이 이것으로 가리킨다 */
  id: string;
  kind: ProposalKind;
  /** 기존 문서 id. 새 문서 제안이면 서버가 준 후보 id(`new:…`)다 */
  fileId: string;
  title: string;
  docType: DocumentType;
  /** 자동 저장의 충돌 방지 번호. 저장할 때 그대로 돌려보낸다 */
  draftRevision: number;
  /** 서버가 본 두 쪽이 같은가. 모두 참이어야 확정된다 */
  matched: boolean;
  /** AI 가 읽은 뒤 문서가 바뀌었다. 제안이 지금 문서와 어긋날 수 있다 */
  baseMismatch: boolean;
  current: DocumentDraft | null;
  proposed: DocumentDraft | null;
}

export interface RefreshRun {
  id: string;
  projectId: string;
  status: RefreshRunStatus;
  startedAt: IsoDateTime | null;
  readyAt: IsoDateTime | null;
  completedAt: IsoDateTime | null;
  /** 실패했을 때의 서버 코드(`TIMED_OUT` 등)와 진단용 설명 */
  error: { code: string; message: string | null } | null;
  /** 열린 작업본 수. READY 가 아니면 모두 0 이다 */
  counts: { total: number; matched: number; created: number };
}

/** 검토 화면이 읽는 run 과 그 작업본 전부 */
export interface RefreshRunDetail extends RefreshRun {
  proposals: RefreshProposal[];
}

export type ExportFormat = "pdf" | "docx" | "md" | "txt" | "hwp";
