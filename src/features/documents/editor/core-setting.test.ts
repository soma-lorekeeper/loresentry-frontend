import { Editor, type JSONContent } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";
import { afterEach, describe, expect, it } from "vitest";

import { bodyOf } from "@/domain/document-body";
import {
  initMerge,
  pushDocument,
  editBody,
} from "@/features/graph-refresh/merge";

import { mergeParagraphs } from "../merge-text";
import {
  coreBlockCount,
  coreTargetsOf,
  normalizeCore,
  toggleCore,
} from "./core-setting";
import { createDocumentExtensions } from "./extensions";
import { documentJSON } from "./text-align";

const text = (value: string) => [{ type: "text", text: value }];

const marked: JSONContent = {
  type: "doc",
  content: [
    { type: "heading", attrs: { level: 2, core: true }, content: text("규칙") },
    {
      type: "paragraph",
      attrs: { core: true },
      content: text("북쪽 문은 낡은 열쇠 없이는 열리지 않는다."),
    },
    { type: "paragraph", content: text("하린은 매일 새벽 온실을 돈다.") },
    {
      type: "bulletList",
      content: [
        {
          type: "listItem",
          content: [
            {
              type: "paragraph",
              attrs: { core: true },
              content: text("목록 안"),
            },
          ],
        },
      ],
    },
  ],
};

let editor: Editor | null = null;

function open(content: JSONContent) {
  editor = new Editor({ extensions: createDocumentExtensions(), content });
  return editor;
}

function select(target: Editor, from: number, to: number) {
  target.view.dispatch(
    target.state.tr.setSelection(
      TextSelection.create(target.state.doc, from, to),
    ),
  );
}

afterEach(() => {
  editor?.destroy();
  editor = null;
});

describe("core setting attribute", () => {
  it("keeps top-level marks as true and drops them anywhere else", () => {
    const saved = documentJSON(open(marked));
    const blocks = saved.content ?? [];

    expect(blocks[0].attrs).toEqual({ level: 2, core: true });
    expect(blocks[1].attrs).toEqual({ core: true });
    // 표시하지 않은 문단은 이 기능이 생기기 전과 같은 모양이다.
    expect(blocks[2].attrs).toBeUndefined();
    expect(JSON.stringify(blocks[3])).not.toContain("core");
    expect(coreBlockCount(bodyOf(saved))).toBe(2);
  });

  it("survives a trip through HTML", () => {
    const html = open(marked).getHTML();
    expect(html).toContain('<p data-core="true">');
    editor!.commands.setContent(html);
    expect(coreBlockCount(bodyOf(documentJSON(editor!)))).toBe(2);
  });

  it("marks and unmarks the chosen top-level paragraphs", () => {
    const target = open(marked);
    const third =
      target.state.doc.child(0).nodeSize + target.state.doc.child(1).nodeSize;
    select(target, third + 2, third + 4);
    expect(coreTargetsOf(target.state)).toEqual({
      positions: [third],
      marked: false,
    });

    toggleCore(target);
    expect(documentJSON(target).content?.[2].attrs).toEqual({ core: true });

    select(target, third + 2, third + 4);
    toggleCore(target);
    expect(documentJSON(target).content?.[2].attrs).toBeUndefined();
  });

  it("marks every paragraph a selection spans, and unmarks only when all were marked", () => {
    const target = open(marked);
    const end =
      target.state.doc.child(0).nodeSize +
      target.state.doc.child(1).nodeSize +
      4;
    select(target, 2, end);
    expect(coreTargetsOf(target.state)?.marked).toBe(false);
    toggleCore(target);
    expect(coreBlockCount(bodyOf(documentJSON(target)))).toBe(3);
  });

  it("offers nothing inside a list", () => {
    const target = open(marked);
    const doc = target.state.doc;
    let listStart = 0;
    for (let i = 0; i < 3; i += 1) listStart += doc.child(i).nodeSize;
    select(target, listStart + 4, listStart + 6);
    expect(coreTargetsOf(target.state)).toBeNull();
    expect(toggleCore(target)).toBe(false);
  });

  it("does not split a mark onto the next paragraph", () => {
    const target = open(marked);
    const end =
      target.state.doc.child(0).nodeSize +
      target.state.doc.child(1).nodeSize -
      1;
    select(target, end, end);
    target.commands.splitBlock();
    const blocks = documentJSON(target).content ?? [];
    expect(blocks[1].attrs).toEqual({ core: true });
    expect(blocks[2].attrs).toBeUndefined();
  });

  it("normalizes a stray false or nested mark away", () => {
    expect(
      normalizeCore({
        type: "doc",
        content: [
          { type: "paragraph", attrs: { core: false }, content: text("a") },
          {
            type: "blockquote",
            content: [
              { type: "paragraph", attrs: { core: true }, content: text("b") },
            ],
          },
        ],
      }),
    ).toEqual({
      type: "doc",
      content: [
        { type: "paragraph", content: text("a") },
        {
          type: "blockquote",
          content: [{ type: "paragraph", content: text("b") }],
        },
      ],
    });
  });
});

describe("core marks through merges", () => {
  const base = bodyOf(marked);

  it("keeps a mark when another paragraph was merged in from elsewhere", () => {
    const mine = bodyOf({
      ...marked,
      content: marked.content!.map((block, i) =>
        i === 2
          ? {
              type: "paragraph",
              content: text("하린은 매일 새벽 온실을 두 번 돈다."),
            }
          : block,
      ),
    });
    const theirs = bodyOf({
      ...marked,
      content: marked.content!.map((block, i) =>
        i === 0 ? { ...block, content: text("문의 규칙") } : block,
      ),
    });
    const merged = mergeParagraphs(base, mine, theirs);
    expect(merged.ok && merged.body.doc.content?.[1].attrs).toEqual({
      core: true,
    });
    expect(merged.ok && merged.body.doc.content?.[0].attrs).toEqual({
      level: 2,
      core: true,
    });
  });

  it("does not lose a mark when the refresh review takes the proposed side", () => {
    const current = { title: "북쪽 온실", body: base, properties: [] };
    const proposed = {
      title: "북쪽 온실",
      body: bodyOf({
        type: "doc",
        content: [
          { type: "heading", attrs: { level: 2 }, content: text("규칙") },
          {
            type: "paragraph",
            content: text("북쪽 문은 낡은 열쇠 없이는 열리지 않는다."),
          },
          { type: "paragraph", content: text("새로 더한 문단.") },
        ],
      }),
      properties: [],
    };
    const state = pushDocument(
      initMerge([{ fileId: "north", current, proposed }]),
      "north",
      "<<",
    );
    const blocks = state.left.get("north")!.body.doc.content ?? [];
    expect(blocks[0].attrs).toEqual({ level: 2, core: true });
    expect(blocks[1].attrs).toEqual({ core: true });
    expect(blocks[2].attrs).toBeUndefined();
  });

  it("carries a mark over when the marked line is rewritten in the review", () => {
    const current = { title: "북쪽 온실", body: base, properties: [] };
    const state = editBody(
      initMerge([{ fileId: "north", current, proposed: null }]),
      "north",
      "left",
      "규칙\n북쪽 문은 낡은 열쇠로만 열린다.\n하린은 매일 새벽 온실을 돈다.\n목록 안",
    );
    const blocks = state.left.get("north")!.body.doc.content ?? [];
    expect(blocks[1]).toEqual({
      type: "paragraph",
      attrs: { core: true },
      content: text("북쪽 문은 낡은 열쇠로만 열린다."),
    });
    expect(blocks[0].attrs).toEqual({ level: 2, core: true });
  });
});
