import { describe, expect, it } from "vitest";

import type { DocumentNode, FileNode, FolderNode } from "@/domain/models";
import type {
  SettingCheckRun,
  SettingCheckSummary,
} from "@/domain/setting-check";

import {
  chapterStatus,
  defaultChapter,
  ledgerGroups,
  openCount,
  readLabel,
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

describe("defaultChapter", () => {
  const chapters = ledgerGroups(nodes).flatMap((group) => group.chapters);

  it("prefers the running chapter, then the latest checked, then the top one", () => {
    expect(
      defaultChapter(
        chapters,
        summary(run({ documentId: "9화", status: "RUNNING" })),
      ),
    ).toBe("9화");
    expect(defaultChapter(chapters, summary(run({ documentId: "8화" })))).toBe(
      "8화",
    );
    expect(defaultChapter(chapters, summary())).toBe("13화");
  });
});

describe("labels", () => {
  it("shortens a numbered manuscript title only", () => {
    expect(shortTitle("12화 · 균열의 밤", "manuscript")).toBe("12화");
    expect(shortTitle("프롤로그", "manuscript")).toBe("프롤로그");
    expect(shortTitle("북쪽 · 온실", "place")).toBe("북쪽 · 온실");
  });

  it("says what is being read", () => {
    expect(readLabel(run({}).read)).toBe(
      "1–11화와 설정 문서 21개를 읽고 있어요.",
    );
    expect(
      readLabel({
        manuscripts: 0,
        fromOrdinal: null,
        toOrdinal: null,
        settings: 4,
        coreFacts: 0,
      }),
    ).toBe("설정 문서 4개를 읽고 있어요.");
    expect(
      readLabel({
        manuscripts: 1,
        fromOrdinal: 1,
        toOrdinal: 1,
        settings: 4,
        coreFacts: 0,
      }),
    ).toBe("1화와 설정 문서 4개를 읽고 있어요.");
  });
});

describe("previousChapter", () => {
  it("is the last chapter of the folder the new one joins", () => {
    expect(previousChapter(nodes, chapter("14화", "ep-4"))?.id).toBe("13화");
    expect(previousChapter(nodes, chapter("10화", "ep-3"))?.id).toBe("9화");
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
