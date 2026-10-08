import { t } from "@/i18n";
import type { Locale } from "@/i18n/locale";
import type { DocumentType } from "@/domain/document-types";
import type {
  ChatMessage,
  ChatSession,
  DocumentContent,
  DocumentDraft,
  DocumentVersion,
  ExportFormat,
  FileNode,
  Memo,
  MemoScope,
  Project,
  ProjectGraph,
  ProjectSettings,
  RefreshRun,
  TrashEntry,
  User,
} from "@/domain/models";
import type { GuideTopic } from "@/features/help/guide-content";
import type { WorkspaceLayout } from "@/features/workspace/model/layout";

export type AuthFailure = "canceled" | "failed" | "expired";

export interface TermsView {
  termsVersionId: string;
  version: string;
  title: string;
  content: string;
  effectiveAt: string;
  expiresAt: string;
}

export interface AuthService {
  getTerms(): Promise<TermsView>;
  acceptTerms(termsVersionId: string): Promise<void>;
  getSession(): Promise<User | null>;
  // 서버 가정: Google OAuth는 Gateway/BFF가 리다이렉트로 처리하고, 프론트는 시작만 요청한다.
  // 복귀 URL의 query(`?auth=canceled|failed|expired`)로 실패 사유를 전달받는다고 가정한다.
  startGoogleLogin(returnTo: string): Promise<void>;
  logout(): Promise<void>;
}

export interface AccountService {
  getAccount(): Promise<User>;
  updateDisplayName(displayName: string): Promise<User>;
  updateLocale(locale: Locale): Promise<User>;
  completeOnboarding(): Promise<void>;
  deleteAccount(confirmationEmail: string): Promise<void>;
}

export interface ProjectService {
  list(): Promise<Project[]>;
  get(projectId: string): Promise<Project>;
  create(input: { title: string; description: string }): Promise<Project>;
  createSample(): Promise<Project>;
  rename(projectId: string, title: string): Promise<Project>;
  moveToTrash(projectId: string): Promise<void>;
  listTrash(): Promise<Project[]>;
  restore(projectId: string): Promise<Project>;
  deletePermanently(projectId: string): Promise<void>;
  getSettings(projectId: string): Promise<ProjectSettings>;
  saveSettings(projectId: string, settings: ProjectSettings): Promise<Project>;
}

export interface CreateFileInput {
  projectId: string;
  parentId: string | null;
  kind: "document" | "folder";
  title: string;
  docType?: DocumentType;
}

export interface FileService {
  tree(projectId: string): Promise<FileNode[]>;
  create(input: CreateFileInput): Promise<FileNode>;
  rename(fileId: string, title: string): Promise<FileNode>;
  move(
    fileId: string,
    parentId: string,
    beforeId: string | null,
  ): Promise<FileNode>;
  moveToTrash(fileId: string): Promise<void>;
  listTrash(projectId: string): Promise<TrashEntry[]>;
  restore(fileId: string): Promise<FileNode>;
  deletePermanently(fileId: string): Promise<void>;
  favorites(projectId: string): Promise<string[]>;
  setFavorite(
    projectId: string,
    fileId: string,
    favorite: boolean,
  ): Promise<string[]>;
  // 와이어프레임 166: 에피소드 폴더를 지우면 폴더만 사라지고 회차는 원고 폴더로 돌아간다.
  deleteEpisode(episodeId: string): Promise<void>;
}

export class ConflictError extends Error {
  constructor(
    readonly current: DocumentContent,
    readonly base: DocumentContent | null,
  ) {
    super(t("문서가 다른 곳에서 먼저 저장됐어요."));
    this.name = "ConflictError";
  }
}

export interface SaveDocumentInput {
  draft: DocumentDraft;
  // 서버 가정(DOCUMENT_EDITING_PROPOSAL §5): If-Match 헤더로 보낼 revision과
  // X-Save-Id 멱등키. revision이 어긋나면 서버는 409와 현재·공통 조상 본문을 돌려준다.
  ifMatchRevision: number;
  saveId: string;
}

export interface DocumentService {
  get(fileId: string): Promise<DocumentContent>;
  save(fileId: string, input: SaveDocumentInput): Promise<DocumentContent>;
  setLocked(fileId: string, locked: boolean): Promise<DocumentContent>;
  // 서버 가정: 내보내기는 서버가 파일을 만들어 다운로드 URL을 준다. 형식별 보존 범위는 미확정.
  export(
    fileId: string,
    format: ExportFormat,
  ): Promise<{ fileName: string; url: string }>;
}

export interface VersionService {
  list(fileId: string): Promise<DocumentVersion[]>;
  saveNamed(fileId: string, label?: string): Promise<DocumentVersion>;
  // 요구사항 §6.2: 복원 전에 현재 상태를 PRE_RESTORE 버전으로 먼저 남긴다.
  restore(
    fileId: string,
    versionId: string,
    ifMatchRevision: number,
  ): Promise<DocumentContent>;
}

export interface MemoService {
  list(
    projectId: string,
    scope: MemoScope,
    fileId?: string | null,
  ): Promise<Memo[]>;
  create(input: {
    projectId: string;
    scope: MemoScope;
    fileId: string | null;
    body: string;
  }): Promise<Memo>;
  update(memoId: string, body: string): Promise<Memo>;
  remove(memoId: string): Promise<void>;
}

export interface GraphService {
  // 서버 가정: graph-rag가 Neptune 투영본을 프로젝트 단위로 돌려준다(GRAPH_INBOX_PATTERN).
  getProjectGraph(projectId: string): Promise<ProjectGraph>;
}

export interface RefreshService {
  current(projectId: string): Promise<RefreshRun>;
  // 요구사항 §8.2: 추출 중에는 같은 요청을 중복 실행할 수 없다.
  start(projectId: string): Promise<RefreshRun>;
  apply(
    projectId: string,
    runId: string,
    resolved: Record<string, DocumentDraft | null>,
  ): Promise<RefreshRun>;
  discard(projectId: string, runId: string): Promise<RefreshRun>;
}

export interface ChatStreamHandlers {
  onToken(token: string): void;
}

export interface ChatService {
  sessions(projectId: string): Promise<ChatSession[]>;
  createSession(projectId: string): Promise<ChatSession>;
  renameSession(sessionId: string, title: string): Promise<ChatSession>;
  deleteSession(sessionId: string): Promise<void>;
  messages(sessionId: string): Promise<ChatMessage[]>;
  // 요구사항 §8.1: 응답은 점진적으로 표시하고, 중단된 미완성 답변은 기록에 남기지 않는다.
  send(
    sessionId: string,
    input: { content: string; contextFile: ChatMessage["contextFile"] },
    handlers: ChatStreamHandlers,
    signal: AbortSignal,
  ): Promise<ChatMessage>;
}

export interface WorkspaceStateService {
  // 요구사항 §3: 프로젝트를 다시 열면 탭·활성 파일·패널 배치·그래프 보기를 복원한다.
  load(projectId: string): Promise<WorkspaceLayout | null>;
  save(projectId: string, layout: WorkspaceLayout): Promise<void>;
}

export interface HelpService {
  // 서버 가정(미확정): 사용 가이드는 서버나 CMS에서 받아온다(와이어프레임 90의 불러오기 실패 상태).
  // 정적 번들로 확정되면 이 포트 없이 guide-content를 직접 읽으면 된다.
  guides(): Promise<GuideTopic[]>;
}

export const FEEDBACK_MAX = 2000;

export interface FeedbackInput {
  message: string;
  /** 보낸 화면의 경로. 운영자가 어디서 겪은 일인지 알 수 있게 함께 보낸다. */
  page: string;
}

export interface FeedbackService {
  send(input: FeedbackInput): Promise<void>;
}

export interface Services {
  auth: AuthService;
  account: AccountService;
  projects: ProjectService;
  files: FileService;
  documents: DocumentService;
  versions: VersionService;
  memos: MemoService;
  graph: GraphService;
  refresh: RefreshService;
  chat: ChatService;
  workspaceState: WorkspaceStateService;
  help: HelpService;
  feedback: FeedbackService;
}
