"use client";

import { useQuery } from "@tanstack/react-query";
import {
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  Segmented,
  Tooltip,
  useToast,
} from "@/design-system/primitives";
import { blockToPlainText, bodyBlocks } from "@/domain/document-body";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type {
  SettingCheckFinding,
  SettingCheckRunDetail,
  SettingCheckSource,
  SettingCheckVerdict,
} from "@/domain/setting-check";
import { requestReveal } from "@/features/documents/reveal-request";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { anchorFindings, excerptOf, foldsOf, type Anchor } from "./anchors";
import {
  emptyDescription,
  filterOf,
  ReasonEditor,
  type Filter,
} from "./findings";
import { shortTitle } from "./ledger";
import { Marked } from "./marked";
import { useSettingCheckActions } from "./queries";
import styles from "./setting-check.module.css";

interface Layout {
  tops: Record<string, number>;
  ys: Record<string, number>;
  height: number;
  notesRight: number;
  msLeft: number;
}

const EMPTY_LAYOUT: Layout = {
  tops: {},
  ys: {},
  height: 0,
  notesRight: 0,
  msLeft: 0,
};

/** 카드 머리 줄의 가운데. 카드를 원고 문장 높이에 맞출 때 이 줄을 문장에 맞춘다 */
const HEAD_MIDDLE = 18;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );
}

/** 근거 문장과 그 앞뒤 문장. 근거 문서를 읽기 전이나 문서에서 찾지 못하면 근거 문장만 둔다 */
function SourceExcerpt({
  source,
  onReveal,
}: {
  source: SettingCheckSource;
  onReveal: () => void;
}) {
  const services = useServices();
  const doc = useQuery({
    queryKey: queryKeys.document(source.documentId),
    queryFn: () => services.documents.get(source.documentId),
    retry: false,
  });
  const lines = useMemo(
    () =>
      (doc.data &&
        excerptOf(
          bodyBlocks(doc.data.body)
            .map(blockToPlainText)
            .filter((text) => text.trim()),
          source.quote,
        )) || [
        { text: source.quote, mark: { start: 0, end: source.quote.length } },
      ],
    [doc.data, source.quote],
  );
  return (
    <button
      type="button"
      className={styles.quote}
      aria-label={t("{title}에서 보기: {quote}", {
        title: source.title,
        quote: source.quote,
      })}
      onClick={onReveal}
    >
      {lines.map((line, index) => (
        <span key={index} className={styles.excerptLine}>
          {line.mark ? (
            <>
              {line.text.slice(0, line.mark.start)}
              <span className={styles.sourceMark}>
                <Marked
                  text={line.text.slice(line.mark.start, line.mark.end)}
                  focus={source.quoteFocus}
                />
              </span>
              {line.text.slice(line.mark.end)}
            </>
          ) : (
            line.text
          )}
        </span>
      ))}
    </button>
  );
}

/** 판정 단추 옆의 설명. 두 단추가 무엇을 남기고 다음 점검에 어떻게 쓰이는지 */
function VerdictHelp() {
  const ref = useRef<HTMLButtonElement>(null);
  const id = useId();
  const help = t(
    "충돌 아니에요 · 점검이 잘못 짚었어요. 두 내용은 함께 성립해요.\n의도한 거예요 · 설정과 다른 걸 알고 일부러 썼어요.\n\n어느 쪽이든 다음 점검부터 같은 곳은 확인할 것에 올리지 않고, 남긴 이유는 AI가 참고해요. 판정 기록에서 되돌릴 수 있어요.",
  );
  return (
    <>
      <button
        ref={ref}
        type="button"
        className={styles.help}
        aria-label={t("판정 단추 설명")}
        aria-describedby={id}
      >
        <Icon name="info" size={15} />
      </button>
      <span id={id} hidden>
        {help}
      </span>
      <Tooltip anchorRef={ref} label={help} multiline />
    </>
  );
}

function Card({
  finding,
  top,
  active,
  hot,
  loose,
  editing,
  pending,
  cardRef,
  onActivate,
  onReveal,
  onEdit,
  onDecide,
  onUndo,
}: {
  finding: SettingCheckFinding;
  top: number | undefined;
  active: boolean;
  hot: boolean;
  loose: boolean;
  editing: SettingCheckVerdict | null;
  pending: boolean;
  cardRef: (element: HTMLElement | null) => void;
  onActivate: () => void;
  onReveal: () => void;
  onEdit: (verdict: SettingCheckVerdict | null) => void;
  onDecide: (verdict: SettingCheckVerdict, reason: string | null) => void;
  onUndo: () => void;
}) {
  const source = finding.source;
  const key = source.quoteFocus ?? source.quote;
  const bodyId = `setting-card-${finding.id}`;
  return (
    <article
      ref={cardRef}
      className={styles.card}
      style={{ top }}
      data-kind={source.docType}
      data-on={active || undefined}
      data-hot={hot || undefined}
      data-loose={loose || undefined}
      role="listitem"
    >
      <button
        type="button"
        className={styles.cardHead}
        aria-expanded={active}
        aria-controls={active ? bodyId : undefined}
        onClick={onActivate}
      >
        <Icon name={DOCUMENT_TYPE_META[source.docType].entityIcon} size={15} />
        <span className={styles.cardSource}>
          {shortTitle(source.title, source.docType)}
        </span>
        {finding.core && (
          <Icon name="pin" size={13} data-core label={t("중요 설정")} />
        )}
        <span className={styles.cardKey}>
          {finding.confidence === "LOW"
            ? t("확신 낮음 · {text}", { text: key })
            : key}
        </span>
      </button>
      {active && (
        <div id={bodyId} className={styles.cardBody}>
          <SourceExcerpt source={source} onReveal={onReveal} />
          <p className={styles.targetQuote}>
            <span className={styles.sourceMark}>
              <Marked text={finding.quote} focus={finding.quoteFocus} />
            </span>
          </p>
          <p className={styles.explanation}>{finding.explanation}</p>
          {finding.verdict && finding.reason && (
            <p className={styles.reason}>
              <Icon name="pen-line" size={14} />
              {finding.reason}
            </p>
          )}
          {editing ? (
            <ReasonEditor
              verdict={editing}
              pending={pending}
              onCancel={() => onEdit(null)}
              onSave={(reason) => onDecide(editing, reason)}
            />
          ) : (
            <div className={styles.actions}>
              <span className={styles.verdicts}>
                {finding.verdict ? (
                  <Button icon="undo-2" busy={pending} onClick={onUndo}>
                    {t("되돌리기")}
                  </Button>
                ) : (
                  <>
                    <VerdictHelp />
                    <Button onClick={() => onEdit("NOT_CONFLICT")}>
                      {t("충돌 아니에요")}
                    </Button>
                    <Button onClick={() => onEdit("INTENDED")}>
                      {t("의도한 거예요")}
                    </Button>
                  </>
                )}
              </span>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

/**
 * 끝난 점검의 결과. 왼쪽에 근거 카드, 오른쪽에 대상 원고를 두고 카드를 부딪히는 문장 높이에 붙인다.
 * 선은 고른 카드와, 마우스를 올린 원고 문장에 걸린 카드에만 긋는다 — 어긋남이 많아도 엉키지 않게.
 */
export function Board({
  run,
  paragraphs,
  paneId,
  header,
}: {
  run: SettingCheckRunDetail;
  /** 지금 원고의 문단. 고친 원고에서 인용을 찾지 못한 어긋남은 자리 없이 맨 위에 선다 */
  paragraphs: readonly string[];
  paneId: string;
  header: ReactNode;
}) {
  const { projectId, openBeside } = useWorkspace();
  const toast = useToast();
  const { setVerdict, clearVerdict } = useSettingCheckActions(projectId);
  const [filter, setFilter] = useState<Filter>("open");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    verdict: SettingCheckVerdict;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const [layout, setLayout] = useState<Layout>(EMPTY_LAYOUT);
  const [scroll, setScroll] = useState({ top: 0, height: 1, client: 1 });
  const [opened, setOpened] = useState<ReadonlySet<number>>(() => new Set());

  const counts: Record<Filter, number> = {
    open: 0,
    intended: 0,
    notConflict: 0,
  };
  for (const finding of run.findings) counts[filterOf(finding)] += 1;
  const visible = useMemo(
    () => run.findings.filter((finding) => filterOf(finding) === filter),
    [run.findings, filter],
  );
  const { anchors, anchorOf, ordered } = useMemo(
    () => anchorFindings(paragraphs, visible),
    [paragraphs, visible],
  );
  const folds = useMemo(
    () => foldsOf(paragraphs.length, anchors),
    [paragraphs.length, anchors],
  );
  const closed = folds.filter((fold) => !opened.has(fold.start));
  const active =
    ordered.find((finding) => finding.id === activeId) ?? ordered[0] ?? null;
  const activeKey = active ? anchorOf.get(active.id)?.key : undefined;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLDivElement>(null);
  const msRef = useRef<HTMLDivElement>(null);
  const anchorEls = useRef(new Map<string, HTMLElement>());
  const cardEls = useRef(new Map<string, HTMLElement>());
  const scrollTarget = useRef<string | null>(null);

  const measure = useCallback(() => {
    const board = boardRef.current;
    const notes = notesRef.current;
    const ms = msRef.current;
    const scroller = scrollerRef.current;
    if (!board || !notes || !ms || !scroller) return;
    const box = board.getBoundingClientRect();
    const ys: Record<string, number> = {};
    for (const anchor of anchors) {
      const element = anchorEls.current.get(anchor.key);
      const rect =
        element && [...element.getClientRects()].find((r) => r.width > 2);
      if (rect)
        ys[anchor.key] = Math.round(rect.top - box.top + rect.height / 2);
    }
    const tops: Record<string, number> = {};
    let floor = 0;
    ordered.forEach((finding, index) => {
      const anchor = anchorOf.get(finding.id);
      const height = cardEls.current.get(finding.id)?.offsetHeight ?? 36;
      const want =
        anchor && ys[anchor.key] !== undefined
          ? ys[anchor.key] - HEAD_MIDDLE
          : floor;
      const top = Math.max(Math.round(want), floor);
      tops[finding.id] = top;
      const next = ordered[index + 1];
      const stacked = anchor && next && anchorOf.get(next.id) === anchor;
      floor = top + height + (stacked ? 4 : 10);
    });
    const next: Layout = {
      tops,
      ys,
      height: Math.max(floor, Math.round(ms.offsetHeight)),
      notesRight: Math.round(notes.getBoundingClientRect().right - box.left),
      msLeft: Math.round(ms.getBoundingClientRect().left - box.left),
    };
    setLayout((prev) =>
      JSON.stringify(prev) === JSON.stringify(next) ? prev : next,
    );
    setScroll((prev) =>
      prev.height === scroller.scrollHeight &&
      prev.client === scroller.clientHeight
        ? prev
        : {
            top: scroller.scrollTop,
            height: scroller.scrollHeight,
            client: scroller.clientHeight,
          },
    );
  }, [anchors, anchorOf, ordered]);

  useLayoutEffect(() => {
    measure();
  });

  useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(board);
    return () => observer.disconnect();
  }, [measure]);

  useLayoutEffect(() => {
    const id = scrollTarget.current;
    const scroller = scrollerRef.current;
    const top = id ? layout.tops[id] : undefined;
    if (!id || !scroller || top === undefined) return;
    scrollTarget.current = null;
    const above = top < scroller.scrollTop + 16;
    const below = top + 160 > scroller.scrollTop + scroller.clientHeight;
    if (above || below)
      scroller.scrollTo?.({
        top: Math.max(0, top - 24),
        behavior: reducedMotion() ? "auto" : "smooth",
      });
  }, [layout]);

  const activate = (id: string | null) => {
    setActiveId(id);
    setEditing(null);
    scrollTarget.current = id;
  };

  const pickAnchor = (anchor: Anchor) => {
    const ids = anchor.findingIds.filter((id) =>
      ordered.some((finding) => finding.id === id),
    );
    const at = active ? ids.indexOf(active.id) : -1;
    activate(ids[(at + 1) % ids.length] ?? null);
  };

  const index = active ? ordered.indexOf(active) : -1;

  const moveOn = (finding: SettingCheckFinding) => {
    const at = ordered.findIndex((item) => item.id === finding.id);
    const next = ordered[at + 1] ?? ordered[at - 1];
    activate(next?.id ?? null);
  };

  const failed = (error: unknown) =>
    toast({
      icon: "triangle-alert",
      title: t("판정을 저장하지 못했어요."),
      description: isServiceError(error)
        ? error.message
        : t("작업공간::잠시 후 다시 시도해 주세요."),
    });

  const decide = (
    finding: SettingCheckFinding,
    verdict: SettingCheckVerdict,
    reason: string | null,
  ) => {
    setBusyId(finding.id);
    setVerdict.mutate(
      { findingId: finding.id, verdict, reason },
      {
        onSuccess: () => {
          moveOn(finding);
          setAnnouncement(
            verdict === "INTENDED"
              ? t("의도함으로 옮겼어요.")
              : t("충돌 아님으로 옮겼어요."),
          );
        },
        onError: failed,
        onSettled: () => setBusyId(null),
      },
    );
  };

  const undo = (finding: SettingCheckFinding) => {
    setBusyId(finding.id);
    clearVerdict.mutate(finding.id, {
      onSuccess: () => {
        moveOn(finding);
        setAnnouncement(t("확인할 것으로 되돌렸어요."));
      },
      onError: failed,
      onSettled: () => setBusyId(null),
    });
  };

  const reveal = (finding: SettingCheckFinding) => {
    requestReveal(finding.source.documentId, finding.source.quote);
    openBeside({ kind: "file", fileId: finding.source.documentId }, paneId);
  };

  const jump = (event: MouseEvent<HTMLDivElement>) => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = (event.clientY - rect.top) / rect.height;
    scroller.scrollTo?.({
      top: ratio * scroller.scrollHeight - scroller.clientHeight / 2,
      behavior: reducedMotion() ? "auto" : "smooth",
    });
  };

  const wires: Array<{ id: string; y1: number; y2: number }> = [];
  const wire = (finding: SettingCheckFinding) => {
    const anchor = anchorOf.get(finding.id);
    const top = layout.tops[finding.id];
    const y2 = anchor ? layout.ys[anchor.key] : undefined;
    if (top === undefined || y2 === undefined) return;
    if (wires.some((item) => item.id === finding.id)) return;
    wires.push({ id: finding.id, y1: top + HEAD_MIDDLE, y2 });
  };
  if (active) wire(active);
  if (hover)
    ordered
      .filter((finding) => anchorOf.get(finding.id)?.key === hover)
      .forEach(wire);
  const x1 = layout.notesRight;
  const x2 = layout.msLeft - 6;
  const mid = (x1 + x2) / 2;

  const focusOf = (anchor: Anchor) => {
    const owner =
      active && anchor.findingIds.includes(active.id)
        ? active
        : ordered.find((finding) => finding.id === anchor.findingIds[0]);
    return owner?.quoteFocus ?? null;
  };

  const paragraph = (text: string, at: number) => {
    const marks = anchors.filter((anchor) => anchor.paragraph === at);
    const parts: ReactNode[] = [];
    let cursor = 0;
    for (const anchor of marks) {
      if (anchor.start > cursor) parts.push(text.slice(cursor, anchor.start));
      parts.push(
        <mark
          key={anchor.key}
          ref={(element) => {
            if (element) anchorEls.current.set(anchor.key, element);
            else anchorEls.current.delete(anchor.key);
          }}
          className={styles.mark}
          data-on={
            anchor.key === activeKey || anchor.key === hover || undefined
          }
          onClick={() => pickAnchor(anchor)}
          onMouseEnter={() => setHover(anchor.key)}
          onMouseLeave={() => setHover(null)}
        >
          <Marked
            text={text.slice(anchor.start, anchor.end)}
            focus={focusOf(anchor)}
          />
        </mark>,
      );
      cursor = anchor.end;
    }
    parts.push(text.slice(cursor));
    return <p key={at}>{parts}</p>;
  };

  const manuscript: ReactNode[] = [];
  for (let at = 0; at < paragraphs.length; at += 1) {
    const fold = closed.find((item) => item.start === at);
    if (!fold) {
      manuscript.push(paragraph(paragraphs[at], at));
      continue;
    }
    manuscript.push(
      <button
        key={`fold-${fold.start}`}
        type="button"
        className={styles.fold}
        onClick={() => setOpened((prev) => new Set(prev).add(fold.start))}
      >
        <Icon name="chevrons-up-down" size={14} />
        {t("문단 {count}개 펼치기", { count: fold.end - fold.start })}
      </button>,
    );
    at = fold.end - 1;
  }

  let body: ReactNode;
  if (run.findings.length === 0) {
    body = (
      <div className={styles.reportBody}>
        <div className={styles.empty}>
          <EmptyState
            icon="circle-check"
            title={t("어긋나 보이는 곳이 없어요")}
            description={emptyDescription(run)}
          />
        </div>
      </div>
    );
  } else if (ordered.length === 0) {
    body = (
      <div className={styles.reportBody}>
        <p className={styles.filterEmpty}>
          {filter === "intended"
            ? t("의도한 것으로 남긴 어긋남이 없어요.")
            : filter === "notConflict"
              ? t("충돌이 아니라고 남긴 어긋남이 없어요.")
              : t("확인할 것이 남지 않았어요.")}
        </p>
      </div>
    );
  } else {
    body = (
      <div className={styles.viewport}>
        <div
          ref={scrollerRef}
          className={styles.scroller}
          onScroll={(event) => {
            const element = event.currentTarget;
            setScroll({
              top: element.scrollTop,
              height: element.scrollHeight,
              client: element.clientHeight,
            });
          }}
        >
          <div ref={boardRef} className={styles.board}>
            <div
              ref={notesRef}
              className={styles.notes}
              role="list"
              aria-label={t("근거")}
              style={{ height: layout.height || undefined }}
            >
              {ordered.map((finding) => (
                <Card
                  key={finding.id}
                  finding={finding}
                  top={layout.tops[finding.id]}
                  active={finding.id === active?.id}
                  hot={
                    hover !== null && anchorOf.get(finding.id)?.key === hover
                  }
                  loose={!anchorOf.has(finding.id)}
                  editing={editing?.id === finding.id ? editing.verdict : null}
                  pending={busyId === finding.id}
                  cardRef={(element) => {
                    if (element) cardEls.current.set(finding.id, element);
                    else cardEls.current.delete(finding.id);
                  }}
                  onActivate={() => activate(finding.id)}
                  onReveal={() => reveal(finding)}
                  onEdit={(verdict) =>
                    setEditing(verdict ? { id: finding.id, verdict } : null)
                  }
                  onDecide={(verdict, reason) =>
                    decide(finding, verdict, reason)
                  }
                  onUndo={() => undo(finding)}
                />
              ))}
            </div>
            <div className={styles.gutter} aria-hidden="true">
              {anchors.map((anchor) =>
                layout.ys[anchor.key] === undefined ? null : (
                  <span
                    key={anchor.key}
                    className={styles.tick}
                    data-on={
                      anchor.key === activeKey || anchor.key === hover
                        ? true
                        : undefined
                    }
                    style={{ top: layout.ys[anchor.key] }}
                  />
                ),
              )}
            </div>
            <div
              ref={msRef}
              className={styles.manuscript}
              aria-label={t("대상 원고")}
            >
              {manuscript}
            </div>
            <span />
            <svg className={styles.wire} aria-hidden="true">
              {wires.map((item) => (
                <path
                  key={item.id}
                  d={`M${x1} ${item.y1} C${mid} ${item.y1}, ${mid} ${item.y2}, ${x2} ${item.y2}`}
                />
              ))}
            </svg>
          </div>
        </div>
        {anchors.length > 0 && scroll.height > scroll.client + 1 && (
          <div className={styles.rail} aria-hidden="true">
            <div className={styles.railTrack} onClick={jump}>
              <span
                className={styles.railThumb}
                style={{
                  top: `${(scroll.top / scroll.height) * 100}%`,
                  height: `${Math.min(1, scroll.client / scroll.height) * 100}%`,
                }}
              />
              {anchors.map((anchor) =>
                layout.ys[anchor.key] === undefined ? null : (
                  <span
                    key={anchor.key}
                    className={styles.railMark}
                    data-on={anchor.key === activeKey || undefined}
                    style={{
                      top: `${(layout.ys[anchor.key] / scroll.height) * 100}%`,
                    }}
                  />
                ),
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={styles.report}>
      <div className={styles.reportHead}>
        {header}
        {run.findings.length > 0 && (
          <div className={styles.bar}>
            <Segmented<Filter>
              label={t("어긋남 걸러 보기")}
              value={filter}
              onChange={(next) => {
                setFilter(next);
                setOpened(new Set());
                activate(null);
              }}
              options={[
                { value: "open", label: t("확인할 것"), count: counts.open },
                {
                  value: "intended",
                  label: t("의도함"),
                  count: counts.intended,
                },
                {
                  value: "notConflict",
                  label: t("충돌 아님"),
                  count: counts.notConflict,
                },
              ]}
            />
            {ordered.length > 1 && (
              <div className={styles.stepper}>
                <IconButton
                  icon="chevron-up"
                  label={t("이전 어긋남")}
                  disabled={index <= 0}
                  onClick={() => activate(ordered[index - 1].id)}
                />
                <span className={styles.stepCount}>
                  <b>{index + 1}</b> / {ordered.length}
                </span>
                <IconButton
                  icon="chevron-down"
                  label={t("다음 어긋남")}
                  disabled={index >= ordered.length - 1}
                  onClick={() => activate(ordered[index + 1].id)}
                />
              </div>
            )}
          </div>
        )}
        {ordered.length > 0 && (
          <div className={styles.columns}>
            <span className={styles.label}>{t("근거")}</span>
            <span />
            <span className={styles.label}>{t("대상 원고")}</span>
            <span />
          </div>
        )}
      </div>
      {body}
      <p className={styles.srOnly} role="status">
        {announcement}
      </p>
    </div>
  );
}
