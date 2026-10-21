import {
  Fragment,
  Suspense,
  lazy,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import {
  DIALOG_SURFACE_CLASS,
  Icon,
  type IconName,
} from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import { AiMark } from "@/features/chat/ai-mark";
import { LOCALE, t } from "@/i18n";
import { cx } from "@/shared/cx";

import type { OnboardingStep } from "./steps";
import styles from "./onboarding.module.css";

/*
 * 온보딩 무대는 실제 작업공간 화면을 줄여 옮긴 것이다. 사이드바·탭 막대·문서·그래프·타임라인·
 * 최신화 검토의 배치와 이름은 `features/workspace`, `documents`, `graph`, `timeline`,
 * `graph-refresh` 를 그대로 따른다. 서버를 부르지 않으므로 운영에서도 같은 화면이 나온다.
 * 랜딩 페이지도 같은 무대를 쓴다. 문서 관리 장면은 랜딩에서만 나온다.
 */

export type TourScene = Exclude<OnboardingStep["id"], "start">;
export type Scene = TourScene | "editor" | "files";

const at = (ms: number) => ({ "--d": `${ms}ms` }) as CSSProperties;
const iconOf = (type: DocumentType) => DOCUMENT_TYPE_META[type].entityIcon;
const nodeColor = (type: DocumentType) =>
  `var(--lk-${DOCUMENT_TYPE_META[type].nodeColor})`;
const labelOf = (type: DocumentType) => DOCUMENT_TYPE_META[type].label;
const kindOf = (type: DocumentType) => DOCUMENT_TYPE_SINGULAR_LABEL[type];
const relationOf = (type: DocumentType) =>
  DOCUMENT_TYPE_META[type].relationLabel;

function Enter({
  delay,
  kind = "rise",
  className,
  style,
  children,
  ...rest
}: {
  delay: number;
  kind?: "rise" | "fade" | "pop";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  "data-focus"?: string;
}) {
  return (
    <div
      className={cx(styles.enter, styles[`enter-${kind}`], className)}
      style={{ ...at(delay), ...style }}
      {...rest}
    >
      {children}
    </div>
  );
}

/* 사이드바 ------------------------------------------------------------- */

const FOLDERS: DocumentType[] = [
  "manuscript",
  "character",
  "place",
  "organization",
  "item",
  "event",
  "worldview",
];

const PROJECT = t("무대::유리 정원의 기록");
const LENA = t("무대::레나 아르벨");
const SEOYUN = t("무대::서윤");
const HARIN = t("무대::하린");
const NOAH = t("무대::노아 크레인");
const GLASS_MAGIC = t("무대::유리 마법");
const MEMORY_ROUTES = t("무대::기억 항로");
const NORTH_GREENHOUSE = t("무대::북쪽 온실");
const GLASS_MOUNTAINS = t("무대::유리 산맥");
const SILVER_VOYAGERS = t("무대::은빛 항해단");
const LIGHTHOUSE_KEEPERS = t("무대::등대 수호회");
const OLD_KEY = t("무대::낡은 열쇠");
const AWAKENING = t("무대::각성");
const CH11 = t("무대::11화 · 유리 정원");
const CH12 = t("무대::12화 · 균열의 밤");
const NEW_EPISODE = t("무대::Episode 4. 새 원고");
const LENA_ROLE = t("무대::기억 항로를 읽어 내는 은빛 항해단의 항해사");

const EPISODES = [
  t("무대::Episode 1. 유리의 계절"),
  t("무대::Episode 2. 북쪽 문"),
  t("무대::Episode 3. 기억 항로"),
];
const CHARACTERS = [SEOYUN, LENA, HARIN];
const WORLDVIEWS = [GLASS_MAGIC, MEMORY_ROUTES];

/** 장면마다 펼쳐 둔 폴더와 그 안의 항목. 회차는 에피소드 폴더 아래에 놓인다. */
const OPEN_FOLDERS: Partial<Record<Scene, DocumentType[]>> = {
  workspace: ["manuscript"],
  name: ["manuscript"],
  relations: ["character"],
  editor: ["manuscript"],
  chat: ["manuscript"],
  files: ["manuscript", "character"],
};
const OPEN_EPISODE: Partial<
  Record<Scene, { name: string; chapters: string[]; active: string }>
> = {
  editor: {
    name: NEW_EPISODE,
    chapters: [CH11, CH12],
    active: CH12,
  },
  chat: {
    name: NEW_EPISODE,
    chapters: [CH11, CH12],
    active: CH12,
  },
  files: {
    name: NEW_EPISODE,
    chapters: [CH11, CH12],
    active: "",
  },
};
const FOLDER_ENTRIES: Partial<Record<DocumentType, string[]>> = {
  character: CHARACTERS,
  worldview: WORLDVIEWS,
};
const ACTIVE_ENTRY: Partial<Record<Scene, string>> = {
  relations: LENA,
  files: LENA,
};
/** 랜딩의 실이 따라가는 인물. 창에 실이 닿으면 이 표시가 붙은 자리가 잠깐 강조된다. */
const FOLLOWED = LENA;

/** 무대에서 즐겨찾기로 둔 문서. 사이드바의 즐겨찾기, 제목의 별, 그래프의 별이 함께 본다. */
const FAVORITE = CH12;

function SideItem({
  icon,
  label,
  active,
  depth = 0,
  kind,
}: {
  icon: IconName;
  label: ReactNode;
  active?: boolean;
  depth?: number;
  /** 문서면 그 종류. 실제 사이드바처럼 아이콘이 종류의 색이 된다 */
  kind?: DocumentType;
}) {
  return (
    <div
      className={cx(styles.sideItem, active && styles.sideItemOn)}
      style={{ paddingLeft: 8 + depth * 16 }}
      data-kind={kind}
      data-followed={(active && label === FOLLOWED) || undefined}
    >
      <Icon name={icon} size={13} />
      <span className={styles.ellipsis}>{label}</span>
    </div>
  );
}

function RefreshItem({ scene }: { scene: Scene }) {
  if (scene !== "refresh") {
    return <SideItem icon="refresh-cw" label={t("무대::그래프 최신화")} />;
  }
  return (
    <div className={styles.refreshItem} data-focus="refresh">
      <span className={cx(styles.refreshState, styles.refreshIdle)}>
        <Icon name="refresh-cw" size={13} />
        {t("무대::그래프 최신화")}
      </span>
      <span className={cx(styles.refreshState, styles.refreshRunning)}>
        <Icon name="loader-circle" size={13} className={styles.spin} />
        {t("무대::그래프 추출 중…")}
      </span>
      <span className={cx(styles.refreshState, styles.refreshReady)}>
        <Icon name="git-compare-arrows" size={13} />
        {t("무대::변경 사항 반영")}
      </span>
    </div>
  );
}

function FolderChildren({ type, scene }: { type: DocumentType; scene: Scene }) {
  if (type === "manuscript") {
    const episode = OPEN_EPISODE[scene];
    const names =
      episode && !EPISODES.includes(episode.name)
        ? [...EPISODES, episode.name]
        : EPISODES;
    return names.map((name) => (
      <div key={name}>
        <SideItem
          icon={episode?.name === name ? "folder-open" : "folder"}
          label={name}
          depth={1}
        />
        {episode?.name === name &&
          episode.chapters.map((chapter) => (
            <SideItem
              key={chapter}
              icon="file-text"
              label={chapter}
              depth={2}
              kind="manuscript"
              active={chapter === episode.active}
            />
          ))}
      </div>
    ));
  }
  return (FOLDER_ENTRIES[type] ?? []).map((name) => (
    <SideItem
      key={name}
      icon={iconOf(type)}
      label={name}
      depth={1}
      kind={type}
      active={name === ACTIVE_ENTRY[scene]}
    />
  ));
}

function Sidebar({ scene, userName }: { scene: Scene; userName: string }) {
  const open = OPEN_FOLDERS[scene] ?? [];
  return (
    <aside className={styles.sidebar}>
      <div className={styles.sideUser} data-focus="name">
        <span className={styles.sideAvatar} />
        <span className={styles.ellipsis}>{userName}</span>
      </div>
      <div className={styles.sideNav}>
        <div className={styles.sideProject}>
          <Icon name="book-open" size={13} />
          <span className={styles.ellipsis}>{PROJECT}</span>
          <Icon name="chevron-down" size={13} />
        </div>
        <SideItem icon="search" label={t("무대::검색")} />
        <SideItem
          icon="waypoints"
          label={t("무대::그래프")}
          active={scene === "graph"}
        />
        <SideItem
          icon="chart-no-axes-gantt"
          label={t("무대::타임라인")}
          active={scene === "timeline"}
        />
        <SideItem icon="notebook-pen" label={t("무대::메모")} />
        <div className={styles.sideDivider} />
        <RefreshItem scene={scene} />
        <p className={styles.sideHeading}>{t("무대::즐겨찾기")}</p>
        <SideItem icon="file-text" label={FAVORITE} kind="manuscript" />
        <div className={styles.sideNav} data-focus="workspace">
          <p className={styles.sideHeading}>{t("무대::파일")}</p>
          {FOLDERS.map((type) => (
            <div key={type}>
              <SideItem
                icon={open.includes(type) ? "folder-open" : "folder"}
                label={labelOf(type)}
              />
              {open.includes(type) && (
                <FolderChildren type={type} scene={scene} />
              )}
            </div>
          ))}
        </div>
      </div>
      <div className={styles.sideBottom}>
        <SideItem icon="upload" label={t("무대::가져오기")} />
        <SideItem icon="trash-2" label={t("무대::휴지통")} />
        <SideItem icon="settings" label={t("무대::설정")} />
        <SideItem icon="circle-help" label={t("무대::도움말")} />
      </div>
    </aside>
  );
}

/* 탭 막대 -------------------------------------------------------------- */

const TABS: Record<
  Scene,
  { icon: IconName; label: string; kind?: DocumentType }
> = {
  workspace: { icon: "home", label: t("무대::새 탭") },
  name: { icon: "home", label: t("무대::새 탭") },
  relations: { icon: iconOf("character"), label: LENA, kind: "character" },
  graph: { icon: "waypoints", label: t("무대::그래프") },
  timeline: { icon: "chart-no-axes-gantt", label: t("무대::타임라인") },
  refresh: { icon: "waypoints", label: t("무대::그래프") },
  editor: { icon: "file-text", label: CH12, kind: "manuscript" },
  chat: { icon: "file-text", label: CH12, kind: "manuscript" },
  files: { icon: "file-text", label: CH12, kind: "manuscript" },
};

function TabBar({ scene }: { scene: Scene }) {
  const tab = TABS[scene];
  return (
    <div className={styles.tabBar}>
      <Icon name="panel-left" size={14} />
      <span key={tab.label} className={styles.tab} data-kind={tab.kind}>
        <Icon name={tab.icon} size={13} />
        {tab.label}
        <Icon name="x" size={12} />
      </span>
      <Icon name="plus" size={14} />
    </div>
  );
}

/* 1. 새 탭 ------------------------------------------------------------- */

const RECENT = [
  t("무대::1화 · 첫 번째 온실"),
  t("무대::2화 · 빛의 순찰"),
  t("무대::3화 · 금 간 렌즈"),
];

function NewTabView() {
  return (
    <div className={styles.newTab}>
      <Enter delay={60} kind="fade" className={styles.muted}>
        {PROJECT}
      </Enter>
      <Enter delay={120} className={styles.resume}>
        <div className={styles.resumeCopy}>
          <span className={styles.resumeTitle}>{CH12}</span>
          <span className={styles.mutedSmall}>{t("무대::18분 전")}</span>
        </div>
        <span className={styles.fakePrimary}>{t("무대::이어서 작업하기")}</span>
      </Enter>
      <Enter delay={220} kind="fade" className={styles.blockTitle}>
        {t("무대::새로 만들기")}
      </Enter>
      <div className={styles.createGrid}>
        {FOLDERS.map((type, index) => (
          <Enter
            key={type}
            delay={260 + index * 35}
            className={styles.createCard}
          >
            <span className={styles.createIcon}>
              <Icon name={iconOf(type)} size={14} />
            </span>
            {kindOf(type)}
          </Enter>
        ))}
      </div>
      <Enter delay={540} kind="fade" className={styles.blockTitle}>
        {t("무대::최근에 연 파일")}
      </Enter>
      <Enter delay={580} kind="fade" className={styles.recent}>
        {RECENT.map((name, i) => (
          <div key={name} className={styles.recentRow}>
            <Icon name="file-text" size={13} />
            <span className={styles.ellipsis}>{name}</span>
            <span className={styles.mutedSmall}>
              {t("무대::{count}시간 전", { count: i + 1 })}
            </span>
          </div>
        ))}
      </Enter>
    </div>
  );
}

/* 2. 설정 문서와 속성 표 ----------------------------------------------- */

function Chip({
  type,
  children,
  fresh,
}: {
  type: DocumentType;
  children: ReactNode;
  fresh?: boolean;
}) {
  return (
    <span
      className={cx(styles.chip, fresh && styles.chipFresh)}
      style={fresh ? at(1000) : undefined}
      data-kind={type}
    >
      <Icon name={iconOf(type)} size={12} />
      {children}
    </span>
  );
}

function PropertyRow({
  icon,
  label,
  children,
  delay,
}: {
  icon: IconName;
  label: string;
  children: ReactNode;
  delay: number;
}) {
  return (
    <Enter delay={delay} kind="fade" className={styles.propRow}>
      <span className={styles.propLabel}>
        <Icon name={icon} size={13} />
        {label}
      </span>
      <span className={styles.propValue}>{children}</span>
    </Enter>
  );
}

/** 실제 도구 막대의 정렬 단추 넷. 왼쪽이 눌린 모습이다(정렬하지 않은 문단) */
function AlignTools() {
  return (
    <span className={styles.toolGroup}>
      <Icon name="text-align-start" size={13} className={styles.toolOn} />
      <Icon name="text-align-center" size={13} />
      <Icon name="text-align-end" size={13} />
      <Icon name="text-align-justify" size={13} />
    </span>
  );
}

function WideToolbar() {
  return (
    <div className={styles.toolbar}>
      <Icon name="undo-2" size={13} />
      <Icon name="redo-2" size={13} />
      <span className={styles.toolSelect}>
        Pretendard <Icon name="chevron-down" size={11} />
      </span>
      <span className={styles.toolSelect}>
        10.5pt <Icon name="chevron-down" size={11} />
      </span>
      <span className={styles.toolSelect}>
        <Icon name="list-chevrons-up-down" size={13} />
        1.5 <Icon name="chevrons-up-down" size={11} />
      </span>
      <AlignTools />
      <Icon name="bold" size={13} />
      <Icon name="italic" size={13} />
      {/* 실제 도구 막대도 이 폭에서는 밑줄·취소선·목록을 더보기에 접어 둔다. */}
      <Icon name="ellipsis" size={13} />
      <span className={styles.spacer} />
      <span className={styles.toolSaved}>
        <Icon name="cloud-check" size={13} />
        {t("무대::자동 저장됨")}
      </span>
    </div>
  );
}

function DocumentView() {
  return (
    <div className={styles.document}>
      <WideToolbar />
      <div className={styles.docBody}>
        <Enter delay={60} kind="fade" className={styles.docTitle}>
          {LENA}
          <Icon name="star" size={14} />
        </Enter>
        <div
          className={styles.propTable}
          data-focus="relations"
          data-kind="character"
        >
          <PropertyRow icon="tag" label={t("무대::분류")} delay={120}>
            <span className={styles.propType}>
              <Icon name={iconOf("character")} size={12} />
              {kindOf("character")}
            </span>
          </PropertyRow>
          <PropertyRow icon="type" label={t("무대::설명")} delay={160}>
            {LENA_ROLE}
          </PropertyRow>
          <PropertyRow
            icon="file-text"
            label={relationOf("manuscript")}
            delay={200}
          >
            <Chip type="manuscript">{CH12}</Chip>
            <Chip type="manuscript">{CH11}</Chip>
          </PropertyRow>
          <PropertyRow icon="map-pin" label={relationOf("place")} delay={240}>
            <Chip type="place">{GLASS_MOUNTAINS}</Chip>
            <Chip type="place" fresh>
              {NORTH_GREENHOUSE}
            </Chip>
          </PropertyRow>
          <PropertyRow
            icon="building-2"
            label={relationOf("organization")}
            delay={280}
          >
            <Chip type="organization">{SILVER_VOYAGERS}</Chip>
          </PropertyRow>
          <Enter delay={320} kind="fade" className={styles.propAdd}>
            <Icon name="plus" size={13} />
            {t("무대::속성 추가")}
          </Enter>
        </div>
        <Enter delay={380} kind="fade" className={styles.prose}>
          <p>{t("무대::레나는 타인의 기억이 남긴 방향을 감각으로 읽는다.")}</p>
          <p>{t("무대::짙은 안개 속에서도 그는 한 번도 길을 잃지 않았다.")}</p>
          <p>{t("무대::은빛 항해단은 그를 마지막 항해사라 불렀다.")}</p>
        </Enter>
      </div>
    </div>
  );
}

/* 3. 그래프 ------------------------------------------------------------ */

type GraphNode = [number, number, string, DocumentType, "on" | "near" | "far"];
const NODES: Record<string, GraphNode> = {
  lena: [440, 250, LENA, "character", "on"],
  ch12: [300, 140, CH12, "manuscript", "near"],
  ch11: [590, 132, CH11, "manuscript", "near"],
  range: [246, 332, GLASS_MOUNTAINS, "place", "near"],
  greenhouse: [628, 322, NORTH_GREENHOUSE, "place", "near"],
  crew: [452, 416, SILVER_VOYAGERS, "organization", "near"],
  awake: [318, 452, AWAKENING, "event", "near"],
  noah: [566, 444, NOAH, "character", "near"],
  seoyun: [150, 214, SEOYUN, "character", "far"],
  harin: [734, 232, HARIN, "character", "far"],
  keepers: [168, 468, LIGHTHOUSE_KEEPERS, "organization", "far"],
  key: [712, 468, OLD_KEY, "item", "far"],
  magic: [96, 352, GLASS_MAGIC, "worldview", "far"],
  route: [790, 352, MEMORY_ROUTES, "worldview", "far"],
  log: [436, 530, t("무대::6화 · 항해 일지"), "manuscript", "far"],
};
/** 그래프 영역(804×556)에 맞춘 배율. 좌표는 원래 884×596 기준으로 적었다. */
const SX = 804 / 884;
const SY = 556 / 596;
const NEAR = Object.keys(NODES).filter((key) => NODES[key][4] === "near");
const NEAR_BOX = (() => {
  const xs = ["lena", ...NEAR].map((key) => NODES[key][0] * SX);
  const ys = ["lena", ...NEAR].map((key) => NODES[key][1] * SY);
  const left = Math.min(...xs) - 56;
  const top = Math.min(...ys) - 24;
  return {
    left,
    top,
    width: Math.max(...xs) + 56 - left,
    height: Math.max(...ys) + 40 - top,
  };
})();
const FAR_EDGES: [string, string][] = [
  ["seoyun", "ch12"],
  ["seoyun", "magic"],
  ["harin", "ch11"],
  ["harin", "route"],
  ["keepers", "range"],
  ["keepers", "awake"],
  ["key", "noah"],
  ["key", "route"],
  ["log", "crew"],
  ["log", "awake"],
  ["magic", "range"],
  ["ch12", "range"],
  ["ch11", "greenhouse"],
  ["noah", "greenhouse"],
];

function Edge({
  a,
  b,
  delay,
  near,
}: {
  a: string;
  b: string;
  delay: number;
  near?: boolean;
}) {
  const x1 = NODES[a][0] * SX;
  const y1 = NODES[a][1] * SY;
  const x2 = NODES[b][0] * SX;
  const y2 = NODES[b][1] * SY;
  const len = Math.round(Math.hypot(x2 - x1, y2 - y1));
  return (
    <line
      className={cx(styles.drawLine, near ? styles.edgeNear : styles.edgeFar)}
      style={{ ...at(delay), "--len": len } as CSSProperties}
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
    />
  );
}

function GraphView({ quiet }: { quiet?: boolean }) {
  const delay = (ms: number) => (quiet ? 0 : ms);
  return (
    <div className={styles.viewWithBar}>
      <div className={styles.viewBar}>
        <span className={styles.mutedSmall}>{t("무대::에피소드")}</span>
        <span className={styles.toolSelect}>
          {t("무대::전체")} <Icon name="chevron-down" size={11} />
        </span>
        <span className={styles.spacer} />
        <span className={styles.zoom}>
          <Icon name="minus" size={12} />
          98%
          <Icon name="plus" size={12} />
        </span>
        <span className={styles.toolButton}>
          <Icon name="scan" size={12} />
          {t("무대::화면 맞춤")}
        </span>
      </div>
      <div className={styles.graphCanvas}>
        <span className={styles.focusBox} style={NEAR_BOX} data-focus="graph" />
        <span className={styles.graphTools}>
          <Icon name="search" size={14} />
          <Icon name="filter" size={14} />
        </span>
        <svg
          viewBox="0 0 804 556"
          className={styles.graphSvg}
          aria-hidden="true"
        >
          {FAR_EDGES.map(([a, b], i) => (
            <Edge key={`${a}-${b}`} a={a} b={b} delay={delay(200 + i * 25)} />
          ))}
          {NEAR.map((key, i) => (
            <Edge key={key} a="lena" b={key} near delay={delay(420 + i * 45)} />
          ))}
        </svg>
        {Object.entries(NODES).map(([key, [x, y, label, type, state]], i) => (
          <span
            key={key}
            className={cx(
              styles.node,
              state === "on" && styles.nodeOn,
              state === "far" && styles.nodeFar,
            )}
            style={{ ...at(delay(100 + i * 30)), left: x * SX, top: y * SY }}
            data-followed={label === FOLLOWED || undefined}
          >
            <span
              className={styles.nodeDot}
              style={{ background: nodeColor(type) }}
            >
              <Icon name={iconOf(type)} size={state === "on" ? 11 : 9} />
              {label === FAVORITE && (
                <span className={styles.nodeStar}>
                  <Icon name="star" size={10} />
                </span>
              )}
            </span>
            <span className={styles.nodeLabel}>{label}</span>
          </span>
        ))}
        <span className={styles.legend}>
          {FOLDERS.map((type) => (
            <span key={type} className={styles.legendItem}>
              <i style={{ background: nodeColor(type) }} />
              {labelOf(type)}
            </span>
          ))}
          <span className={cx(styles.legendItem, styles.legendFavorite)}>
            <Icon name="star" size={11} />
            {t("무대::즐겨찾기")}
          </span>
        </span>
      </div>
    </div>
  );
}

/* 4. 타임라인 ---------------------------------------------------------- */

const COLUMNS = 9;
const TIMELINE: {
  type: DocumentType;
  rows: { name: string; spans: [number, number][]; on?: boolean }[];
}[] = [
  {
    type: "character",
    rows: [
      {
        name: LENA,
        spans: [
          [1, 2],
          [4, 4],
          [6, 9],
        ],
        on: true,
      },
      {
        name: SEOYUN,
        spans: [
          [1, 3],
          [7, 8],
        ],
      },
      { name: HARIN, spans: [[2, 5]] },
      {
        name: NOAH,
        spans: [
          [5, 6],
          [9, 9],
        ],
      },
    ],
  },
  {
    type: "place",
    rows: [
      {
        name: NORTH_GREENHOUSE,
        spans: [
          [1, 1],
          [4, 6],
        ],
      },
      {
        name: GLASS_MOUNTAINS,
        spans: [
          [3, 3],
          [8, 9],
        ],
      },
    ],
  },
  { type: "item", rows: [{ name: OLD_KEY, spans: [[2, 4]] }] },
  { type: "event", rows: [{ name: AWAKENING, spans: [[6, 6]] }] },
];

function TimelineView() {
  let order = 0;
  return (
    <div className={styles.viewWithBar}>
      <div className={styles.viewBar}>
        <span className={styles.mutedSmall}>{t("무대::에피소드")}</span>
        <span className={styles.toolSelect}>
          {t("무대::전체")} <Icon name="chevron-down" size={11} />
        </span>
        <span className={styles.stepper}>
          <Icon name="chevron-left" size={12} />
          {t("무대::{number}화", { number: 4 })}
          <Icon name="chevron-right" size={12} />
        </span>
        <span className={styles.spacer} />
        <Icon name="list-filter" size={14} />
      </div>
      <div className={styles.timeline}>
        <div className={styles.tlHead}>
          <span />
          <div className={styles.tlColumns}>
            {EPISODES.map((name) => (
              <span key={name} className={styles.tlEpisode}>
                {name}
              </span>
            ))}
            {Array.from({ length: COLUMNS }, (_, i) => (
              <span
                key={i}
                className={cx(styles.tlCol, i === 3 && styles.tlColOn)}
              >
                <Icon name="file-text" size={11} />
                {t("무대::{number}화", { number: i + 1 })}
              </span>
            ))}
          </div>
        </div>
        {TIMELINE.map((group) => (
          <div key={group.type}>
            <div className={styles.tlGroup}>
              <Icon name="folder-open" size={12} />
              {labelOf(group.type)}
            </div>
            {group.rows.map((row) => {
              const index = order++;
              return (
                <div
                  key={row.name}
                  className={cx(styles.tlRow, row.on && styles.tlRowOn)}
                  data-focus={row.on ? "timeline" : undefined}
                  data-followed={row.on || undefined}
                >
                  <span className={styles.tlLabel}>
                    <Icon name={iconOf(group.type)} size={12} />
                    {row.name}
                  </span>
                  <span className={styles.tlTrack}>
                    <i className={styles.tlBand} />
                    {row.spans.map(([a, b]) => (
                      <i
                        key={a}
                        className={cx(styles.tlBar, row.on && styles.tlBarOn)}
                        style={{
                          ...at(260 + index * 50),
                          ["--bar" as string]: nodeColor(group.type),
                          left: `calc(${((a - 1) / COLUMNS) * 100}% + 6px)`,
                          width: `calc(${((b - a + 1) / COLUMNS) * 100}% - 12px)`,
                        }}
                      />
                    ))}
                  </span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

/* 5. 그래프 최신화 ----------------------------------------------------- */

/*
 * 변경 사항 창의 안쪽은 실제 창이 쓰는 화면이다(refresh-preview.tsx). 문서 비교까지 딸려 와
 * 무거우므로, 이 장면이 그려질 때 따로 받는다 — 랜딩의 첫 화면이 그만큼을 먼저 받지 않게.
 * 창의 틀(자리와 크기)은 여기서 바로 그린다. 온보딩의 조명이 이 틀을 찾아 비추기 때문이다.
 */
const RefreshPreview = lazy(() => import("./refresh-preview"));

function DiffModal() {
  return (
    <Enter
      delay={1500}
      kind="pop"
      className={cx(styles.diff, DIALOG_SURFACE_CLASS)}
      data-focus="diff"
    >
      <Suspense fallback={null}>
        <RefreshPreview />
      </Suspense>
    </Enter>
  );
}

/* 6. 원고 에디터 (랜딩) ------------------------------------------------- */

const ARRIVAL = t(
  "무대::안개가 걷히자 {name}은 북쪽 온실의 문 앞에 서 있었다.",
);
const [typedBefore, typedAfter] = ARRIVAL.split("{name}");
const TYPED_LINE = { before: typedBefore, name: LENA, after: typedAfter };
const TYPED_STEP = LOCALE === "en" ? 35 : 70;
const TYPED_LENGTH =
  TYPED_LINE.before.length + TYPED_LINE.name.length + TYPED_LINE.after.length;

function useTyped(total: number, delay: number, step: number) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let timer = 0;
    if (
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      const instant = window.setTimeout(() => setCount(total), 0);
      return () => window.clearTimeout(instant);
    }
    const start = window.setTimeout(() => {
      timer = window.setInterval(() => {
        setCount((current) => {
          if (current + 1 >= total) window.clearInterval(timer);
          return Math.min(total, current + 1);
        });
      }, step);
    }, delay);
    return () => {
      window.clearTimeout(start);
      window.clearInterval(timer);
    };
  }, [total, delay, step]);
  return count;
}

function TypedLine({ count }: { count: number }) {
  const { before, name, after } = TYPED_LINE;
  const nameShown = Math.max(0, Math.min(name.length, count - before.length));
  const afterShown = Math.max(0, count - before.length - name.length);
  const done = count >= TYPED_LENGTH;
  return (
    <p>
      {before.slice(0, count)}
      {nameShown > 0 && (
        <span
          className={cx(styles.typedName, afterShown > 0 && styles.typedNameOn)}
          data-thread="origin"
        >
          {name.slice(0, nameShown)}
        </span>
      )}
      {after.slice(0, afterShown)}
      {!done && <span className={styles.caret} />}
    </p>
  );
}

function SaveState({ count }: { count: number }) {
  const saving = count > 0 && count < TYPED_LENGTH;
  return (
    <span className={styles.toolSaved} aria-live="polite">
      <Icon
        name={saving ? "loader-circle" : "cloud-check"}
        size={13}
        className={saving ? styles.spin : undefined}
      />
      {saving ? t("저장 중…") : t("무대::자동 저장됨")}
    </span>
  );
}

function EditorView() {
  const typed = useTyped(TYPED_LENGTH, 900, TYPED_STEP);
  return (
    <div className={styles.editorSplit}>
      <div className={styles.document}>
        <div className={styles.toolbar}>
          <Icon name="undo-2" size={13} />
          <Icon name="redo-2" size={13} />
          <span className={styles.toolSelect}>
            Pretendard <Icon name="chevron-down" size={11} />
          </span>
          <span className={styles.toolSelect}>
            10.5pt <Icon name="chevron-down" size={11} />
          </span>
          <Icon name="bold" size={13} />
          <Icon name="italic" size={13} />
          {/* 메모가 열려 좁아진 창이다. 실제 도구 막대는 이 폭에서 줄 간격·정렬까지 더보기에 접는다. */}
          <Icon name="ellipsis" size={13} />
          <span className={styles.spacer} />
          <SaveState count={typed} />
        </div>
        <div
          className={cx(styles.docBody, styles.manuscriptBody)}
          data-focus="editor"
        >
          <Enter delay={60} kind="fade" className={styles.docTitle}>
            {CH12}
            <Icon name="star" size={14} className={styles.starOn} />
          </Enter>
          <Enter delay={160} kind="fade" className={styles.manuscriptProse}>
            <p>
              {t(
                "무대::유리 정원의 종이 세 번 울렸다. 밤새 금이 간 천장 너머로 별빛이 새어 들었고, 하린은 등불을 낮춘 채 북쪽 회랑을 걸었다.",
              )}
            </p>
            <p>
              {t(
                "무대::기록단의 지도에는 그 문이 없었다. 다만 6화의 항해 일지 끝에 누군가 연필로 적어 둔 한 줄이 있었을 뿐이다. 문은 기억하는 사람에게만 열린다.",
              )}
            </p>
            <TypedLine count={typed} />
          </Enter>
        </div>
        <span className={styles.charCount}>{t("무대::1,284자")}</span>
      </div>
      <Enter delay={420} kind="fade" className={styles.memoPanel}>
        <div className={styles.memoHead}>
          <b>{t("무대::메모")}</b>
          <span className={styles.memoTabs}>
            <span className={styles.memoTabOn}>{t("무대::문서")}</span>
            <span>{t("무대::작품")}</span>
          </span>
        </div>
        <div className={styles.memoCard}>
          <b>{t("무대::열쇠 복선 회수")}</b>
          <span>
            {t(
              "무대::6화 항해 일지의 낡은 열쇠를 여기서 쓴다. 문장은 은빛 항해단.",
            )}
          </span>
        </div>
        <div className={styles.memoCard}>
          <b>{t("무대::13화로 넘길 것")}</b>
          <span>
            {t("무대::온실 안에서 들리는 목소리의 정체는 아직 밝히지 않는다.")}
          </span>
        </div>
      </Enter>
    </div>
  );
}

/* 7. 원고와 설정 문서 (랜딩) -------------------------------------------- */

function FilesView() {
  return (
    <div className={styles.paneSplit}>
      <div className={styles.document}>
        <div className={cx(styles.docBody, styles.paneBody)}>
          <Enter delay={80} kind="fade" className={styles.docTitle}>
            {CH12}
          </Enter>
          <Enter delay={160} kind="fade" className={styles.manuscriptProse}>
            <p>
              {t(
                "무대::유리 정원의 종이 세 번 울렸다. 밤새 금이 간 천장 너머로 별빛이 새어 들었다.",
              )}
            </p>
            <p>{ARRIVAL.replace("{name}", LENA)}</p>
          </Enter>
        </div>
      </div>
      <div className={styles.pane}>
        <div className={styles.paneTabs}>
          <span className={styles.tab} data-kind="character">
            <Icon name={iconOf("character")} size={13} />
            {LENA}
            <Icon name="x" size={12} />
          </span>
        </div>
        <div className={cx(styles.docBody, styles.paneBody)}>
          <Enter delay={240} kind="fade" className={styles.docTitle}>
            {LENA}
          </Enter>
          <div className={styles.propTable} data-kind="character">
            <PropertyRow icon="tag" label={t("무대::분류")} delay={300}>
              <span className={styles.propType}>
                <Icon name={iconOf("character")} size={12} />
                {kindOf("character")}
              </span>
            </PropertyRow>
            <PropertyRow icon="type" label={t("무대::설명")} delay={340}>
              {LENA_ROLE}
            </PropertyRow>
            <PropertyRow
              icon="file-text"
              label={relationOf("manuscript")}
              delay={380}
            >
              <Chip type="manuscript">{CH12}</Chip>
            </PropertyRow>
            <PropertyRow icon="map-pin" label={relationOf("place")} delay={420}>
              <Chip type="place">{GLASS_MOUNTAINS}</Chip>
            </PropertyRow>
          </div>
        </div>
      </div>
    </div>
  );
}

export const CHAT_OPENS_AT = 1800;
const CHAT_STREAM_AT = CHAT_OPENS_AT + 900;
const CHAT_STEP = LOCALE === "en" ? 40 : 60;

const PICKED = t("무대::서윤은 등불을 바닥에 내려놓고 천천히 문을 밀었다.");
const EXPLAIN = t("이 부분을 설명해 줘");
const [KEY_BEFORE, KEY_AFTER] = t(
  "무대::열쇠 없이 연다는 점이 {chip} 설정과 어긋나지 않는지 확인해 보세요.",
).split("{chip}");
const [ARRIVE_LEAD, ARRIVE_MID, ARRIVE_TAIL] = t(
  "무대::{who} 이 회차에서 {place}에 도착해요.",
).split(/\{who\}|\{place\}/);

interface Citation {
  type: DocumentType | "memo";
  label: string;
}

type Streamed =
  | { kind: "word"; text: string; at: number }
  | { kind: "cite"; citation: Citation; at: number }
  | { kind: "space" };

const ANSWER: (string | Citation)[][] = [
  [t("무대::이 부분은 서윤이 망설임을 끝내고 북쪽 문을 여는 순간이에요.")],
  [
    ARRIVE_LEAD,
    { type: "character", label: LENA },
    ARRIVE_MID,
    { type: "place", label: NORTH_GREENHOUSE },
    ARRIVE_TAIL,
  ],
  [KEY_BEFORE, { type: "item", label: OLD_KEY }, KEY_AFTER],
  [
    t("무대::문을 밀기 직전 떠올린 문장은 메모에도 적어 두셨어요."),
    " ",
    {
      type: "memo",
      label: t("메모 · {title}", { title: t("무대::균열의 방향") }),
    },
  ],
];

const STREAM = (() => {
  let clock = CHAT_STREAM_AT;
  const blocks = ANSWER.map((pieces) => {
    const start = clock;
    const items = pieces.flatMap((piece): Streamed[] => {
      if (typeof piece !== "string") {
        const cite: Streamed = { kind: "cite", citation: piece, at: clock };
        clock += CHAT_STEP * 2;
        return [cite];
      }
      return piece
        .split(/(\s+)/)
        .filter(Boolean)
        .map((part): Streamed => {
          if (/^\s+$/.test(part)) return { kind: "space" };
          const word: Streamed = { kind: "word", text: part, at: clock };
          clock += CHAT_STEP;
          return word;
        });
    });
    return { at: start, items };
  });
  return { blocks, end: clock };
})();

const opensAt = { "--open": `${CHAT_OPENS_AT}ms` } as CSSProperties;

function Cite({ citation, delay }: { citation: Citation; delay: number }) {
  const memo = citation.type === "memo";
  return (
    <span
      className={styles.cite}
      data-memo={memo || undefined}
      data-kind={memo ? undefined : citation.type}
      style={at(delay)}
    >
      <Icon
        name={citation.type === "memo" ? "sticky-note" : iconOf(citation.type)}
        size={12}
      />
      {citation.label}
    </span>
  );
}

function StreamedText({ items }: { items: Streamed[] }) {
  return items.map((item, index) => {
    if (item.kind === "space") return <Fragment key={index}> </Fragment>;
    if (item.kind === "cite")
      return <Cite key={index} citation={item.citation} delay={item.at} />;
    return (
      <span key={index} className={styles.token} style={at(item.at)}>
        {item.text}
      </span>
    );
  });
}

function ChatWindow() {
  const [lead, ...points] = STREAM.blocks;
  return (
    <Enter
      delay={CHAT_OPENS_AT}
      kind="pop"
      className={cx(styles.chatWindow, DIALOG_SURFACE_CLASS)}
    >
      <div className={styles.chatHead}>
        <Icon name="arrow-left" size={14} />
        <span className={styles.ellipsis}>{EXPLAIN}</span>
        <span className={styles.spacer} />
        <Icon name="ellipsis" size={14} />
        <Icon name="chevron-down" size={14} />
      </div>
      <div className={styles.chatThread}>
        <div className={styles.chatAsk}>
          <div className={styles.chatQuote} data-kind="manuscript">
            <span className={styles.chatQuoteHead}>
              <Icon name="file-text" size={12} />
              {CH12}
            </span>
            <span className={styles.chatQuoteText}>{PICKED}</span>
          </div>
          <p>{EXPLAIN}</p>
        </div>
        <div className={styles.chatReply}>
          <p
            className={styles.chatWaiting}
            style={
              {
                ...at(CHAT_OPENS_AT + 320),
                "--out": `${CHAT_STREAM_AT - 140}ms`,
              } as CSSProperties
            }
          >
            <Icon name="loader-circle" size={13} />
            {t("필요한 문서를 읽는 중")}
          </p>
          <div
            className={styles.chatAnswer}
            style={{ "--step": `${CHAT_STEP}ms` } as CSSProperties}
          >
            <p>
              <StreamedText items={lead.items} />
            </p>
            <ul>
              {points.map((point) => (
                <li key={point.at} style={at(point.at)}>
                  <StreamedText items={point.items} />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <div className={styles.chatComposer}>
        <div className={styles.chatField}>
          <span className={styles.chatPlaceholder}>
            {t("작품에 대해 물어보세요")}
          </span>
          <div className={styles.chatFieldRow}>
            <span className={styles.chatViewing} data-kind="manuscript">
              <Icon name="file-text" size={12} />
              <span className={styles.ellipsis}>{CH12}</span>
            </span>
            <span className={styles.spacer} />
            <span className={styles.chatSend} style={at(STREAM.end)}>
              <span className={styles.chatStop}>
                <Icon name="square" size={10} />
              </span>
              <span className={styles.chatGo}>
                <Icon name="arrow-up" size={14} />
              </span>
            </span>
          </div>
        </div>
      </div>
    </Enter>
  );
}

function ChatView() {
  return (
    <div className={styles.document}>
      <WideToolbar />
      <div className={styles.chatDoc}>
        <Enter delay={60} kind="fade" className={styles.docTitle}>
          {CH12}
          <Icon name="star" size={14} className={styles.starOn} />
        </Enter>
        <Enter delay={120} kind="fade" className={styles.manuscriptProse}>
          <p>
            {t(
              "무대::정원은 밤이 오면 유리보다 먼저 숨을 죽였다. 달빛이 온실의 지붕을 훑고 지나갈 때마다, 금이 간 창마다 은빛 선이 번졌다. 서윤은 그 선들이 모두 한곳을 가리키고 있다는 사실을 세 번째 순찰에서야 알아차렸다.",
            )}
          </p>
          <p>
            {t(
              "무대::오래 잠겨 있던 북쪽 문 앞에는 발자국이 하나뿐이었다. 안으로 들어간 흔적은 있었지만 돌아 나온 흔적은 없었다. 손잡이에 손을 얹자 차가운 진동이 손목을 타고 올라왔다. 어젯밤 메모에 적어 둔 문장이 떠올랐다. ‘균열은 문이 아니라 기억의 방향이다.’",
            )}
          </p>
          <div
            className={styles.picking}
            style={opensAt}
            data-focus="selection"
          >
            <span className={styles.chatBar}>
              <span className={styles.chatBarMain}>
                <AiMark size={15} />
                {t("AI에게 묻기")}
              </span>
              <span className={cx(styles.chatBarQuick, styles.chatBarPress)}>
                {t("설명해 줘")}
              </span>
              <span className={styles.chatBarQuick}>{t("관련 설정")}</span>
              <span className={styles.chatBarQuick}>{t("앞뒤 흐름")}</span>
            </span>
            <p>
              <span className={styles.picked}>{PICKED}</span>{" "}
              {t(
                "무대::어둠 너머에서 익숙한 목소리가 이름을 불렀다. 아주 오래전, 이 정원을 떠난 사람이 마지막으로 불렀던 방식 그대로였다.",
              )}
            </p>
          </div>
        </Enter>
      </div>
      <span className={styles.chatFocus} data-focus="chat" />
      <ChatWindow />
    </div>
  );
}

function Launcher({ scene }: { scene: Scene }) {
  return (
    <span
      className={cx(styles.launcher, scene === "chat" && styles.launcherOpen)}
      style={opensAt}
    >
      <span className={styles.launcherMark}>
        <AiMark solid size={20} />
      </span>
      <span className={styles.launcherClose}>
        <Icon name="chevron-down" size={18} />
      </span>
    </span>
  );
}

/* 창 ------------------------------------------------------------------- */

function Content({ scene }: { scene: Scene }) {
  switch (scene) {
    case "editor":
      return <EditorView />;
    case "chat":
      return <ChatView />;
    case "files":
      return <FilesView />;
    case "workspace":
    case "name":
      return <NewTabView />;
    case "relations":
      return <DocumentView />;
    case "graph":
      return <GraphView />;
    case "timeline":
      return <TimelineView />;
    case "refresh":
      return (
        <>
          <GraphView quiet />
          <span className={styles.diffScrim} style={at(1400)} />
          <DiffModal />
        </>
      );
  }
}

export function AppWindow({
  scene,
  leaving,
  userName,
  children,
}: {
  scene: Scene;
  leaving: Scene | null;
  userName: string;
  children?: ReactNode;
}) {
  return (
    <div className={styles.window}>
      <Sidebar scene={scene} userName={userName} />
      <div className={styles.appMain}>
        <TabBar scene={scene} />
        <div className={styles.contentArea}>
          {leaving && leaving !== scene && (
            <div
              className={cx(styles.contentLayer, styles.contentLeaving)}
              data-scene-state="leaving"
            >
              <Content scene={leaving} />
            </div>
          )}
          <div
            key={scene}
            className={styles.contentLayer}
            data-scene-state="current"
          >
            <Content scene={scene} />
          </div>
        </div>
      </div>
      <Launcher scene={scene} />
      {children}
    </div>
  );
}
