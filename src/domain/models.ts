import type { IconName } from "@/design-system/icons/icon";

import type { DocumentType } from "./document-types";

export type IsoDateTime = string;

export interface User {
  id: string;
  displayName: string;
  email: string;
}

export interface Project {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  createdAt: IsoDateTime;
  lastWorkedAt: IsoDateTime;
  lastFile: { id: string; title: string } | null;
  trashedAt: IsoDateTime | null;
}

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §4.1): 파일과 폴더는 files 한 테이블에 있고
// rank는 드래그 이동을 위한 문자열 fractional index다.
export type FolderRole = "category" | "episode" | "section";

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
  revisionNo: number;
  updatedAt: IsoDateTime;
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
}

export type DocumentProperty = TextProperty | RelationProperty;

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §2): 본문은 Markdown 문자열 하나로 저장하고,
// revisionNo는 If-Match 낙관적 잠금 토큰이다.
export interface DocumentContent {
  fileId: string;
  projectId: string;
  title: string;
  docType: DocumentType;
  bodyMd: string;
  properties: DocumentProperty[];
  locked: boolean;
  revisionNo: number;
  updatedAt: IsoDateTime;
}

export interface DocumentDraft {
  title: string;
  bodyMd: string;
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
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant";
  content: string;
  createdAt: IsoDateTime;
  contextFile: { id: string; title: string } | null;
}

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
}

// 서버 가정(GRAPH_INBOX_PATTERN §3): 엣지는 document_relations 한 행이고
// 관계를 가진 문서(source)에서 대상 문서(target)로 향한다.
export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  key: string;
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

export interface UserSection {
  id: string;
  title: string;
  itemIds: string[];
}

export interface ProjectSettings {
  title: string;
  description: string;
}

// 서버 가정(DOCUMENT_EDITING_PROPOSAL §4.3): 그래프 최신화는 run → proposal → change
// 3층이고, 확정 전에는 실제 문서를 바꾸지 않는다.
export type RefreshRunStatus =
  "IDLE" | "RUNNING" | "READY" | "APPLIED" | "FAILED";

export type ProposalKind = "modified" | "added" | "removed";

export interface RefreshProposal {
  id: string;
  kind: ProposalKind;
  fileId: string;
  title: string;
  docType: DocumentType;
  baseRevisionNo: number | null;
  current: DocumentDraft | null;
  proposed: DocumentDraft | null;
}

export interface RefreshRun {
  id: string;
  projectId: string;
  status: RefreshRunStatus;
  startedAt: IsoDateTime | null;
  sourceFileIds: string[];
  proposals: RefreshProposal[];
}

export type ExportFormat = "pdf" | "docx" | "md" | "txt" | "hwp";
