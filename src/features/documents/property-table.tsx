"use client";

import { useMemo, useRef, useState, type KeyboardEvent } from "react";

import {
  Icon,
  IconButton,
  Menu,
  Popover,
  type MenuEntry,
} from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPES,
  SETTING_DOCUMENT_TYPES,
  type DocumentType,
} from "@/domain/document-types";
import type {
  DocumentNode,
  DocumentProperty,
  FileNode,
  FolderNode,
  RelationProperty,
} from "@/domain/models";

import styles from "./property-table.module.css";

interface PropertyTableProps {
  fileId: string;
  docType: DocumentType;
  properties: DocumentProperty[];
  nodes: readonly FileNode[];
  episode: FolderNode | null;
  episodes: FolderNode[];
  readOnly: boolean;
  onChange: (properties: DocumentProperty[]) => void;
  onChangeType: (type: DocumentType) => void;
  onMoveToEpisode: (episodeId: string) => void;
  onOpenFile: (fileId: string) => void;
}

function RelationPicker({
  anchorRef,
  open,
  onClose,
  candidates,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLElement | null>;
  open: boolean;
  onClose: () => void;
  candidates: DocumentNode[];
  onPick: (node: DocumentNode) => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const filtered = candidates.filter((node) =>
    node.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
  );

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown")
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    else if (event.key === "ArrowUp") setActive((i) => Math.max(i - 1, 0));
    else if (event.key === "Enter" && filtered[active])
      onPick(filtered[active]);
    else return;
    event.preventDefault();
  };

  return (
    <Popover
      anchorRef={anchorRef}
      open={open}
      onClose={(reason) => {
        onClose();
        if (reason === "escape") anchorRef.current?.focus();
      }}
    >
      <div
        className={styles.picker}
        role="dialog"
        aria-label="연결할 문서 선택"
      >
        <input
          autoFocus
          className={styles.pickerSearch}
          placeholder="문서 검색"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setActive(0);
          }}
          onKeyDown={onKeyDown}
          aria-label="연결할 문서 검색"
        />
        <div className={styles.pickerList} role="listbox" aria-label="문서">
          {filtered.length === 0 ? (
            <p className={styles.pickerEmpty}>연결할 문서가 없어요.</p>
          ) : (
            filtered.map((node, index) => (
              <button
                key={node.id}
                type="button"
                role="option"
                aria-selected={index === active}
                data-active={index === active || undefined}
                className={styles.pickerItem}
                onMouseEnter={() => setActive(index)}
                onClick={() => onPick(node)}
              >
                <Icon
                  name={DOCUMENT_TYPE_META[node.docType].entityIcon}
                  size={15}
                />
                {node.title}
              </button>
            ))
          )}
        </div>
      </div>
    </Popover>
  );
}

function RelationRow({
  property,
  fileId,
  nodes,
  readOnly,
  onChange,
  onRemoveRow,
  onOpenFile,
}: {
  property: RelationProperty;
  fileId: string;
  nodes: readonly FileNode[];
  readOnly: boolean;
  onChange: (next: RelationProperty) => void;
  onRemoveRow: () => void;
  onOpenFile: (fileId: string) => void;
}) {
  const addRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLButtonElement>(null);
  const [picking, setPicking] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const byId = useMemo(
    () => new Map(nodes.map((node) => [node.id, node])),
    [nodes],
  );
  const targets = property.targetIds
    .map((id) => byId.get(id))
    .filter((node): node is DocumentNode => node?.kind === "document");
  const candidates = nodes.filter(
    (node): node is DocumentNode =>
      node.kind === "document" &&
      node.docType === property.targetType &&
      node.id !== fileId &&
      !property.targetIds.includes(node.id),
  );
  const meta = DOCUMENT_TYPE_META[property.targetType];

  return (
    <div className={styles.row}>
      <div className={styles.identity}>
        <IconButton
          ref={menuRef}
          icon={meta.entityIcon}
          label={`${property.label} 속성 메뉴`}
          className={styles.identityButton}
          disabled={readOnly}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        />
        <span className={styles.identityName}>{property.label}</span>
        <Menu
          anchorRef={menuRef}
          open={menuOpen}
          onOpenChange={setMenuOpen}
          label={`${property.label} 속성`}
          entries={[
            {
              id: "remove",
              label: "속성 삭제",
              icon: "trash-2",
              destructive: true,
              onSelect: onRemoveRow,
            },
          ]}
        />
      </div>
      <div className={styles.value} aria-disabled={readOnly || undefined}>
        {targets.length === 0 && (
          <span className={styles.emptyValue}>연결한 문서가 없어요</span>
        )}
        {targets.map((node) => (
          <span key={node.id} className={styles.chip}>
            <Icon name={meta.entityIcon} size={14} />
            <button
              type="button"
              className={styles.chipLabel}
              onClick={() => onOpenFile(node.id)}
              title={`${node.title} 열기`}
            >
              {node.title}
            </button>
            {!readOnly && (
              <button
                type="button"
                className={styles.chipRemove}
                aria-label={`${node.title} 연결 해제`}
                onClick={() =>
                  onChange({
                    ...property,
                    targetIds: property.targetIds.filter(
                      (id) => id !== node.id,
                    ),
                  })
                }
              >
                <Icon name="x" size={12} />
              </button>
            )}
          </span>
        ))}
        {!readOnly && (
          <button
            ref={addRef}
            type="button"
            className={styles.addChip}
            aria-label={`${property.label} 추가`}
            aria-haspopup="dialog"
            aria-expanded={picking}
            onClick={() => setPicking(true)}
          >
            <Icon name="plus" size={14} />
          </button>
        )}
      </div>
      {picking && (
        <RelationPicker
          anchorRef={addRef}
          open={picking}
          onClose={() => setPicking(false)}
          candidates={candidates}
          onPick={(node) => {
            onChange({
              ...property,
              targetIds: [...property.targetIds, node.id],
            });
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

function EpisodeRow({
  episode,
  episodes,
  readOnly,
  onMoveToEpisode,
}: {
  episode: FolderNode | null;
  episodes: FolderNode[];
  readOnly: boolean;
  onMoveToEpisode: (episodeId: string) => void;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <div className={styles.row}>
      <div className={styles.identity}>
        <IconButton
          icon="folder"
          label="에피소드"
          className={styles.identityButton}
          tabIndex={-1}
        />
        <span className={styles.identityName}>에피소드</span>
      </div>
      <div className={styles.value} aria-disabled={readOnly || undefined}>
        <button
          ref={ref}
          type="button"
          className={styles.textInput}
          style={{ textAlign: "left" }}
          disabled={readOnly || episodes.length === 0}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen(true)}
        >
          {episode?.title ?? (
            <span className={styles.emptyValue}>에피소드 없음</span>
          )}
        </button>
        <Menu
          anchorRef={ref}
          open={open}
          onOpenChange={setOpen}
          label="에피소드 이동"
          width={240}
          entries={episodes.map((folder) => ({
            id: folder.id,
            label: folder.title,
            icon: "folder",
            checked: folder.id === episode?.id,
            onSelect: () =>
              folder.id !== episode?.id && onMoveToEpisode(folder.id),
          }))}
        />
      </div>
    </div>
  );
}

function TextRow({
  property,
  readOnly,
  onChange,
  onRemove,
}: {
  property: Extract<DocumentProperty, { kind: "text" }>;
  readOnly: boolean;
  onChange: (next: DocumentProperty) => void;
  onRemove: () => void;
}) {
  return (
    <div className={styles.row}>
      <div className={styles.identity}>
        <IconButton
          icon={property.key === "description" ? "type" : "tag"}
          label={property.label}
          className={styles.identityButton}
          tabIndex={-1}
        />
        <span className={styles.identityName}>{property.label}</span>
      </div>
      <div className={styles.value} aria-disabled={readOnly || undefined}>
        <input
          className={styles.textInput}
          value={property.value}
          readOnly={readOnly}
          placeholder={`${property.label} 입력`}
          aria-label={property.label}
          onChange={(event) =>
            onChange({ ...property, value: event.target.value })
          }
          onKeyDown={(event) => {
            if (
              event.key === "Backspace" &&
              property.key !== "description" &&
              property.value === ""
            ) {
              event.preventDefault();
              onRemove();
            }
          }}
        />
      </div>
    </div>
  );
}

export function PropertyTable({
  fileId,
  docType,
  properties,
  nodes,
  episode,
  episodes,
  readOnly,
  onChange,
  onChangeType,
  onMoveToEpisode,
  onOpenFile,
}: PropertyTableProps) {
  const typeRef = useRef<HTMLButtonElement>(null);
  const addRef = useRef<HTMLButtonElement>(null);
  const [typeOpen, setTypeOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const meta = DOCUMENT_TYPE_META[docType];

  const replace = (id: string, next: DocumentProperty) =>
    onChange(
      properties.map((property) => (property.id === id ? next : property)),
    );
  const remove = (id: string) =>
    onChange(properties.filter((property) => property.id !== id));

  const addEntries: MenuEntry[] = [
    {
      id: "alias",
      label: "별칭",
      icon: "tag",
      onSelect: () =>
        onChange([
          ...properties,
          {
            id: `${fileId}:alias:${Date.now().toString(36)}`,
            kind: "text",
            key: "alias",
            label: "별칭",
            value: "",
          },
        ]),
    },
    { type: "separator", id: "separator" },
    ...DOCUMENT_TYPES.map((type) => ({
      id: type,
      label: DOCUMENT_TYPE_META[type].label,
      icon: DOCUMENT_TYPE_META[type].entityIcon,
      disabled: properties.some(
        (p) => p.kind === "relation" && p.targetType === type,
      ),
      onSelect: () =>
        onChange([
          ...properties,
          {
            id: `${fileId}:related_${type}`,
            kind: "relation",
            key: `related_${type}`,
            label: DOCUMENT_TYPE_META[type].relationLabel,
            targetType: type,
            targetIds: [],
          },
        ]),
    })),
  ];

  const description = properties.filter(
    (p) => p.kind === "text" && p.key === "description",
  );
  const rest = properties.filter(
    (p) => !(p.kind === "text" && p.key === "description"),
  );

  const renderProperty = (property: DocumentProperty) =>
    property.kind === "text" ? (
      <TextRow
        key={property.id}
        property={property}
        readOnly={readOnly}
        onChange={(next) => replace(property.id, next)}
        onRemove={() => remove(property.id)}
      />
    ) : (
      <RelationRow
        key={property.id}
        property={property}
        fileId={fileId}
        nodes={nodes}
        readOnly={readOnly}
        onChange={(next) => replace(property.id, next)}
        onRemoveRow={() => remove(property.id)}
        onOpenFile={onOpenFile}
      />
    );

  return (
    <>
      <div className={styles.table} role="group" aria-label="속성">
        <div className={styles.row}>
          <div className={styles.identity}>
            <IconButton
              icon="tag"
              label="분류"
              className={styles.identityButton}
              tabIndex={-1}
            />
            <span className={styles.identityName}>분류</span>
          </div>
          <div
            className={styles.value}
            aria-disabled={readOnly || docType === "manuscript" || undefined}
          >
            <button
              ref={typeRef}
              type="button"
              className={styles.fileValue}
              disabled={readOnly || docType === "manuscript"}
              aria-haspopup="menu"
              aria-expanded={typeOpen}
              aria-label={`분류: ${meta.label}`}
              onClick={() => setTypeOpen(true)}
            >
              <Icon name={meta.entityIcon} size={14} />
              {meta.label}
            </button>
            <Menu
              anchorRef={typeRef}
              open={typeOpen}
              onOpenChange={setTypeOpen}
              label="분류 변경"
              entries={SETTING_DOCUMENT_TYPES.map((type) => ({
                id: type,
                label: DOCUMENT_TYPE_META[type].label,
                icon: DOCUMENT_TYPE_META[type].entityIcon,
                checked: type === docType,
                onSelect: () => type !== docType && onChangeType(type),
              }))}
            />
          </div>
        </div>
        {description.map(renderProperty)}
        {docType === "manuscript" && (
          <EpisodeRow
            episode={episode}
            episodes={episodes}
            readOnly={readOnly}
            onMoveToEpisode={onMoveToEpisode}
          />
        )}
        {rest.map(renderProperty)}
      </div>
      {!readOnly && (
        <>
          <button
            ref={addRef}
            type="button"
            className={styles.addProperty}
            aria-haspopup="menu"
            aria-expanded={addOpen}
            onClick={() => setAddOpen(true)}
          >
            <Icon name="plus" size={14} />
            속성 추가
          </button>
          <Menu
            anchorRef={addRef}
            open={addOpen}
            onOpenChange={setAddOpen}
            label="속성 추가"
            width={240}
            entries={addEntries}
          />
        </>
      )}
    </>
  );
}
