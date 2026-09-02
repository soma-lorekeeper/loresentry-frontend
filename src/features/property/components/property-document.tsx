"use client";

import {
  type KeyboardEvent,
  type ReactNode,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

import { getMenuItemIndex } from "@/components/ui/keyboard-navigation";
import {
  WorkspaceIcon,
  type WorkspaceIconName,
} from "@/features/workspace/icons";

import styles from "./property-document.module.css";

export type PropertyFileType =
  | "character"
  | "event"
  | "item"
  | "manuscript"
  | "organization"
  | "place"
  | "setting"
  | "worldbuilding";
export type PropertyValueType = "text" | PropertyFileType;

export interface PropertyReference {
  id: string;
  title: string;
  type: PropertyFileType;
}

export interface TextDocumentProperty {
  id: string;
  name: string;
  type: "text";
  value: string;
}

export interface FileDocumentProperty {
  id: string;
  name: string;
  references: PropertyReference[];
  type: PropertyFileType;
}

export type DocumentProperty = TextDocumentProperty | FileDocumentProperty;

export interface PropertyDocument {
  body: string;
  properties: DocumentProperty[];
  title: string;
}

export interface PropertyDocumentEditorProps {
  availableFiles?: PropertyReference[];
  document: PropertyDocument;
  documentId: string;
  onChange: (document: PropertyDocument) => void;
  onOpenReference?: (reference: PropertyReference) => void;
}

const propertyTypeOptions: Array<{
  icon: WorkspaceIconName;
  label: string;
  value: PropertyValueType;
}> = [
  { icon: "type", label: "텍스트", value: "text" },
  { icon: "file", label: "원고", value: "manuscript" },
  { icon: "setting-file", label: "설정", value: "setting" },
  { icon: "character", label: "캐릭터", value: "character" },
  { icon: "event", label: "이벤트", value: "event" },
  { icon: "organization", label: "조직", value: "organization" },
  { icon: "item", label: "아이템", value: "item" },
  { icon: "place", label: "장소", value: "place" },
  { icon: "worldbuilding", label: "세계관", value: "worldbuilding" },
];

export const propertyFileIcons: Record<PropertyFileType, WorkspaceIconName> = {
  character: "character",
  event: "event",
  item: "item",
  manuscript: "file",
  organization: "organization",
  place: "place",
  setting: "setting-file",
  worldbuilding: "worldbuilding",
};

function MenuSurface({
  children,
  label,
  onClose,
}: {
  children: ReactNode;
  label: string;
  onClose: (restoreFocus: boolean) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    requestAnimationFrame(() =>
      ref.current
        ?.querySelector<HTMLButtonElement>("[role^=menuitem]")
        ?.focus(),
    );
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const items = Array.from(
      event.currentTarget.querySelectorAll<HTMLButtonElement>(
        "[role^=menuitem]:not(:disabled)",
      ),
    );
    const currentIndex = items.indexOf(
      document.activeElement as HTMLButtonElement,
    );
    const intent =
      event.key === "ArrowDown"
        ? "next"
        : event.key === "ArrowUp"
          ? "previous"
          : event.key === "Home"
            ? "first"
            : event.key === "End"
              ? "last"
              : undefined;
    if (intent) {
      event.preventDefault();
      items[getMenuItemIndex(items.length, currentIndex, intent)]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      onClose(true);
    } else if (event.key === "Tab") {
      onClose(false);
    }
  };

  return (
    <div
      aria-label={label}
      className={styles.menuSurface}
      onKeyDown={onKeyDown}
      ref={ref}
      role="menu"
    >
      {children}
    </div>
  );
}

function PropertyTypeMenu({
  currentType,
  label,
  onClose,
  onSelect,
}: {
  currentType: PropertyValueType;
  label: string;
  onClose: (restoreFocus: boolean) => void;
  onSelect: (type: PropertyValueType) => void;
}) {
  return (
    <MenuSurface label={label} onClose={onClose}>
      {propertyTypeOptions.map((option, index) => (
        <div className={styles.menuEntry} key={option.value}>
          {index === 1 && <span className={styles.menuSeparator} />}
          <button
            aria-checked={option.value === currentType}
            className={styles.typeOption}
            data-selected={option.value === currentType || undefined}
            onClick={() => onSelect(option.value)}
            role="menuitemradio"
            type="button"
          >
            <WorkspaceIcon name={option.icon} />
            <span>{option.label}</span>
            {option.value === currentType && (
              <WorkspaceIcon className={styles.selectedIcon} name="check" />
            )}
          </button>
        </div>
      ))}
    </MenuSurface>
  );
}

function FileChip({
  onOpen,
  onRemove,
  reference,
}: {
  onOpen?: () => void;
  onRemove: () => void;
  reference: PropertyReference;
}) {
  return (
    <span className={styles.fileChip}>
      <button
        aria-label={`${reference.title} 열기`}
        className={styles.fileChipLink}
        onClick={onOpen}
        type="button"
      >
        <WorkspaceIcon name={propertyFileIcons[reference.type]} />
        <span>{reference.title}</span>
      </button>
      <button
        aria-label={`${reference.title} 참조 제거`}
        className={styles.fileChipRemove}
        onClick={onRemove}
        type="button"
      >
        <WorkspaceIcon name="close" />
      </button>
    </span>
  );
}

function PropertyRow({
  availableFiles,
  initialTypeMenuOpen,
  onChange,
  onDelete,
  onOpenReference,
  property,
}: {
  availableFiles: PropertyReference[];
  initialTypeMenuOpen?: boolean;
  onChange: (property: DocumentProperty) => void;
  onDelete: () => void;
  onOpenReference?: (reference: PropertyReference) => void;
  property: DocumentProperty;
}) {
  const [openMenu, setOpenMenu] = useState<
    "more" | "references" | "type" | undefined
  >(initialTypeMenuOpen ? "type" : undefined);
  const typeTriggerRef = useRef<HTMLButtonElement>(null);
  const referenceTriggerRef = useRef<HTMLButtonElement>(null);
  const moreTriggerRef = useRef<HTMLButtonElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const typeLabel = propertyTypeOptions.find(
    (option) => option.value === property.type,
  )!.label;
  const menuId = useId();

  useEffect(() => {
    if (!initialTypeMenuOpen) return;
    requestAnimationFrame(() => nameInputRef.current?.focus());
  }, [initialTypeMenuOpen]);

  const closeMenu = (restoreFocus: boolean) => {
    const activeMenu = openMenu;
    setOpenMenu(undefined);
    if (!restoreFocus) return;
    requestAnimationFrame(() => {
      if (activeMenu === "type") typeTriggerRef.current?.focus();
      if (activeMenu === "references") referenceTriggerRef.current?.focus();
      if (activeMenu === "more") moreTriggerRef.current?.focus();
    });
  };

  const changeType = (type: PropertyValueType) => {
    onChange(
      type === "text"
        ? { id: property.id, name: property.name, type, value: "" }
        : { id: property.id, name: property.name, references: [], type },
    );
    closeMenu(true);
  };

  const selectableFiles =
    property.type === "text"
      ? []
      : availableFiles.filter(
          (file) =>
            file.type === property.type &&
            !property.references.some((reference) => reference.id === file.id),
        );

  return (
    <div
      className={styles.propertyRow}
      data-property-id={property.id}
      data-property-kind={property.type === "text" ? "text" : "file"}
    >
      <div className={styles.propertyIdentity}>
        <span className={styles.menuAnchor}>
          <button
            aria-controls={openMenu === "type" ? menuId : undefined}
            aria-expanded={openMenu === "type"}
            aria-haspopup="menu"
            aria-label={`${property.name || "새 속성"} 유형: ${typeLabel}`}
            className={styles.iconButton}
            onClick={() =>
              setOpenMenu((current) =>
                current === "type" ? undefined : "type",
              )
            }
            ref={typeTriggerRef}
            type="button"
          >
            <WorkspaceIcon
              name={
                property.type === "text"
                  ? "type"
                  : propertyFileIcons[property.type]
              }
            />
          </button>
          {openMenu === "type" && (
            <div id={menuId}>
              <PropertyTypeMenu
                currentType={property.type}
                label={`${property.name || "새 속성"} 유형`}
                onClose={closeMenu}
                onSelect={changeType}
              />
            </div>
          )}
        </span>
        <label
          className={styles.srOnly}
          htmlFor={`property-name-${property.id}`}
        >
          속성 이름
        </label>
        <input
          className={styles.propertyName}
          id={`property-name-${property.id}`}
          onChange={(event) =>
            onChange({ ...property, name: event.target.value })
          }
          placeholder="속성 이름"
          ref={nameInputRef}
          value={property.name}
        />
      </div>

      {property.type === "text" ? (
        <label className={styles.propertyValue}>
          <span className={styles.srOnly}>{property.name || "새 속성"} 값</span>
          <textarea
            onChange={(event) =>
              onChange({ ...property, value: event.target.value })
            }
            placeholder="텍스트 입력"
            rows={1}
            value={property.value}
          />
        </label>
      ) : (
        <div className={styles.propertyValue}>
          <div className={styles.referenceList}>
            {property.references.map((reference) => (
              <FileChip
                key={reference.id}
                onOpen={() => onOpenReference?.(reference)}
                onRemove={() =>
                  onChange({
                    ...property,
                    references: property.references.filter(
                      (item) => item.id !== reference.id,
                    ),
                  })
                }
                reference={reference}
              />
            ))}
            <span className={styles.menuAnchor}>
              <button
                aria-expanded={openMenu === "references"}
                aria-haspopup="menu"
                aria-label={`${typeLabel} 파일 참조 추가`}
                className={styles.addReference}
                disabled={selectableFiles.length === 0}
                onClick={() =>
                  setOpenMenu((current) =>
                    current === "references" ? undefined : "references",
                  )
                }
                ref={referenceTriggerRef}
                type="button"
              >
                <WorkspaceIcon name="plus" />
              </button>
              {openMenu === "references" && (
                <MenuSurface
                  label={`${typeLabel} 파일 선택`}
                  onClose={closeMenu}
                >
                  {selectableFiles.map((file) => (
                    <button
                      className={styles.referenceOption}
                      key={file.id}
                      onClick={() => {
                        onChange({
                          ...property,
                          references: [...property.references, file],
                        });
                        closeMenu(true);
                      }}
                      role="menuitem"
                      type="button"
                    >
                      <WorkspaceIcon name={propertyFileIcons[file.type]} />
                      <span>{file.title}</span>
                    </button>
                  ))}
                </MenuSurface>
              )}
            </span>
          </div>
        </div>
      )}

      <span className={styles.menuAnchor}>
        <button
          aria-expanded={openMenu === "more"}
          aria-haspopup="menu"
          aria-label={`${property.name || "새 속성"} 더보기`}
          className={styles.iconButton}
          onClick={() =>
            setOpenMenu((current) => (current === "more" ? undefined : "more"))
          }
          ref={moreTriggerRef}
          type="button"
        >
          <WorkspaceIcon name="ellipsis" />
        </button>
        {openMenu === "more" && (
          <MenuSurface
            label={`${property.name || "새 속성"} 더보기`}
            onClose={closeMenu}
          >
            <button
              className={styles.referenceOption}
              onClick={() => {
                closeMenu(false);
                requestAnimationFrame(() =>
                  document
                    .getElementById(`property-name-${property.id}`)
                    ?.focus(),
                );
              }}
              role="menuitem"
              type="button"
            >
              이름 변경
            </button>
            <button
              className={styles.referenceOption}
              onClick={onDelete}
              role="menuitem"
              type="button"
            >
              속성 삭제
            </button>
          </MenuSurface>
        )}
      </span>
    </div>
  );
}

export function PropertyDocumentEditor({
  availableFiles = [],
  document,
  documentId,
  onChange,
  onOpenReference,
}: PropertyDocumentEditorProps) {
  const counterRef = useRef(document.properties.length);
  const [newPropertyId, setNewPropertyId] = useState<string>();

  const updateProperty = (nextProperty: DocumentProperty) =>
    onChange({
      ...document,
      properties: document.properties.map((property) =>
        property.id === nextProperty.id ? nextProperty : property,
      ),
    });

  const addProperty = () => {
    counterRef.current += 1;
    const id = `${documentId}-property-${counterRef.current}`;
    setNewPropertyId(id);
    onChange({
      ...document,
      properties: [
        ...document.properties,
        { id, name: "", type: "text", value: "" },
      ],
    });
  };

  return (
    <section
      aria-label={`${document.title || "제목 없는 문서"} 속성 문서`}
      className={styles.documentCanvas}
      data-document-id={documentId}
      id={`panel-${documentId}`}
      role="tabpanel"
      tabIndex={-1}
    >
      <div className={styles.readingColumn}>
        <label
          className={styles.srOnly}
          htmlFor={`property-title-${documentId}`}
        >
          문서 제목
        </label>
        <input
          autoFocus={!document.title}
          className={styles.documentTitle}
          id={`property-title-${documentId}`}
          onChange={(event) =>
            onChange({ ...document, title: event.target.value })
          }
          placeholder="제목 없는 문서"
          value={document.title}
        />

        <section aria-labelledby={`properties-heading-${documentId}`}>
          <h2
            className={styles.sectionHeading}
            id={`properties-heading-${documentId}`}
          >
            속성
          </h2>
          <div className={styles.propertyList}>
            {document.properties.map((property) => (
              <PropertyRow
                availableFiles={availableFiles}
                initialTypeMenuOpen={property.id === newPropertyId}
                key={property.id}
                onChange={updateProperty}
                onDelete={() =>
                  onChange({
                    ...document,
                    properties: document.properties.filter(
                      (item) => item.id !== property.id,
                    ),
                  })
                }
                onOpenReference={onOpenReference}
                property={property}
              />
            ))}
            <button
              className={styles.addProperty}
              onClick={addProperty}
              type="button"
            >
              <WorkspaceIcon name="plus" />
              <span>속성 추가</span>
            </button>
          </div>
        </section>

        <label className={styles.bodyField}>
          <span>문서 내용</span>
          <textarea
            onChange={(event) =>
              onChange({ ...document, body: event.target.value })
            }
            placeholder="내용을 입력하세요."
            value={document.body}
          />
        </label>
      </div>
    </section>
  );
}

export const propertyDocumentSamples: Record<string, PropertyDocument> = {
  character: {
    body: "서윤은 유리 정원의 균열을 처음 발견한 기록자다.",
    properties: [
      {
        id: "character-organization",
        name: "소속 조직",
        references: [
          {
            id: "organization-keepers",
            title: "정원 기록단",
            type: "organization",
          },
        ],
        type: "organization",
      },
      {
        id: "character-description",
        name: "소개",
        type: "text",
        value: "북쪽 온실을 담당하는 기록자",
      },
    ],
    title: "서윤",
  },
  item: {
    body: "균열의 방향을 비추는 오래된 등불이다.",
    properties: [
      {
        id: "item-owner",
        name: "소유자",
        references: [{ id: "character", title: "서윤", type: "character" }],
        type: "character",
      },
    ],
    title: "은빛 등불",
  },
  organization: {
    body: "정원의 변화를 관찰하고 기록한다.",
    properties: [
      {
        id: "organization-purpose",
        name: "목적",
        type: "text",
        value: "균열 관찰",
      },
    ],
    title: "정원 기록단",
  },
  place: {
    body: "유리 정원 북쪽 끝, 오래 잠겨 있던 온실.",
    properties: [
      {
        id: "place-parent",
        name: "상위 장소",
        references: [{ id: "place-garden", title: "유리 정원", type: "place" }],
        type: "place",
      },
    ],
    title: "북쪽 온실",
  },
  setting: {
    body: "균열은 장소가 아니라 기억이 향하는 방향을 따라 열린다.",
    properties: [
      {
        id: "setting-category",
        name: "분류",
        type: "text",
        value: "마법 체계",
      },
      {
        id: "setting-manuscript",
        name: "관련 원고",
        references: [
          {
            id: "manuscript-12",
            title: "12화 · 균열의 밤",
            type: "manuscript",
          },
        ],
        type: "manuscript",
      },
    ],
    title: "균열의 법칙",
  },
  worldbuilding: { body: "", properties: [], title: "" },
};

export function createInitialPropertyDocument(
  documentId: string,
  title: string,
): PropertyDocument {
  const sample = propertyDocumentSamples[documentId];
  return sample ? structuredClone(sample) : { body: "", properties: [], title };
}
