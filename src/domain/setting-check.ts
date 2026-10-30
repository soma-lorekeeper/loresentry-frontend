import type { DocumentType } from "./document-types";
import type { IsoDateTime } from "./models";

export type SettingCheckStatus = "RUNNING" | "DONE" | "FAILED" | "CANCELLED";

export type SettingCheckStage = "READING" | "FINDING" | "JUDGING";

/** 작가의 판정. 다음 점검에서 같은 어긋남을 숨기고, 적은 이유를 판정 입력에 넣는다 */
export type SettingCheckVerdict = "INTENDED" | "NOT_CONFLICT";

/** SETTING 은 설정 문서와, MANUSCRIPT 는 앞 회차와 어긋난다 */
export type SettingCheckFindingKind = "SETTING" | "MANUSCRIPT";

export interface SettingCheckRead {
  manuscripts: number;
  fromOrdinal: number | null;
  toOrdinal: number | null;
  settings: number;
  coreFacts: number;
}

export interface SettingCheckCounts {
  open: number;
  intended: number;
  notConflict: number;
}

export interface SettingCheckRun {
  id: string;
  projectId: string;
  documentId: string;
  documentTitle: string;
  /** 점검한 판. 회차의 지금 판이 이보다 크면 점검한 뒤 고친 것이다 */
  revisionNo: number;
  status: SettingCheckStatus;
  stage: SettingCheckStage | null;
  createdAt: IsoDateTime;
  finishedAt: IsoDateTime | null;
  read: SettingCheckRead;
  counts: SettingCheckCounts;
  failureCode: string | null;
}

export interface SettingCheckSource {
  documentId: string;
  title: string;
  docType: DocumentType;
  ordinal: number | null;
  quote: string;
  /** 근거 문장 가운데 어긋나는 표현. 문장 안에서 찾지 못하면 null 이다 */
  quoteFocus: string | null;
}

export interface SettingCheckFinding {
  id: string;
  kind: SettingCheckFindingKind;
  core: boolean;
  confidence: "HIGH" | "LOW";
  /** 충돌로 본 근거. 근거 문서가 정한 것, 회차가 보인 것, 둘이 함께 성립하지 않는 까닭을 서너 문장으로 */
  explanation: string;
  /** 점검한 회차의 문장 */
  quote: string;
  /** 회차 문장 가운데 어긋나는 표현 */
  quoteFocus: string | null;
  source: SettingCheckSource;
  verdict: SettingCheckVerdict | null;
  reason: string | null;
}

export interface SettingCheckRunDetail extends SettingCheckRun {
  findings: SettingCheckFinding[];
}

/** 판정 기록의 한 줄. 판정이 붙은 가장 최근 점검의 어긋남과 그 회차다 */
export interface SettingCheckDecision {
  documentId: string;
  documentTitle: string;
  decidedAt: IsoDateTime;
  finding: SettingCheckFinding;
}

export interface SettingCheckSummary {
  running: SettingCheckRun | null;
  /** 점검한 적 있는 회차마다 가장 최근 점검(상태와 상관없이) */
  chapters: Array<{ documentId: string; latest: SettingCheckRun }>;
}

export const SETTING_CHECK_REASON_MAX = 500;
