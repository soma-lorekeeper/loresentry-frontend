import type { DocumentProperty } from "@/domain/models";
import { lineDiff } from "@/features/diff/line-diff";

export interface CompareRow {
  key: string;
  label: string | null;
  left: CompareCell;
  right: CompareCell;
  changed: boolean;
}

export type CompareCell =
  | { kind: "text"; value: string }
  | { kind: "relation"; targetId: string; description: string }
  | { kind: "missing" };

export function paragraphsOf(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

export function compareProperties(
  left: DocumentProperty[],
  right: DocumentProperty[],
): CompareRow[] {
  const keys = [
    ...left.map((p) => p.key),
    ...right
      .map((p) => p.key)
      .filter((key) => !left.some((p) => p.key === key)),
  ];
  const rows: CompareRow[] = [];
  for (const key of keys) {
    const a = left.find((p) => p.key === key);
    const b = right.find((p) => p.key === key);
    const label = (b ?? a)?.label ?? key;
    if (a?.kind === "relation" || b?.kind === "relation") {
      const leftIds = a?.kind === "relation" ? a.targetIds : [];
      const rightIds = b?.kind === "relation" ? b.targetIds : [];
      const ids = [
        ...leftIds,
        ...rightIds.filter((id) => !leftIds.includes(id)),
      ];
      const leftNotes = a?.kind === "relation" ? (a.descriptions ?? {}) : {};
      const rightNotes = b?.kind === "relation" ? (b.descriptions ?? {}) : {};
      ids.forEach((id, index) => {
        const inLeft = leftIds.includes(id);
        const inRight = rightIds.includes(id);
        rows.push({
          key: `${key}:${id}`,
          label: index === 0 ? label : null,
          left: inLeft
            ? {
                kind: "relation",
                targetId: id,
                description: leftNotes[id] ?? "",
              }
            : { kind: "missing" },
          right: inRight
            ? {
                kind: "relation",
                targetId: id,
                description: rightNotes[id] ?? "",
              }
            : { kind: "missing" },
          changed:
            inLeft !== inRight ||
            (leftNotes[id] ?? "") !== (rightNotes[id] ?? ""),
        });
      });
      if (ids.length === 0)
        rows.push({
          key,
          label,
          left: { kind: "missing" },
          right: { kind: "missing" },
          changed: false,
        });
      continue;
    }
    const leftValue = a?.kind === "text" ? a.value : "";
    const rightValue = b?.kind === "text" ? b.value : "";
    rows.push({
      key,
      label,
      left: a ? { kind: "text", value: leftValue } : { kind: "missing" },
      right: b ? { kind: "text", value: rightValue } : { kind: "missing" },
      changed: leftValue !== rightValue,
    });
  }
  return rows;
}

export interface BodyRow {
  left: string | null;
  right: string | null;
  changed: boolean;
}

export function compareBodies(left: string, right: string): BodyRow[] {
  const hunks = lineDiff(
    paragraphsOf(left).join("\n"),
    paragraphsOf(right).join("\n"),
  );
  const rows: BodyRow[] = [];
  for (const hunk of hunks) {
    const length = Math.max(hunk.leftLines.length, hunk.rightLines.length);
    for (let index = 0; index < length; index += 1) {
      rows.push({
        left: hunk.leftLines[index] ?? null,
        right: hunk.rightLines[index] ?? null,
        changed: !hunk.same,
      });
    }
  }
  return rows;
}
