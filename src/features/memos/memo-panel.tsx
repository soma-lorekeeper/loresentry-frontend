"use client";

import { useRef, useState } from "react";

import {
  IconButton,
  ResizeHandle,
  Segmented,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import type { MemoDock } from "@/features/workspace/model/layout";
import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import { MemoList } from "./memo-list";
import styles from "./memo-panel.module.css";

export const MEMO_RIGHT_RANGE = { min: 280, max: 560 };
export const MEMO_BELOW_RANGE = { min: 180, max: 480 };
const KEY_STEP = 16;

const DOCK_OPTIONS = [
  { value: "below" as const, label: t("아래"), icon: "panel-bottom" as const },
  { value: "right" as const, label: t("오른쪽"), icon: "panel-right" as const },
];

type PanelTab = "project" | "file";

function clamp(value: number, range: { min: number; max: number }) {
  return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

/**
 * 메모 패널의 손잡이. 패널은 문서의 오른쪽이나 아래에 붙어 있어, 손잡이를 왼쪽·위로
 * 끌수록 패널이 커진다 — 그래서 움직인 거리를 빼서 크기를 정한다.
 */
function MemoResizeHandle({
  dock,
  size,
  onResize,
}: {
  dock: MemoDock;
  size: number;
  onResize: (size: number) => void;
}) {
  const range = dock === "right" ? MEMO_RIGHT_RANGE : MEMO_BELOW_RANGE;
  // 끌기 시작할 때의 크기. 움직인 거리는 누른 자리 기준으로 오므로 여기에 견준다.
  const startSize = useRef(size);
  return (
    <ResizeHandle
      label={t("메모 패널 크기 조절")}
      orientation={dock === "right" ? "vertical" : "horizontal"}
      value={size}
      min={range.min}
      max={range.max}
      className={cx(styles.handle, dock === "below" && styles.handleBelow)}
      onDragStart={() => {
        startSize.current = size;
      }}
      onDrag={(delta) => onResize(clamp(startSize.current - delta, range))}
      onStep={(direction) =>
        onResize(clamp(size - direction * KEY_STEP, range))
      }
    />
  );
}

export function MemoPanel({
  open = true,
  hidden,
  projectId,
  fileId,
  fileTitle,
  docType,
  dock,
  size,
  onResize,
  onDock,
  onClose,
}: {
  open?: boolean;
  /** 자리가 모자라 잠시 접었는가. 감추기만 하므로 적던 메모와 보던 탭이 그대로 남는다 */
  hidden?: boolean;
  projectId: string;
  fileId: string;
  fileTitle: string;
  docType: DocumentType;
  dock: MemoDock;
  size: number;
  onResize: (size: number) => void;
  onDock: (dock: MemoDock) => void;
  onClose: () => void;
}) {
  // 이 패널은 문서를 열어 둔 채 쓴다. 지금 쓰는 문서의 메모가 먼저 보여야 한다.
  const [tab, setTab] = useState<PanelTab>("file");
  // 추가 단추는 디자인처럼 탭 줄에 있다. 누르면 지금 보는 목록의 맨 위에 적는 칸이 열린다.
  // 메모는 그 칸에서 저장할 때 생긴다(memo-list.tsx).
  const [composing, setComposing] = useState(false);
  // 처음 열기 전에는 목록을 조회하지 않고, 한 번 연 뒤에는 닫아도 편집 상태를 보존한다.
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  const typeLabel = DOCUMENT_TYPE_META[docType].label;

  if (!hasOpened) return null;

  return (
    <aside
      hidden={!open || hidden}
      className={cx(styles.panel, dock === "below" && styles.below)}
      style={dock === "right" ? { width: size } : { height: size }}
      aria-label={t("작업공간::메모")}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) {
          event.preventDefault();
          onClose();
        }
      }}
    >
      <MemoResizeHandle dock={dock} size={size} onResize={onResize} />
      <header className={styles.header}>
        <IconButton
          icon="x"
          iconSize={15}
          label={t("메모 닫기")}
          onClick={onClose}
        />
        <h2 className={styles.title}>{t("작업공간::메모")}</h2>
        <Segmented
          label={t("메모 위치")}
          options={DOCK_OPTIONS}
          value={dock}
          onChange={onDock}
          className={styles.dock}
        />
      </header>
      <div className={styles.tabs}>
        <Segmented
          variant="pills"
          label={t("메모 종류")}
          options={[
            {
              value: "file" as const,
              label: t("{kind} 메모", { kind: typeLabel, type: docType }),
            },
            { value: "project" as const, label: t("작품 메모") },
          ]}
          value={tab}
          onChange={(next) => {
            setTab(next);
            // 적던 칸은 그 목록의 것이다. 다른 목록으로 가면 닫는다.
            setComposing(false);
          }}
        />
        <IconButton
          icon="plus"
          iconSize={16}
          label={
            tab === "file"
              ? t("{kind} 메모 추가", { kind: typeLabel, type: docType })
              : t("작품 메모 추가")
          }
          className={styles.add}
          disabled={composing}
          onClick={() => setComposing(true)}
        />
      </div>
      <div className={styles.content}>
        {tab === "file" ? (
          <MemoList
            key={fileId}
            projectId={projectId}
            scope="file"
            fileId={fileId}
            compact={dock === "below"}
            canAdd={false}
            composing={composing}
            onComposingChange={setComposing}
            addLabel={t("메모 추가")}
            emptyTitle={t("{title}에 적은 메모가 없어요", { title: fileTitle })}
            emptyDescription={t("이 {kind}에 대해 기억할 것을 적어 두세요.", {
              kind: typeLabel,
              type: docType,
            })}
          />
        ) : (
          <MemoList
            projectId={projectId}
            scope="project"
            compact={dock === "below"}
            canAdd={false}
            composing={composing}
            onComposingChange={setComposing}
            addLabel={t("메모 추가")}
            emptyTitle={t("작품 메모가 없어요")}
            emptyDescription={t("작품 전체에 걸친 생각을 적어 두세요.")}
          />
        )}
      </div>
    </aside>
  );
}
