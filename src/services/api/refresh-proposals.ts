import {
  bodyBlocks,
  bodyFromBlocks,
  bodyToPlainText,
  type DocumentBody,
} from "@/domain/document-body";
import {
  DOCUMENT_TYPE_META,
  relationKeyOf,
  type DocumentType,
} from "@/domain/document-types";
import type {
  DocumentContent,
  DocumentDraft,
  DocumentNode,
  FileNode,
  RefreshProposal,
} from "@/domain/models";
import { t } from "@/i18n";

const MAX_TARGETS = 5;
const MAX_EVENT_LINKS = 4;

export function isActiveDocument(node: FileNode): node is DocumentNode {
  return node.kind === "document" && !node.trashedAt;
}

export function sentencesOf(text: string): string[] {
  return text
    .split(/\n+/)
    .flatMap((line) => line.split(/(?<=[.!?。？！…]["”’」』)]?)\s+/))
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length > 0);
}

function escapeRegExp(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function pattern(title: string): RegExp {
  const escaped = escapeRegExp(title);
  return /[A-Za-z]/.test(title)
    ? new RegExp(`(?<![\\p{L}\\p{N}])${escaped}(?![\\p{L}\\p{N}])`, "gu")
    : new RegExp(escaped, "gu");
}

function countIn(text: string, title: string): number {
  return text.match(pattern(title))?.length ?? 0;
}

function mentions(text: string, title: string): boolean {
  return countIn(text, title) > 0;
}

function nameOf(node: { title: string }) {
  return node.title.trim();
}

function settingsOf(tree: FileNode[]): DocumentNode[] {
  return tree.filter(
    (node): node is DocumentNode =>
      isActiveDocument(node) &&
      node.docType !== "manuscript" &&
      nameOf(node).length >= 2,
  );
}

export function pickSources(tree: FileNode[], limit = 3): string[] {
  return tree
    .filter(
      (node): node is DocumentNode =>
        isActiveDocument(node) && node.docType === "manuscript",
    )
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, limit)
    .map((node) => node.id);
}

export function pickTargets(
  tree: FileNode[],
  sources: DocumentContent[],
): DocumentNode[] {
  const text = sources.map((source) => bodyToPlainText(source.body)).join("\n");
  return settingsOf(tree)
    .filter((node) => !node.locked)
    .map((node) => ({ node, count: countIn(text, nameOf(node)) }))
    .filter((entry) => entry.count > 0)
    .sort(
      (a, b) =>
        b.count - a.count || nameOf(a.node).localeCompare(nameOf(b.node)),
    )
    .slice(0, MAX_TARGETS)
    .map((entry) => entry.node);
}

function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function draftOf(content: DocumentContent): DocumentDraft {
  return {
    title: content.title,
    body: content.body,
    properties: content.properties,
  };
}

function sameDraft(a: DocumentDraft, b: DocumentDraft): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function withParagraph(body: DocumentBody, text: string): DocumentBody {
  const blocks = [...bodyBlocks(body)];
  while (
    blocks.length > 0 &&
    blocks[blocks.length - 1].type === "paragraph" &&
    !blocks[blocks.length - 1].content?.length
  )
    blocks.pop();
  return bodyFromBlocks([
    ...blocks,
    { type: "paragraph", content: [{ type: "text", text }] },
  ]);
}

function withDescription(draft: DocumentDraft, value: string): DocumentDraft {
  const existing = draft.properties.find(
    (property) => property.kind === "text" && property.key === "description",
  );
  if (existing && existing.kind === "text" && existing.value.trim())
    return draft;
  if (existing) {
    return {
      ...draft,
      properties: draft.properties.map((property) =>
        property === existing ? { ...existing, value } : property,
      ),
    };
  }
  return {
    ...draft,
    properties: [
      {
        id: "text:description",
        kind: "text",
        key: "description",
        label: t("설명"),
        value,
      },
      ...draft.properties,
    ],
  };
}

export function withRelation(
  draft: DocumentDraft,
  targetType: DocumentType,
  targetId: string,
  description: string,
): DocumentDraft {
  const key = relationKeyOf(targetType);
  const existing = draft.properties.find(
    (property) => property.kind === "relation" && property.key === key,
  );
  if (existing && existing.kind === "relation") {
    if (existing.targetIds.includes(targetId)) return draft;
    return {
      ...draft,
      properties: draft.properties.map((property) =>
        property === existing
          ? {
              ...existing,
              targetIds: [...existing.targetIds, targetId],
              descriptions: description
                ? { ...existing.descriptions, [targetId]: description }
                : existing.descriptions,
            }
          : property,
      ),
    };
  }
  return {
    ...draft,
    properties: [
      ...draft.properties,
      {
        id: `relation:${key}`,
        kind: "relation",
        key,
        label: DOCUMENT_TYPE_META[targetType].relationLabel,
        targetType,
        targetIds: [targetId],
        descriptions: description ? { [targetId]: description } : {},
      },
    ],
  };
}

function relatedIds(draft: DocumentDraft, type: DocumentType): string[] {
  const key = relationKeyOf(type);
  return draft.properties.flatMap((property) =>
    property.kind === "relation" && property.key === key
      ? property.targetIds
      : [],
  );
}

export function chapterName(title: string): string {
  const name = title
    .replace(
      /^\s*(?:제?\s*\d+\s*화|ch(?:apter)?\.?\s*\d+|episode\s*\d+\.?)\s*[·:.\-–—]?\s*/i,
      "",
    )
    .trim();
  return name || title.trim();
}

interface Sourced {
  source: DocumentContent;
  sentences: string[];
}

function modification(
  target: DocumentContent,
  sources: Sourced[],
  settings: DocumentNode[],
  newId: () => string,
): RefreshProposal | null {
  const name = nameOf(target);
  let found: { source: DocumentContent; sentence: string } | null = null;
  for (const { source, sentences } of sources) {
    const sentence = sentences.find((line) => mentions(line, name));
    if (sentence) {
      found = { source, sentence };
      break;
    }
  }
  if (!found) return null;

  const { source, sentence } = found;
  const current = draftOf(target);
  let proposed = current;
  if (!bodyToPlainText(current.body).includes(sentence)) {
    proposed = {
      ...proposed,
      body: withParagraph(
        proposed.body,
        t("‘{chapter}’에서: {sentence}", {
          chapter: nameOf(source),
          sentence,
        }),
      ),
    };
  }
  proposed = withDescription(proposed, clip(sentence, 120));
  proposed = withRelation(
    proposed,
    "manuscript",
    source.fileId,
    clip(sentence, 80),
  );
  for (const other of settings) {
    if (other.id === target.fileId || !mentions(sentence, nameOf(other)))
      continue;
    proposed = withRelation(
      proposed,
      other.docType,
      other.id,
      clip(sentence, 80),
    );
  }
  if (sameDraft(current, proposed)) return null;
  return {
    id: newId(),
    kind: "modified",
    fileId: target.fileId,
    title: target.title,
    docType: target.docType,
    baseRevisionNo: target.revisionNo,
    current,
    proposed,
  };
}

function eventFor(
  tree: FileNode[],
  { source, sentences }: Sourced,
): string | null {
  if (relatedIds(draftOf(source), "event").length > 0) return null;
  const chapter = chapterName(source.title);
  const title = t("{chapter}에서 생긴 일", { chapter });
  const taken = tree.some(
    (node) =>
      isActiveDocument(node) &&
      node.docType === "event" &&
      (nameOf(node) === title || nameOf(node) === chapter),
  );
  return taken || sentences.length === 0 ? null : title;
}

function newEvent(
  tree: FileNode[],
  sources: Sourced[],
  settings: DocumentNode[],
  newId: () => string,
): RefreshProposal | null {
  const folder = tree.find(
    (node) =>
      node.kind === "folder" &&
      node.role === "category" &&
      node.category === "event",
  );
  if (!folder) return null;
  let picked: { entry: Sourced; title: string } | null = null;
  for (const entry of sources) {
    const title = eventFor(tree, entry);
    if (title) {
      picked = { entry, title };
      break;
    }
  }
  if (!picked) return null;
  const {
    entry: { source, sentences },
    title,
  } = picked;

  const text = bodyToPlainText(source.body);
  let proposed: DocumentDraft = {
    title,
    body: bodyFromBlocks(
      [
        sentences.slice(0, 2).join(" "),
        t("‘{chapter}’에서 정리했어요.", { chapter: nameOf(source) }),
      ].map((line) => ({
        type: "paragraph",
        content: [{ type: "text", text: line }],
      })),
    ),
    properties: [],
  };
  proposed = withDescription(proposed, clip(sentences[0], 120));
  proposed = withRelation(proposed, "manuscript", source.fileId, "");
  const linked = settings
    .filter((node) => node.docType !== "event" && mentions(text, nameOf(node)))
    .map((node) => ({ node, count: countIn(text, nameOf(node)) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_EVENT_LINKS);
  for (const { node } of linked)
    proposed = withRelation(proposed, node.docType, node.id, "");

  return {
    id: newId(),
    kind: "added",
    fileId: `new:${folder.id}:${newId()}`,
    title,
    docType: "event",
    baseRevisionNo: null,
    current: null,
    proposed,
  };
}

export function buildProposals({
  tree,
  sources,
  targets,
  newId,
}: {
  tree: FileNode[];
  sources: DocumentContent[];
  targets: DocumentContent[];
  newId: () => string;
}): RefreshProposal[] {
  const sourced = sources
    .map((source) => ({
      source,
      sentences: sentencesOf(bodyToPlainText(source.body)),
    }))
    .filter((entry) => entry.sentences.length > 0);
  const settings = settingsOf(tree);
  const proposals = targets
    .map((target) => modification(target, sourced, settings, newId))
    .filter((proposal): proposal is RefreshProposal => proposal !== null);
  const event = newEvent(tree, sourced, settings, newId);
  return event ? [...proposals, event] : proposals;
}

export function parentOfAdded(fileId: string): string {
  return fileId.split(":").slice(1, -1).join(":");
}
