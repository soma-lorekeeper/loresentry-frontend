"use client";

/**
 * 본문의 줄 단위 비교와 양쪽 직접 편집.
 *
 * 실험 레포(graph-visualization/src/diff/body-diff.tsx)를 옮겼다. 줄 번호 칸은 두지 않고,
 * 짝지은 줄 안에서 바뀐 낱말을 한 번 더 짚는다(word-diff).
 *
 * 격자는 **본문 전체가 하나**이고 줄 하나가 한 행이다. 좌우가 같은 행을 써야 같은 줄이 같은
 * 높이에 서고, 줄 수가 다른 만큼 두 띠의 높이가 벌어져 가운데 리본이 그 차이를 그린다.
 *
 * **한 쪽의 글 전체가 편집 구역 하나다(contentEditable).** 줄마다 칸을 두면 줄을 넘겨 고르거나
 * 여러 줄을 붙여 넣을 수 없고, Enter·Backspace·화살표를 손으로 다시 만들어야 한다. 하나로 두면
 * 그 일은 브라우저가 하고, 우리는 고쳐진 뒤의 글을 읽어 가기만 한다 — 한글 조합도 브라우저에
 * 맡길 수 있는 이유다. 읽어 간 값으로 그 자리에서 다시 견준다.
 */

import { useLayoutEffect, useRef, useState } from "react";

import { IconButton } from "@/design-system/primitives";

import { lineDiff, type Hunk } from "../diff/line-diff";
import type { Direction, SideName } from "./merge";
import { wordDiff, type Segment } from "./word-diff";
import styles from "./graph-diff-modal.module.css";

interface Props {
  /** 현재 버전의 본문. 문서가 없으면 undefined */
  left: string | undefined;
  right: string | undefined;
  onPush: (hunk: Hunk, direction: Direction) => void;
  /** 한쪽 글 전체가 바뀌었다 */
  onEdit: (side: SideName, text: string) => void;
}

/** 다시 그린 뒤에 커서를 세울 자리 */
interface CaretAt {
  side: SideName;
  line: number;
  offset: number;
}

/** 덩어리 하나가 격자에서 차지하는 자리 */
interface Block {
  hunk: Hunk;
  /** 시작 행(1부터) */
  row: number;
  /** 차지하는 행 수 — 좌우 중 줄이 많은 쪽이다 */
  rows: number;
}

/** 줄 하나가 놓이는 자리 */
interface LineRow {
  /** 그 쪽 글에서 몇 번째 줄인가(0부터) */
  index: number;
  row: number;
  text: string;
  /** 바뀐 덩어리 안의 줄인가 */
  changed: boolean;
  /** 짝 줄과 견준 낱말 조각. 짝이 없거나 너무 다르면 없다 */
  segments: Segment[] | null;
}

/**
 * 빈 줄에 넣어 두는 폭 0 글자.
 *
 * 아무것도 없는 칸은 높이가 0 이라 눌러서 커서를 둘 수가 없다. 공백을 넣으면 그 공백이 값으로
 * 저장된다. 폭 0 글자는 읽을 때 걷어내면 그만이다.
 */
const BLANK = "​";

function layout(hunks: Hunk[]): { blocks: Block[]; rows: number } {
  const blocks: Block[] = [];
  let row = 1;
  for (const hunk of hunks) {
    const rows = Math.max(hunk.leftLines.length, hunk.rightLines.length);
    blocks.push({ hunk, row, rows });
    row += rows;
  }
  return { blocks, rows: Math.max(row - 1, 1) };
}

function linesOf(blocks: Block[], side: SideName): LineRow[] {
  const out: LineRow[] = [];
  for (const { hunk, row } of blocks) {
    const own = side === "left" ? hunk.leftLines : hunk.rightLines;
    const other = side === "left" ? hunk.rightLines : hunk.leftLines;
    const start = side === "left" ? hunk.leftStart : hunk.rightStart;
    own.forEach((text, offset) => {
      // 덩어리 안의 줄은 같은 자리의 줄과 짝짓는다. 한 줄만 고친 경우가 가장 흔하다.
      const pair = hunk.same ? null : other[offset];
      const marks =
        pair === undefined || pair === null
          ? null
          : wordDiff(
              side === "left" ? text : pair,
              side === "left" ? pair : text,
            );
      out.push({
        index: start + offset,
        row: row + offset,
        text,
        changed: !hunk.same,
        segments: marks ? marks[side] : null,
      });
    });
  }
  // 글이 통째로 비어 있어도 커서를 둘 자리는 하나 있어야 한다.
  if (out.length === 0)
    out.push({ index: 0, row: 1, text: "", changed: false, segments: null });
  return out;
}

export function BodyCompare({ left, right, onPush, onEdit }: Props) {
  const hunks = lineDiff(left ?? "", right ?? "");
  const { blocks, rows } = layout(hunks);
  const lines = {
    left: linesOf(blocks, "left"),
    right: linesOf(blocks, "right"),
  };

  const box = useRef<HTMLDivElement>(null);
  /**
   * 고친 뒤에 화면을 다시 세우므로 커서는 저절로 따라가지 않는다. 옮겨 둘 자리다.
   *
   * 상태가 아니라 표시(ref)다. 고치면 어차피 다시 그려지므로, 그려진 직후에 한 번 읽고 지운다.
   */
  const caretAt = useRef<CaretAt | null>(null);
  /**
   * 고칠 때마다 하나씩 오른다. 편집 구역을 통째로 다시 세우는 열쇠다 — 브라우저가 글을 고치며
   * 만든 요소는 React 가 알지 못해, 그대로 두면 화면과 값이 조용히 갈라진다.
   */
  const [nonce, setNonce] = useState({ left: 0, right: 0 });

  useLayoutEffect(() => {
    const at = caretAt.current;
    if (!at) return;
    caretAt.current = null;
    const pane = box.current?.querySelector<HTMLElement>(
      `[data-pane="${at.side}"]`,
    );
    const line = pane?.querySelector<HTMLElement>(
      `[data-line-index="${at.line}"]`,
    );
    if (pane && line) placeCaret(pane, line, at.offset);
  });

  const rebuild = (side: SideName) =>
    setNonce((seen) => ({ ...seen, [side]: seen[side] + 1 }));

  const commit = (side: SideName, pane: HTMLElement, drawn: number) => {
    // 커서 자리는 다시 그리기 전에 잰다. 지금 화면에 있는 것이 방금 고친 글이다.
    const at = caretPoint(pane);
    const text = readNodes(pane.childNodes);
    if (text !== (side === "left" ? left : right)) onEdit(side, text);
    // 브라우저가 줄 요소를 늘리거나 지웠을 때에만 통째로 다시 세운다. 글자만 바뀐 때까지
    // 다시 세우면 빨리 치는 동안 화면이 자꾸 새로 서서 글자가 흘린다.
    if (pane.childElementCount !== drawn) rebuild(side);
    if (at) caretAt.current = { side, ...at };
  };

  /** 줄 끊기는 브라우저에 맡기지 않는다. 맡기면 한 번 눌렀는데 두 줄이 생긴다. */
  const split = (side: SideName, pane: HTMLElement) => {
    const text = readNodes(pane.childNodes);
    const at = selectionRange(pane);
    if (!at) return;
    const from = absolute(text, at.start);
    const to = absolute(text, at.end);
    onEdit(side, `${text.slice(0, from)}\n${text.slice(to)}`);
    rebuild(side);
    caretAt.current = { side, line: at.start.line + 1, offset: 0 };
  };

  const present = { left: left !== undefined, right: right !== undefined };

  return (
    <div
      ref={box}
      className={styles.body}
      style={{ gridTemplateRows: `repeat(${rows}, auto)` }}
    >
      {/*
        띠·리본·화살표가 먼저다. 글자보다 앞에 두어야 그 뒤에 깔린다.
        한쪽에만 있는 문서는 문서 전체가 하나의 차이다 — 줄마다 짚지 않고, 위의 문서 화살표로 다룬다.
      */}
      {present.left &&
        present.right &&
        blocks.map((block, index) => (
          <Marks
            key={`${block.hunk.leftStart}-${block.hunk.rightStart}-${index}`}
            block={block}
            present={present}
            onPush={onPush}
          />
        ))}
      {(["left", "right"] as const).map((side) =>
        present[side] ? (
          <Pane
            key={`${side}-${nonce[side]}`}
            side={side}
            lines={lines[side]}
            onCommit={commit}
            onSplit={split}
          />
        ) : null,
      )}
    </div>
  );
}

function Pane({
  side,
  lines,
  onCommit,
  onSplit,
}: {
  side: SideName;
  lines: LineRow[];
  onCommit: (side: SideName, pane: HTMLElement, drawn: number) => void;
  onSplit: (side: SideName, pane: HTMLElement) => void;
}) {
  return (
    <div
      className={styles.pane}
      data-pane={side}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      role="textbox"
      aria-multiline="true"
      aria-label={`${side === "left" ? "현재" : "신규"} 버전 본문`}
      // 조합 중에는 손대지 않는다. 도중에 화면을 다시 세우면 한글 조합이 끊긴다.
      onInput={(event) => {
        if (
          event.nativeEvent instanceof InputEvent &&
          event.nativeEvent.isComposing
        )
          return;
        onCommit(side, event.currentTarget, lines.length);
      }}
      // 조합이 끝난 뒤 input 이 다시 오지 않는 브라우저가 있다. 끝난 자리에서 한 번 읽는다.
      onCompositionEnd={(event) =>
        onCommit(side, event.currentTarget, lines.length)
      }
      onKeyDown={(event) => {
        // 조합 중의 Enter 는 글자를 확정하는 키다. 가로채면 조합이 깨진다.
        if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
        event.preventDefault();
        onSplit(side, event.currentTarget);
      }}
      // 서식은 받지 않는다. 붙여 넣은 요소가 줄 구조를 흐트러뜨린다.
      onPaste={(event) => {
        event.preventDefault();
        const text = event.clipboardData.getData("text/plain");
        document.execCommand("insertText", false, text);
      }}
    >
      {lines.map((line) => (
        <span
          // 글이 바뀌면 줄을 통째로 갈아 끼운다. 안쪽 표시만 고치려 들면 브라우저가 이미
          // 지워 버린 조각을 React 가 지우려다 넘어진다.
          key={`${line.index}:${line.text}:${line.segments ? "m" : ""}`}
          className={styles.line}
          data-line-index={line.index}
          data-changed={line.changed || undefined}
          style={{ gridRow: `${line.row} / ${line.row + 1}` }}
        >
          {line.text === ""
            ? BLANK
            : line.segments
              ? line.segments.map((segment, index) =>
                  segment.changed ? (
                    <mark key={index} className={styles.word}>
                      {segment.text}
                    </mark>
                  ) : (
                    segment.text
                  ),
                )
              : line.text}
        </span>
      ))}
    </div>
  );
}

/**
 * 띠·리본·화살표. 글자는 편집 구역이 그리므로 여기서는 그리지 않는다 — 안에 두면 글과 함께
 * 골라지고 지워진다.
 */
function Marks({
  block,
  present,
  onPush,
}: {
  block: Block;
  present: { left: boolean; right: boolean };
  onPush: (hunk: Hunk, direction: Direction) => void;
}) {
  const { hunk, row, rows } = block;
  const leftRef = useRef<HTMLDivElement>(null);
  const rightRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ left: 0, right: 0 });

  // 리본의 높이는 그려진 띠를 재서 쓴다. 줄 수 × 줄 높이로 셈하면 긴 줄이 접힐 때마다 어긋난다.
  useLayoutEffect(() => {
    if (hunk.same) return;
    const measure = () =>
      setSize({
        left: leftRef.current?.offsetHeight ?? 0,
        right: rightRef.current?.offsetHeight ?? 0,
      });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    if (leftRef.current) observer.observe(leftRef.current);
    if (rightRef.current) observer.observe(rightRef.current);
    return () => observer.disconnect();
  }, [hunk]);

  if (hunk.same) return null;
  const height = Math.max(size.left, size.right, 1);
  const label = `본문 ${hunk.leftStart + 1}번째 줄`;

  return (
    <>
      {hunk.leftLines.length > 0 && present.left && (
        <div
          ref={leftRef}
          className={styles.band}
          data-side="left"
          style={{
            gridArea: `${row} / 1 / ${row + hunk.leftLines.length} / 2`,
          }}
        />
      )}
      {hunk.rightLines.length > 0 && present.right && (
        <div
          ref={rightRef}
          className={styles.band}
          data-side="right"
          style={{
            gridArea: `${row} / 3 / ${row + hunk.rightLines.length} / 4`,
          }}
        />
      )}
      {/*
        두 띠를 잇는 리본. 왼쪽 변이 현재 버전 구간의 높이, 오른쪽 변이 신규 버전 구간의 높이다.
        한쪽이 비면 쐐기가 되어 어느 쪽에서 나온 줄인지 보인다. 감싸는 칸은 도형이 행 높이를
        밀어 올리지 않게 하려는 것이다.
      */}
      <div
        className={styles.ribbonCell}
        style={{ gridArea: `${row} / 2 / ${row + rows} / 3` }}
      >
        <svg
          className={styles.ribbon}
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d={`M 0 0 L 100 0 L 100 ${size.right} C 62 ${size.right} 38 ${size.left} 0 ${size.left} Z`}
          />
        </svg>
        <span className={styles.arrows}>
          {present.left && (
            <IconButton
              icon="chevrons-right"
              iconSize={14}
              label={`${label}: 현재 버전 값을 신규 버전에 넣기`}
              onClick={() => onPush(hunk, ">>")}
            />
          )}
          {present.right && (
            <IconButton
              icon="chevrons-left"
              iconSize={14}
              label={`${label}: 신규 버전 값을 현재 버전에 넣기`}
              onClick={() => onPush(hunk, "<<")}
            />
          )}
        </span>
      </div>
    </>
  );
}

/* --- 화면에서 글 읽어 오기 ------------------------------------------------ */

/**
 * 그려진 요소에서 글을 읽어 온다. 줄 요소 하나가 한 줄이다. 요소 사이에 맨 글자가 남아 있으면
 * 앞 줄 끝에 붙인다 — 브라우저가 가끔 그렇게 두는데, 새 줄로 치면 없던 줄바꿈이 생긴다.
 */
function readNodes(nodes: ArrayLike<ChildNode>): string {
  const lines: string[] = [];
  for (const node of Array.from(nodes)) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent ?? "";
      if (lines.length === 0) lines.push(text);
      else lines[lines.length - 1] += text;
      continue;
    }
    if (!(node instanceof Element)) continue;
    for (const part of blockText(node).split("\n")) lines.push(part);
  }
  return lines.join("\n").replaceAll(BLANK, "");
}

/** 줄 하나 안의 글. 안에 든 `<br>` 은 줄바꿈으로 친다 */
function blockText(element: Element): string {
  let out = "";
  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE) out += node.textContent ?? "";
    else if (node instanceof Element)
      out += node.tagName === "BR" ? "\n" : blockText(node);
  }
  return out;
}

interface Point {
  line: number;
  offset: number;
}

/**
 * 구역 처음부터 그 자리까지를 잘라 내어 **읽어 오는 규칙 그대로** 센다. 브라우저가 한 줄을
 * 조각 여럿으로 쪼개 두면 focusOffset 은 마지막 조각 기준이라 그대로 쓸 수 없다.
 */
function pointAt(pane: HTMLElement, node: Node, offset: number): Point | null {
  const range = document.createRange();
  range.setStart(pane, 0);
  try {
    range.setEnd(node, offset);
  } catch {
    return null;
  }
  const before = readNodes(range.cloneContents().childNodes).split("\n");
  return { line: before.length - 1, offset: before[before.length - 1].length };
}

function caretPoint(pane: HTMLElement): Point | null {
  const selection = window.getSelection();
  if (!selection?.focusNode || !pane.contains(selection.focusNode)) return null;
  return pointAt(pane, selection.focusNode, selection.focusOffset);
}

function selectionRange(
  pane: HTMLElement,
): { start: Point; end: Point } | null {
  const selection = window.getSelection();
  if (!selection?.rangeCount) return null;
  const range = selection.getRangeAt(0);
  if (
    !pane.contains(range.startContainer) ||
    !pane.contains(range.endContainer)
  )
    return null;
  const start = pointAt(pane, range.startContainer, range.startOffset);
  const end = pointAt(pane, range.endContainer, range.endOffset);
  return start && end ? { start, end } : null;
}

/** 글 전체에서 몇 번째 글자인가. 줄바꿈도 한 글자로 센다 */
function absolute(text: string, at: Point): number {
  const lines = text.split("\n");
  let count = 0;
  for (let i = 0; i < at.line && i < lines.length; i += 1)
    count += lines[i].length + 1;
  return count + at.offset;
}

/** 그 줄의 offset 번째 글자 앞에 커서를 세운다. 줄 안에 낱말 표시가 끼어 있어도 글자로 센다 */
function placeCaret(pane: HTMLElement, line: HTMLElement, offset: number) {
  pane.focus();
  const range = document.createRange();
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let rest = offset;
  let placed = false;
  let last: Text | null = null;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    const text = node as Text;
    const length = text.data.replaceAll(BLANK, "").length;
    last = text;
    if (rest <= length) {
      range.setStart(text, Math.min(rest, text.data.length));
      placed = true;
      break;
    }
    rest -= length;
  }
  if (!placed) {
    if (last) range.setStart(last, last.data.length);
    else range.selectNodeContents(line);
  }
  range.collapse(true);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}
