import type { AccountService, AuthService, TermsView } from "../ports";
import { ServiceError } from "../errors";

import { simulate } from "./control";
import { buildSeedDb, getDb, persistDb, resetDb } from "./db";

export const DISPLAY_NAME_MAX = 20;

const initialTerms: TermsView = {
  termsVersionId: "00000000-0000-4000-8000-000000000001",
  version: "mock-1",
  title: "Lore Sentry 서비스 이용약관",
  content:
    "화면 개발용 테스트 약관입니다.\n작성한 소설의 권리는 사용자에게 있습니다.\n운영 동의에는 서버에서 제공하는 확정 원문을 사용합니다.",
  effectiveAt: "2026-09-30T00:00:00Z",
  expiresAt: "2099-01-01T00:00:00Z",
};
let mockTerms = { ...initialTerms };
let pending = true;
export function resetMockTerms(overrides: Partial<TermsView> = {}) {
  mockTerms = { ...initialTerms, ...overrides };
  pending = true;
}
function requirePending() {
  if (!pending || Date.parse(mockTerms.expiresAt) <= Date.now()) {
    throw new ServiceError("consent-invalid", "다시 로그인해 주세요.");
  }
}

export const mockAuth: AuthService = {
  getTerms: () =>
    simulate("auth.terms", () => {
      requirePending();
      return mockTerms;
    }),
  acceptTerms: (id) =>
    simulate("auth.acceptTerms", () => {
      requirePending();
      if (id !== mockTerms.termsVersionId)
        throw new ServiceError(
          "terms-version-mismatch",
          "새 약관을 확인해 주세요.",
        );
      pending = false;
      const db = getDb();
      db.signedIn = true;
      // 동의로 가입을 마친 새 계정을 흉내 낸다. 첫 화면에서 온보딩을 볼 수 있다.
      db.user = { ...db.user, onboardingCompleted: false };
      persistDb();
    }),
  getSession: () =>
    simulate(
      "auth.session",
      () => {
        const db = getDb();
        return db.signedIn ? db.user : null;
      },
      { latencyMs: 60 },
    ),
  startGoogleLogin: (returnTo) =>
    simulate(
      "auth.login",
      () => {
        void returnTo;
        getDb().signedIn = true;
        persistDb();
      },
      { latencyMs: 900 },
    ),
  logout: () =>
    simulate("auth.logout", () => {
      getDb().signedIn = false;
      persistDb();
    }),
};

export const mockAccount: AccountService = {
  getAccount: () => simulate("account.get", () => getDb().user),
  updateDisplayName: (displayName) =>
    simulate("account.update", () => {
      const trimmed = displayName.trim();
      if (!trimmed || trimmed.length > DISPLAY_NAME_MAX) {
        throw new ServiceError(
          "validation",
          `표시 이름은 1~${DISPLAY_NAME_MAX}자로 입력해 주세요.`,
        );
      }
      const db = getDb();
      db.user = { ...db.user, displayName: trimmed };
      persistDb();
      return db.user;
    }),
  completeOnboarding: () =>
    simulate("account.completeOnboarding", () => {
      const db = getDb();
      db.user = { ...db.user, onboardingCompleted: true };
      persistDb();
    }),
  deleteAccount: (confirmationEmail) =>
    simulate("account.delete", () => {
      const db = getDb();
      if (
        confirmationEmail.trim().toLowerCase() !== db.user.email.toLowerCase()
      ) {
        throw new ServiceError(
          "confirmation-mismatch",
          "입력한 이메일이 계정 이메일과 달라요.",
          "account.delete",
        );
      }
      // 서버처럼 계정과 모든 프로젝트를 지운다. 다음 로그인은 빈 새 계정으로 시작한다.
      const fresh = buildSeedDb();
      resetDb({
        ...fresh,
        signedIn: false,
        user: { ...fresh.user, onboardingCompleted: false },
        projects: [],
        files: [],
        documents: {},
        favorites: {},
        memos: [],
        versions: [],
        chatSessions: [],
        chatMessages: [],
        workspaceStates: {},
        refreshRuns: {},
      });
    }),
};
