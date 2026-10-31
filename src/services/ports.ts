import { t } from "@/i18n";
import type { Locale } from "@/i18n/locale";
import type { DocumentType } from "@/domain/document-types";
import type {
  Acquisition,
  ChatActivity,
  ChatAvailability,
  ChatCitation,
  ChatIntent,
  ChatMessage,
  ChatPhase,
  ChatQuote,
  ChatSearchHit,
  ChatSession,
  ChatUsage,
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
  RefreshRunDetail,
  SearchHit,
  TrashEntry,
  User,
  WithdrawalSurvey,
} from "@/domain/models";
import type {
  SettingCheckDecision,
  SettingCheckFinding,
  SettingCheckRun,
  SettingCheckRunDetail,
  SettingCheckSummary,
  SettingCheckVerdict,
} from "@/domain/setting-check";
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
  claimRegistrationAnalytics(kind: "consent" | "session"): Promise<boolean>;
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
  recordAcquisition(acquisition: Acquisition | null): Promise<void>;
  deleteAccount(
    confirmationEmail: string,
    survey?: WithdrawalSurvey,
  ): Promise<void>;
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
  /**
   * 문서의 대표 이미지를 올리고 붙인다. `image` 는 화면이 이미 정사각형으로 잘라 줄인 것이다.
   * 이전 이미지는 서버가 지운다. 잠긴 문서는 `locked` 로 거절한다.
   */
  setImage(fileId: string, image: Blob): Promise<FileNode>;
  /** 대표 이미지를 뗀다. 없었어도 성공이다. */
  clearImage(fileId: string): Promise<void>;
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

export interface SearchService {
  search(projectId: string, query: string): Promise<SearchHit[]>;
}

export interface GraphService {
  // 서버 가정: graph-rag가 Neptune 투영본을 프로젝트 단위로 돌려준다(GRAPH_INBOX_PATTERN).
  getProjectGraph(projectId: string): Promise<ProjectGraph>;
}

/** 최신화 요청의 결과 */
export interface RefreshStarted {
  /** 결과를 기다리는 새 run. 지난 최신화 뒤 바뀐 문서가 없어 시작하지 않았으면 null 이다 */
  run: RefreshRun | null;
  /** 이번 최신화가 잠근 문서. 결과를 검토해 확정할 때까지(또는 실패할 때까지) 편집할 수 없다 */
  lockedFileIds: string[];
}

/** 작업본 한 개의 두 쪽. 새 문서 작업본은 한쪽이나 둘 다 null 일 수 있다(null/null 은 "만들지 않음") */
export interface RefreshDraftSides {
  current: DocumentDraft | null;
  proposed: DocumentDraft | null;
}

/** 서버가 저장한 작업본. 두 쪽은 서버가 정규형으로 맞춘 값이다 */
export interface SavedRefreshDraft extends RefreshDraftSides {
  draftRevision: number;
  matched: boolean;
}

export interface RefreshService {
  /** 가장 최근 최신화. 한 번도 하지 않았으면 IDLE 이다. 결과를 기다리는 동안 화면이 다시 읽는다 */
  latest(projectId: string): Promise<RefreshRun>;
  // 요구사항 §8.2: 추출 중에는 같은 요청을 중복 실행할 수 없다.
  start(projectId: string): Promise<RefreshStarted>;
  /** 검토할 run 과 그 작업본 전부 */
  review(projectId: string, runId: string): Promise<RefreshRunDetail>;
  /**
   * 작업본 한 개의 자동 저장. `draftRevision` 은 마지막으로 읽은 값이다. 다른 곳이 먼저 저장했으면
   * {@link RefreshDraftConflict} 를 던진다.
   */
  saveDraft(
    projectId: string,
    runId: string,
    draftId: string,
    input: RefreshDraftSides & { draftRevision: number },
  ): Promise<SavedRefreshDraft>;
  /**
   * 모든 작업본의 두 쪽이 같을 때 한 번에 반영한다. 반영할 수 없으면 {@link RefreshConfirmError} 를
   * 던진다. 성공하면 run 은 APPLIED 이고 잠금이 풀린다. 상태는 {@link latest} 로 다시 읽는다.
   */
  confirm(
    projectId: string,
    runId: string,
  ): Promise<{
    createdDocumentCount?: number;
    updatedDocumentCount?: number;
  } | void>;
}

/** 작업본을 다른 탭·기기가 먼저 저장했다. `current` 가 서버의 지금 모습이다 */
export class RefreshDraftConflict extends Error {
  constructor(readonly current: SavedRefreshDraft) {
    super(t("다른 곳에서 먼저 고친 내용으로 바꿨어요."));
    this.name = "RefreshDraftConflict";
  }
}

/**
 * 확정이 거절된 까닭 하나. `code` 는 서버 코드다.
 * <ul>
 *   <li>REJECTED_CANDIDATE: 만들지 않기로 한 새 문서를 가리키는 관계가 남아 있다(`target`)
 *   <li>INVALID_RELATION_TARGET: 관계 대상이 없거나 휴지통에 있다(`target`)
 *   <li>BODY_REQUIRED: 옛 형식 문서의 본문이 비어 있어 쓸 수 없다(`draftId`)
 *   <li>RELATION_CONFLICT: 같은 두 문서 사이 관계를 한쪽은 더하고 한쪽은 뺐다(`one`, `other`)
 * </ul>
 */
export interface RefreshProblem {
  code: string;
  target?: string;
  draftId?: string;
  one?: string;
  other?: string;
}

/**
 * 확정이 거절됐다. 아무것도 반영되지 않았다.
 * <ul>
 *   <li>REFRESH_DRAFTS_UNMATCHED: 아직 두 쪽을 맞추지 않은 작업본이 있다(`draftIds`)
 *   <li>REFRESH_DOCUMENTS_CHANGED: 작업본을 뜬 뒤 문서가 바뀌었다(`draftIds`)
 *   <li>REFRESH_DRAFTS_INVALID: 맞춘 내용을 그대로 쓸 수 없다(`problems`)
 * </ul>
 */
export class RefreshConfirmError extends Error {
  constructor(
    readonly code:
      | "REFRESH_DRAFTS_UNMATCHED"
      | "REFRESH_DOCUMENTS_CHANGED"
      | "REFRESH_DRAFTS_INVALID",
    readonly draftIds: string[],
    readonly problems: RefreshProblem[],
  ) {
    super(t("변경 사항을 반영하지 못했어요."));
    this.name = "RefreshConfirmError";
  }
}

export interface ChatStreamHandlers {
  onPhase(phase: ChatPhase): void;
  onActivity(activity: ChatActivity): void;
  onCitation(index: number, citation: ChatCitation): void;
  onDelta(text: string): void;
}

export interface ChatSendInput {
  content: string;
  intent: ChatIntent;
  quote: ChatQuote | null;
  replaces: string | null;
}

export interface ChatTurn {
  question: ChatMessage;
  answer: ChatMessage;
  usage: ChatUsage | null;
}

export interface ChatService {
  availability(projectId: string): Promise<ChatAvailability>;
  usage(): Promise<ChatUsage>;
  sessions(projectId: string): Promise<ChatSession[]>;
  search(projectId: string, query: string): Promise<ChatSearchHit[]>;
  createSession(projectId: string): Promise<ChatSession>;
  renameSession(sessionId: string, title: string): Promise<ChatSession>;
  deleteSession(sessionId: string): Promise<void>;
  messages(sessionId: string): Promise<ChatMessage[]>;
  send(
    sessionId: string,
    input: ChatSendInput,
    handlers: ChatStreamHandlers,
    signal: AbortSignal,
  ): Promise<ChatTurn>;
}

/**
 * 설정 오류 점검. 원고 회차 하나를 앞 회차와 설정 문서에 대조한다. 점검은 서버에서 몇 분 걸리는
 * 작업이라, 시작하면 RUNNING 인 run 을 받고 끝날 때까지 다시 읽는다. 프로젝트마다 한 번에 하나만 돈다.
 */
export interface SettingCheckService {
  summary(projectId: string): Promise<SettingCheckSummary>;
  /** 그 회차의 점검 기록. 최근 것이 앞이고 설정 충돌은 싣지 않는다 */
  runs(projectId: string, documentId: string): Promise<SettingCheckRun[]>;
  run(runId: string): Promise<SettingCheckRunDetail>;
  /** 프로젝트의 판정 기록. 최근에 판정한 것이 앞이다 */
  verdicts(projectId: string): Promise<SettingCheckDecision[]>;
  start(projectId: string, documentId: string): Promise<SettingCheckRun>;
  cancel(runId: string): Promise<void>;
  setVerdict(
    findingId: string,
    verdict: SettingCheckVerdict,
    reason: string | null,
  ): Promise<SettingCheckFinding>;
  clearVerdict(findingId: string): Promise<SettingCheckFinding>;
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
  search: SearchService;
  graph: GraphService;
  refresh: RefreshService;
  chat: ChatService;
  settingChecks: SettingCheckService;
  workspaceState: WorkspaceStateService;
  help: HelpService;
  feedback: FeedbackService;
}
