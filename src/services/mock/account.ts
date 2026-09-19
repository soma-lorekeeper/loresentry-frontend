import type { AccountService, AuthService } from "../ports";
import { ServiceError } from "../errors";

import { simulate } from "./control";
import { getDb, persistDb } from "./db";

export const DISPLAY_NAME_MAX = 20;

export const mockAuth: AuthService = {
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
};
