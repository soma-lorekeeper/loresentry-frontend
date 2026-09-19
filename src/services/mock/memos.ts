import type { Memo } from "@/domain/models";

import { ServiceError } from "../errors";
import type { MemoService } from "../ports";

import { simulate } from "./control";
import { getDb, nextId, persistDb } from "./db";

function requireMemo(memoId: string) {
  const memo = getDb().memos.find((m) => m.id === memoId);
  if (!memo) throw new ServiceError("not-found", "메모를 찾을 수 없어요.");
  return memo;
}

export const mockMemos: MemoService = {
  list: (projectId, scope, fileId) =>
    simulate("memos.list", () =>
      getDb()
        .memos.filter(
          (m) =>
            m.projectId === projectId &&
            m.scope === scope &&
            (scope === "project" ||
              fileId === undefined ||
              m.fileId === fileId),
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    ),
  create: ({ projectId, scope, fileId, body }) =>
    simulate("memos.create", () => {
      const memo: Memo = {
        id: nextId("memo"),
        projectId,
        scope,
        fileId: scope === "file" ? fileId : null,
        title: "",
        body,
        updatedAt: new Date().toISOString(),
      };
      getDb().memos.push(memo);
      persistDb();
      return memo;
    }),
  update: (memoId, body) =>
    simulate("memos.update", () => {
      const memo = requireMemo(memoId);
      memo.body = body;
      memo.updatedAt = new Date().toISOString();
      persistDb();
      return memo;
    }),
  remove: (memoId) =>
    simulate("memos.remove", () => {
      const db = getDb();
      db.memos = db.memos.filter((m) => m.id !== memoId);
      persistDb();
    }),
};
