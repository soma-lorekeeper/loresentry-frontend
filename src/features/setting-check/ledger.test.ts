import { describe, expect, it } from "vitest";

import type { DocumentNode, FileNode, FolderNode } from "@/domain/models";
import type {
  SettingCheckRun,
  SettingCheckSummary,
} from "@/domain/setting-check";

import {
  chapterStatus,
  historyOf,
  latestRun,
  ledgerGroups,
  openCount,
  shortTitle,
} from "./ledger";
import { previousChapter } from "./setting-check-watcher";

function folder(
  id: string,
  parentId: string | null,
  role: FolderNode["role"],
): FolderNode {
  return {
    kind: "folder",
    id,
    projectId: "p",
    parentId,
    title: id,
    rank: "1",
    trashedAt: null,
    role,
    category: role === "category" ? "manuscript" : null,
  };
}

function chapter(id: string, parentId: string, revisionNo = 5): DocumentNode {
  return {
    kind: "document",
    id,
    projectId: "p",
    parentId,
    title: `${id} · 제목`,
    rank: "1",
    trashedAt: null,
    docType: "manuscript",
    locked: false,
    refreshLocked: false,
    revisionNo,
    updatedAt: "2026-10-27T00:00:00Z",
  };
}

const nodes: FileNode[] = [
  folder("manuscripts", null, "category"),
  folder("ep-3", "manuscripts", "episode"),
  chapter("8화", "ep-3"),
  chapter("9화", "ep-3"),
  folder("ep-4", "manuscripts", "episode"),
  chapter("12화", "ep-4"),
  chapter("13화", "ep-4"),
  { ...chapter("설정", "manuscripts"), docType: "place" },
];

function run(overrides: Partial<SettingCheckRun>): SettingCheckRun {
  return {
    id: "run",
    projectId: "p",
    documentId: "12화",
    documentTitle: "12화",
    revisionNo: 5,
    status: "DONE",
    stage: null,
    createdAt: "2026-10-27T12:00:00Z",
    finishedAt: "2026-10-27T12:02:00Z",
    read: {
      manuscripts: 11,
      fromOrdinal: 1,
      toOrdinal: 11,
      settings: 21,
      coreFacts: 0,
    },
    counts: { open: 0, intended: 0, notConflict: 0 },
    failureCode: null,
    ...overrides,
  };
}

function summary(...runs: SettingCheckRun[]): SettingCheckSummary {
  return {
    running: runs.find((item) => item.status === "RUNNING") ?? null,
    chapters: runs.map((item) => ({
      documentId: item.documentId,
      latest: item,
    })),
  };
}

describe("ledgerGroups", () => {
  it("lists manuscripts by episode with the newest first", () => {
    const groups = ledgerGroups(nodes);
    expect(groups.map((group) => group.episode?.id)).toEqual(["ep-4", "ep-3"]);
    expect(groups[0].chapters.map((item) => item.id)).toEqual(["13화", "12화"]);
    expect(groups.flatMap((group) => group.chapters)).toHaveLength(4);
  });

  it("follows the tree even when the server lists folders and documents apart", () => {
    const [manuscripts, ep3, ch8, ch9, ep4, ch12, ch13, place] = nodes;
    const groups = ledgerGroups([
      manuscripts,
      ep3,
      ep4,
      ch8,
      ch12,
      ch9,
      place,
      ch13,
    ]);
    expect(groups.map((group) => group.episode?.id)).toEqual(["ep-4", "ep-3"]);
    expect(
      groups.map((group) => group.chapters.map((item) => item.id)),
    ).toEqual([
      ["13화", "12화"],
      ["9화", "8화"],
    ]);
  });
});

describe("chapterStatus", () => {
  const status = (latest: Partial<SettingCheckRun>, revision = 5) =>
    chapterStatus("12화", revision, summary(run(latest))).kind;

  it("names every state a chapter row can show", () => {
    expect(chapterStatus("13화", 5, summary(run({})))).toEqual({
      kind: "unchecked",
    });
    expect(status({ status: "RUNNING", stage: "READING" })).toBe("running");
    expect(status({ counts: { open: 3, intended: 1, notConflict: 0 } })).toBe(
      "open",
    );
    expect(status({ counts: { open: 0, intended: 1, notConflict: 0 } })).toBe(
      "intended",
    );
    expect(status({ counts: { open: 0, intended: 0, notConflict: 2 } })).toBe(
      "clean",
    );
    expect(status({ status: "FAILED" })).toBe("failed");
    expect(status({ status: "CANCELLED" })).toBe("cancelled");
  });

  it("says the chapter changed when it is newer than the checked revision", () => {
    expect(
      status({ counts: { open: 3, intended: 0, notConflict: 0 } }, 6),
    ).toBe("changed");
    expect(status({ status: "FAILED" }, 6)).toBe("failed");
  });

  it("shows the running check even when the latest finished run is older", () => {
    const value: SettingCheckSummary = {
      running: run({ id: "new", status: "RUNNING", stage: "JUDGING" }),
      chapters: [{ documentId: "12화", latest: run({}) }],
    };
    expect(chapterStatus("12화", 5, value)).toMatchObject({
      kind: "running",
      run: { id: "new" },
    });
  });
});

describe("openCount", () => {
  it("adds what is left to review in each chapter's latest finished check", () => {
    expect(
      openCount(
        summary(
          run({ counts: { open: 3, intended: 1, notConflict: 0 } }),
          run({
            documentId: "9화",
            counts: { open: 2, intended: 0, notConflict: 0 },
          }),
          run({ documentId: "8화", status: "FAILED" }),
        ),
      ),
    ).toBe(5);
  });
});

describe("history", () => {
  const chapters = ledgerGroups(nodes).flatMap((group) => group.chapters);

  it("lists each checked chapter once with its latest check, newest first", () => {
    const history = historyOf(
      summary(
        run({ id: "a", documentId: "8화", createdAt: "2026-10-20T00:00:00Z" }),
        run({ id: "b", documentId: "12화", createdAt: "2026-10-27T00:00:00Z" }),
        run({ id: "c", documentId: "gone", createdAt: "2026-10-28T00:00:00Z" }),
      ),
      chapters,
    );
    expect(history.map((item) => [item.chapter.id, item.run.id])).toEqual([
      ["12화", "b"],
      ["8화", "a"],
    ]);
  });

  it("puts a running check in place of the chapter's older one", () => {
    const older = run({ id: "old", documentId: "9화" });
    const running = run({
      id: "new",
      documentId: "9화",
      status: "RUNNING",
      createdAt: "2026-10-28T00:00:00Z",
    });
    const data: SettingCheckSummary = {
      running,
      chapters: [{ documentId: "9화", latest: older }],
    };
    expect(historyOf(data, chapters).map((item) => item.run.id)).toEqual([
      "new",
    ]);
    expect(latestRun(data, "9화")?.id).toBe("new");
    expect(latestRun(data, "13화")).toBeNull();
  });
});

describe("labels", () => {
  it("shortens a numbered manuscript title only", () => {
    expect(shortTitle("12화 · 균열의 밤", "manuscript")).toBe("12화");
    expect(shortTitle("프롤로그", "manuscript")).toBe("프롤로그");
    expect(shortTitle("북쪽 · 온실", "place")).toBe("북쪽 · 온실");
  });
});

describe("previousChapter", () => {
  it("is the last chapter of the folder the new one joins", () => {
    expect(previousChapter(nodes, chapter("14화", "ep-4"))?.id).toBe("13화");
    expect(previousChapter(nodes, chapter("10화", "ep-3"))?.id).toBe("9화");
  });

  it("reads the tree, not the order the server lists nodes in", () => {
    const [manuscripts, ep3, ch8, ch9, ep4, ch12, ch13, place] = nodes;
    const apart = [manuscripts, ep3, ep4, ch12, ch8, ch13, place, ch9];
    expect(previousChapter(apart, chapter("14화", "ep-4"))?.id).toBe("13화");
    expect(previousChapter(apart, chapter("10화", "ep-3"))?.id).toBe("9화");
  });

  it("falls back to the chapter just before an empty folder", () => {
    const withEmpty = [
      ...nodes.slice(0, 4),
      folder("ep-new", "manuscripts", "episode"),
      ...nodes.slice(4),
    ];
    expect(previousChapter(withEmpty, chapter("1화", "ep-new"))?.id).toBe(
      "9화",
    );
  });
});
