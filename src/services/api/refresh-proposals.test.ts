import { describe, expect, it } from "vitest";

import { bodyFromPlainText, bodyToPlainText } from "@/domain/document-body";
import type { DocumentType } from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentNode,
  DocumentProperty,
  FileNode,
  FolderNode,
} from "@/domain/models";

import {
  buildProposals,
  chapterName,
  parentOfAdded,
  pickSources,
  pickTargets,
  sentencesOf,
} from "./refresh-proposals";

const EVENT_FOLDER: FolderNode = {
  kind: "folder",
  id: "category:EVENT",
  projectId: "p",
  parentId: null,
  title: "이벤트",
  role: "category",
  category: "event",
  rank: "0",
  trashedAt: null,
};

function node(
  id: string,
  title: string,
  docType: DocumentType,
  extra: Partial<DocumentNode> = {},
): DocumentNode {
  return {
    kind: "document",
    id,
    projectId: "p",
    parentId: null,
    title,
    rank: "0",
    trashedAt: null,
    docType,
    locked: false,
    revisionNo: 3,
    updatedAt: "2026-10-01T00:00:00Z",
    ...extra,
  };
}

function content(
  doc: DocumentNode,
  text: string,
  properties: DocumentProperty[] = [],
): DocumentContent {
  return {
    fileId: doc.id,
    projectId: "p",
    title: doc.title,
    docType: doc.docType,
    body: bodyFromPlainText(text),
    properties,
    locked: doc.locked,
    revisionNo: doc.revisionNo,
    updatedAt: doc.updatedAt,
  };
}

let counter = 0;
const newId = () => `id-${++counter}`;

const chapter = node("m1", "3화 · 잠긴 문", "manuscript", {
  updatedAt: "2026-10-05T00:00:00Z",
});
const seoyun = node("c1", "서윤", "character");
const harbor = node("l1", "은빛 항구", "place");
const tree: FileNode[] = [EVENT_FOLDER, chapter, seoyun, harbor];
const story =
  "새벽에 비가 그쳤다. 서윤은 은빛 항구에서 낡은 열쇠를 주웠다.\n서윤은 문 앞에 섰다.";

describe("refresh proposal rules", () => {
  it("splits sentences at line breaks and sentence ends", () => {
    expect(sentencesOf("하나. 둘! 셋?\n넷")).toEqual([
      "하나.",
      "둘!",
      "셋?",
      "넷",
    ]);
  });

  it("drops the chapter number so the name reads as an event", () => {
    expect(chapterName("12화 · 균열의 밤")).toBe("균열의 밤");
    expect(chapterName("Ch. 3 · The Locked Door")).toBe("The Locked Door");
    expect(chapterName("프롤로그")).toBe("프롤로그");
  });

  it("reads the most recently edited manuscripts first", () => {
    const older = node("m0", "1화", "manuscript", {
      updatedAt: "2026-09-01T00:00:00Z",
    });
    const trashed = node("m9", "9화", "manuscript", {
      updatedAt: "2026-10-09T00:00:00Z",
      trashedAt: "2026-10-09T00:00:00Z",
    });
    expect(pickSources([older, chapter, trashed, seoyun])).toEqual([
      "m1",
      "m0",
    ]);
  });

  it("targets mentioned settings, most mentioned first, and leaves locked ones alone", () => {
    const theo = node("c2", "Theo", "character");
    const locked = node("c3", "하린", "character", { locked: true });
    const sources = [
      content(chapter, `${story} 하린도 왔다. Theodore was late.`),
    ];
    expect(
      pickTargets([...tree, theo, locked], sources).map((n) => n.id),
    ).toEqual(["c1", "l1"]);
  });

  it("adds the sentence, fills an empty description and links the chapter and co-mentioned settings", () => {
    const [proposal] = buildProposals({
      tree,
      sources: [content(chapter, story)],
      targets: [content(seoyun, "기록관.")],
      newId,
    });

    expect(proposal).toMatchObject({
      kind: "modified",
      fileId: "c1",
      baseRevisionNo: 3,
    });
    expect(bodyToPlainText(proposal.proposed!.body)).toBe(
      "기록관.\n‘3화 · 잠긴 문’에서: 서윤은 은빛 항구에서 낡은 열쇠를 주웠다.",
    );
    expect(proposal.proposed!.properties).toEqual([
      expect.objectContaining({
        key: "description",
        value: "서윤은 은빛 항구에서 낡은 열쇠를 주웠다.",
      }),
      expect.objectContaining({
        key: "related_manuscript",
        targetIds: ["m1"],
      }),
      expect.objectContaining({ key: "related_place", targetIds: ["l1"] }),
    ]);
  });

  it("proposes nothing for a document that already holds what the chapter says", () => {
    const known = content(seoyun, "서윤은 은빛 항구에서 낡은 열쇠를 주웠다.", [
      {
        id: "text:description",
        kind: "text",
        key: "description",
        label: "설명",
        value: "기록관",
      },
      {
        id: "relation:related_manuscript",
        kind: "relation",
        key: "related_manuscript",
        label: "관련 원고",
        targetType: "manuscript",
        targetIds: ["m1"],
        descriptions: {},
      },
      {
        id: "relation:related_place",
        kind: "relation",
        key: "related_place",
        label: "관련 장소",
        targetType: "place",
        targetIds: ["l1"],
        descriptions: {},
      },
    ]);
    const proposals = buildProposals({
      tree,
      sources: [content(chapter, story)],
      targets: [known],
      newId,
    });
    expect(proposals.filter((p) => p.kind === "modified")).toEqual([]);
  });

  it("suggests an event for a chapter with none, linked to who appears in it", () => {
    const proposals = buildProposals({
      tree,
      sources: [content(chapter, story)],
      targets: [],
      newId,
    });
    const event = proposals.find((p) => p.kind === "added")!;

    expect(event.title).toBe("잠긴 문에서 생긴 일");
    expect(parentOfAdded(event.fileId)).toBe("category:EVENT");
    expect(bodyToPlainText(event.proposed!.body)).toBe(
      "새벽에 비가 그쳤다. 서윤은 은빛 항구에서 낡은 열쇠를 주웠다.\n‘3화 · 잠긴 문’에서 정리했어요.",
    );
    expect(
      event.proposed!.properties.map((p) =>
        p.kind === "relation" ? [p.key, p.targetIds] : p.key,
      ),
    ).toEqual([
      "description",
      ["related_manuscript", ["m1"]],
      ["related_character", ["c1"]],
      ["related_place", ["l1"]],
    ]);
  });

  it("does not suggest an event that already exists under the chapter's name", () => {
    const proposals = buildProposals({
      tree: [...tree, node("e1", "잠긴 문", "event")],
      sources: [content(chapter, story)],
      targets: [],
      newId,
    });
    expect(proposals).toEqual([]);
  });
});
