import type { CSSProperties, ReactNode } from "react";

import { Icon, type IconName } from "@/design-system/primitives";
import { cx } from "@/shared/cx";

import styles from "./onboarding.module.css";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;

function Enter({
  as: Tag = "div",
  delay,
  kind = "rise",
  className,
  style,
  children,
  ...rest
}: {
  as?: "div" | "span" | "li" | "p";
  delay: number;
  kind?: "rise" | "fade" | "slide" | "lift";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "data-thread"?: boolean;
}) {
  return (
    <Tag
      className={cx(styles.enter, styles[`enter-${kind}`], className)}
      style={{ ...at(delay), ...style }}
      {...rest}
    >
      {children}
    </Tag>
  );
}

function Chip({
  icon,
  children,
  fresh,
}: {
  icon: IconName;
  children: ReactNode;
  fresh?: boolean;
}) {
  return (
    <span className={cx(styles.chip, fresh && styles.chipFresh)}>
      <Icon name={icon} size={12} />
      {children}
    </span>
  );
}

function WindowBar({ icon, title }: { icon: IconName; title: ReactNode }) {
  return (
    <div className={styles.windowBar}>
      <Icon name={icon} size={13} />
      {title}
    </div>
  );
}

/* 1. 프로젝트 ---------------------------------------------------------- */

const INTERIOR: [IconName, string][] = [
  ["file-text", "1화 · 유리의 계절"],
  ["file-text", "2화 · 북쪽 문"],
  ["circle-user-round", "레나 아르벨"],
  ["map-pin", "북쪽 온실"],
  ["key-round", "낡은 열쇠"],
  ["sticky-note", "프로젝트 메모 3개"],
  ["message-square", "AI 챗 세션 2개"],
];

function ProjectCard({
  title,
  focus,
  style,
  className,
}: {
  title: string;
  focus?: boolean;
  style?: CSSProperties;
  className?: string;
}) {
  return (
    <div
      className={cx(
        styles.projectCard,
        focus && styles.projectCardFocus,
        className,
      )}
      style={style}
    >
      <div className={styles.projectCardHead}>
        <span className={styles.iconSurface}>
          <Icon name="book-open" size={16} />
        </span>
        {focus && (
          <span className={styles.selectedBadge}>
            <Icon name="check" size={12} />
            선택됨
          </span>
        )}
      </div>
      <p className={styles.projectCardTitle}>{title}</p>
      <p className={styles.projectCardMeta}>
        <Icon name="clock-3" size={12} />
        방금 전 마지막 작업
      </p>
      <p className={styles.projectCardMeta}>
        <Icon name="file-text" size={12} />
        2화 · 북쪽 문
      </p>
    </div>
  );
}

export function ProjectsScene() {
  return (
    <div className={styles.scene}>
      <Enter delay={0} kind="slide" className={styles.deckBack2}>
        <ProjectCard title="달빛 도서관 연대기" />
      </Enter>
      <Enter delay={60} kind="slide" className={styles.deckBack1}>
        <ProjectCard title="주변 궤도의 사람들" />
      </Enter>
      <Enter delay={140} kind="lift" className={styles.deckFocus}>
        <ProjectCard title="유리 정원의 기록" focus />
      </Enter>
      <svg
        className={styles.connector}
        viewBox="0 0 84 8"
        width={84}
        height={8}
        aria-hidden="true"
      >
        <line
          className={styles.drawLine}
          style={{ ...at(420), "--len": 78 } as CSSProperties}
          x1="0"
          y1="4"
          x2="78"
          y2="4"
          pathLength={78}
        />
        <circle
          className={styles.connectorDot}
          style={at(600)}
          cx="80"
          cy="4"
          r="3.5"
        />
      </svg>
      <Enter delay={520} kind="fade" className={styles.interior}>
        <div className={styles.interiorHead}>
          <p className={styles.interiorTitle}>유리 정원의 기록 안에는</p>
          <p className={styles.muted}>이 프로젝트의 것만 들어 있어요</p>
        </div>
        <ul className={styles.interiorList}>
          {INTERIOR.map(([icon, label], index) => (
            <Enter
              as="li"
              key={label}
              delay={580 + index * 40}
              kind="fade"
              className={cx(
                styles.interiorItem,
                index === 2 && styles.interiorItemOn,
              )}
            >
              <Icon name={icon} size={14} />
              {index === 2 ? <span data-thread>{label}</span> : label}
            </Enter>
          ))}
        </ul>
      </Enter>
    </div>
  );
}

/* 2. 원고와 설정 -------------------------------------------------------- */

function Mention({ children, delay }: { children: ReactNode; delay: number }) {
  return (
    <span className={styles.mention} style={at(delay)}>
      {children}
    </span>
  );
}

const RELATIONS: {
  label: string;
  icon: IconName;
  chips: [IconName, string][];
  fresh?: number;
}[] = [
  {
    label: "자주 가는 장소",
    icon: "map-pin",
    chips: [
      ["map-pin", "북쪽 온실"],
      ["map-pin", "유리 정원"],
    ],
  },
  {
    label: "지닌 물건",
    icon: "key-round",
    chips: [["key-round", "낡은 열쇠"]],
    fresh: 0,
  },
  {
    label: "소속",
    icon: "users-round",
    chips: [["users-round", "정원 기록단"]],
  },
];

export function WriteScene() {
  return (
    <div className={styles.scene}>
      <Enter delay={0} kind="rise" className={styles.manuscript}>
        <p className={styles.fileCrumb}>
          <Icon name="file-text" size={13} />
          1화 · 유리의 계절
        </p>
        <div className={styles.prose}>
          <p className={styles.typed} style={at(200)}>
            <Mention delay={820}>레나</Mention>는{" "}
            <Mention delay={900}>낡은 열쇠</Mention>를 돌려{" "}
            <Mention delay={980}>북쪽 온실</Mention>의 문을 열었다.
          </p>
          <Enter as="p" delay={760} kind="fade">
            유리 벽 너머로, 오래 잠들어 있던 정원이 천천히 숨을 쉬었다.
          </Enter>
          <Enter as="p" delay={820} kind="fade">
            “여기 있었구나.” 레나가 속삭였다.
          </Enter>
        </div>
      </Enter>
      <Enter delay={940} kind="lift" className={styles.settingDoc}>
        <div className={styles.settingHead}>
          <span className={styles.iconSurface}>
            <Icon name="circle-user-round" size={15} />
          </span>
          <div>
            <p className={styles.settingTitle} data-thread>
              레나 아르벨
            </p>
            <p className={styles.muted}>캐릭터 설정 문서</p>
          </div>
        </div>
        <div className={styles.relationTable}>
          {RELATIONS.map((row, index) => (
            <Enter
              key={row.label}
              delay={1100 + index * 60}
              kind="fade"
              className={styles.relationRow}
            >
              <span className={styles.relationLabel}>
                <Icon name={row.icon} size={13} />
                {row.label}
              </span>
              <span className={styles.relationValue}>
                {row.chips.map(([icon, name], chipIndex) => (
                  <Chip key={name} icon={icon} fresh={row.fresh === chipIndex}>
                    {name}
                  </Chip>
                ))}
              </span>
            </Enter>
          ))}
        </div>
      </Enter>
    </div>
  );
}

/* 3. 그래프와 타임라인 -------------------------------------------------- */

type NodeKind =
  "character" | "place" | "item" | "organization" | "event" | "manuscript";
const NODES: Record<string, [number, number, string, NodeKind, 1 | 0 | -1]> = {
  lena: [379, 160, "레나 아르벨", "character", 1],
  greenhouse: [210, 82, "북쪽 온실", "place", 0],
  garden: [560, 77, "유리 정원", "place", 0],
  key: [606, 202, "낡은 열쇠", "item", 0],
  keepers: [168, 226, "정원 기록단", "organization", 0],
  noah: [372, 42, "노아 크레인", "character", 0],
  mira: [500, 274, "미라 온", "character", 0],
  night: [262, 284, "균열의 밤", "event", 0],
  ep1: [96, 142, "1화 · 유리의 계절", "manuscript", 0],
  ep2: [668, 135, "2화 · 북쪽 문", "manuscript", 0],
  theo: [622, 284, "테오", "character", -1],
  lighthouse: [92, 284, "등대의 침묵", "event", -1],
};
const NEAR = [
  "greenhouse",
  "garden",
  "key",
  "keepers",
  "noah",
  "mira",
  "night",
  "ep1",
  "ep2",
];
const FAR: [string, string][] = [
  ["mira", "theo"],
  ["night", "lighthouse"],
  ["ep1", "keepers"],
  ["ep2", "key"],
];
const TIMELINE: {
  label: string;
  icon: IconName;
  kind: NodeKind;
  spans: [number, number][];
  on?: boolean;
}[] = [
  {
    label: "레나 아르벨",
    icon: "circle-user-round",
    kind: "character",
    spans: [[1, 6]],
    on: true,
  },
  {
    label: "북쪽 온실",
    icon: "map-pin",
    kind: "place",
    spans: [
      [1, 2],
      [5, 5],
    ],
  },
  { label: "낡은 열쇠", icon: "key-round", kind: "item", spans: [[1, 3]] },
  { label: "균열의 밤", icon: "zap", kind: "event", spans: [[4, 4]] },
];

function Edge({
  a,
  b,
  delay,
  far,
}: {
  a: string;
  b: string;
  delay: number;
  far?: boolean;
}) {
  const [x1, y1] = NODES[a];
  const [x2, y2] = NODES[b];
  const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
  return (
    <line
      className={cx(styles.drawLine, far ? styles.edgeFar : styles.edgeNear)}
      style={{ ...at(delay), "--len": len } as CSSProperties}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      pathLength={len}
    />
  );
}

export function GraphScene() {
  return (
    <div className={styles.scene}>
      <Enter delay={0} kind="rise" className={styles.graphWindow}>
        <WindowBar icon="waypoints" title="그래프" />
        <div className={styles.graphView}>
          <svg
            viewBox="0 0 760 326"
            className={styles.graphSvg}
            aria-hidden="true"
          >
            {FAR.map(([a, b], i) => (
              <Edge key={`${a}-${b}`} a={a} b={b} far delay={260 + i * 40} />
            ))}
            {NEAR.map((key, i) => (
              <Edge key={key} a="lena" b={key} delay={360 + i * 45} />
            ))}
            {Object.entries(NODES).map(([key, [x, y, , kind, state]], i) => (
              <g
                key={key}
                className={cx(styles.node, state < 0 && styles.nodeFar)}
                style={at(140 + i * 35)}
              >
                {state === 1 && (
                  <circle
                    className={styles.nodeRing}
                    cx={x}
                    cy={y}
                    r={16}
                    style={at(760)}
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={state === 1 ? 10 : 6.5}
                  fill={`var(--lk-color-node-${kind})`}
                  stroke="var(--lk-color-bg-canvas)"
                  strokeWidth={2}
                />
              </g>
            ))}
          </svg>
          {Object.entries(NODES).map(([key, [x, y, label, , state]], i) => (
            <span
              key={key}
              className={cx(
                styles.nodeLabel,
                state === 1 && styles.nodeLabelOn,
                state < 0 && styles.nodeFar,
                key === "noah" && styles.nodeLabelAbove,
              )}
              style={{ ...at(220 + i * 35), left: x, top: y }}
              data-thread={state === 1 || undefined}
            >
              {label}
            </span>
          ))}
        </div>
      </Enter>
      <Enter delay={520} kind="rise" className={styles.timeline}>
        <WindowBar icon="chart-gantt" title="타임라인" />
        <div className={styles.timelineHead}>
          <span />
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <span key={n} className={cx(n === 2 && styles.timelineColOn)}>
              {n}화
            </span>
          ))}
        </div>
        {TIMELINE.map((row, index) => (
          <div
            key={row.label}
            className={cx(styles.timelineRow, row.on && styles.timelineRowOn)}
          >
            <span className={styles.timelineLabel}>
              <Icon
                name={row.icon}
                size={13}
                style={{ color: `var(--lk-color-node-${row.kind})` }}
              />
              {row.label}
            </span>
            <span className={styles.timelineTrack}>
              <span className={styles.timelineBand} />
              {row.spans.map(([a, b]) => (
                <span
                  key={a}
                  className={cx(
                    styles.timelineBar,
                    row.on && styles.timelineBarOn,
                  )}
                  style={{
                    ...at(760 + index * 60),
                    left: `calc(${((a - 1) / 6) * 100}% + 8px)`,
                    width: `calc(${((b - a + 1) / 6) * 100}% - 16px)`,
                    background: row.on
                      ? undefined
                      : `var(--lk-color-node-${row.kind})`,
                  }}
                />
              ))}
            </span>
          </div>
        ))}
      </Enter>
    </div>
  );
}

/* 4. AI와 그래프 최신화 ------------------------------------------------- */

const ENTRIES: {
  icon: IconName;
  kind: string;
  name: string;
  mark: "변경" | "추가";
}[] = [
  {
    icon: "circle-user-round",
    kind: "캐릭터",
    name: "레나 아르벨",
    mark: "변경",
  },
  { icon: "map-pin", kind: "장소", name: "북쪽 온실", mark: "변경" },
  { icon: "users-round", kind: "조직", name: "등대 수호회", mark: "추가" },
];
const COMPARE: {
  key: string;
  current: string;
  next: string;
  changed: boolean;
}[] = [
  {
    key: "소속",
    current: "정원 기록단",
    next: "정원 기록단, 등대 수호회",
    changed: true,
  },
  { key: "지닌 물건", current: "낡은 열쇠", next: "낡은 열쇠", changed: false },
  { key: "메모", current: "—", next: "북쪽 문 너머에서 돌아옴", changed: true },
];

export function RefreshScene() {
  return (
    <div className={styles.scene}>
      <Enter delay={0} kind="fade" className={styles.refreshPill}>
        <span className={styles.pillReading}>
          <Icon name="loader-circle" size={13} className={styles.spin} />
          2화를 읽는 중…
        </span>
        <span className={styles.pillDone}>
          <Icon name="sparkles" size={13} />
          2화를 읽고 설정 문서 3개에 바뀔 점을 찾았어요
        </span>
      </Enter>
      <Enter delay={640} kind="lift" className={styles.review}>
        <WindowBar
          icon="sparkles"
          title={
            <>
              변경 사항 검토
              <span className={styles.muted}>근거 원고: 2화 · 북쪽 문</span>
            </>
          }
        />
        <div className={styles.reviewBody}>
          <ul className={styles.reviewEntries}>
            {ENTRIES.map((entry, index) => (
              <Enter
                as="li"
                key={entry.name}
                delay={760 + index * 60}
                kind="fade"
                className={cx(
                  styles.reviewEntry,
                  index === 0 && styles.reviewEntryOn,
                )}
              >
                <Icon name={entry.icon} size={13} />
                <span className={styles.muted}>{entry.kind}</span>
                <span
                  className={styles.reviewName}
                  data-thread={index === 0 || undefined}
                >
                  {entry.name}
                </span>
                <span
                  className={
                    entry.mark === "추가" ? styles.markAdd : styles.markModify
                  }
                >
                  {entry.mark}
                </span>
              </Enter>
            ))}
          </ul>
          <div className={styles.compare}>
            {(["현재 버전", "AI 제안"] as const).map((title, column) => (
              <div key={title} className={styles.compareColumn}>
                <p className={styles.compareTitle}>{title}</p>
                {COMPARE.map((row, index) => (
                  <Enter
                    key={row.key}
                    delay={880 + index * 80 + column * 40}
                    kind="fade"
                    className={cx(
                      styles.compareRow,
                      !row.changed && styles.compareSame,
                      column === 1 && row.changed && styles.compareChanged,
                    )}
                  >
                    <span className={styles.muted}>{row.key}</span>
                    <span>{column === 0 ? row.current : row.next}</span>
                  </Enter>
                ))}
              </div>
            ))}
            <Enter delay={1200} kind="fade" className={styles.compareActions}>
              <span className={styles.muted}>
                고르기 전에는 설정 문서가 바뀌지 않아요.
              </span>
              <span className={styles.fakeButton}>
                <Icon name="undo-2" size={13} />
                현재 유지
              </span>
              <span className={cx(styles.fakeButton, styles.fakePrimary)}>
                <Icon name="check" size={13} />
                제안 반영
              </span>
            </Enter>
          </div>
        </div>
      </Enter>
    </div>
  );
}
