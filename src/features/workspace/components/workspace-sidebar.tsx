"use client";

import { Menu, MenuItem } from "@/components/ui";

import { WorkspaceIcon } from "../icons";
import {
  favoriteItems,
  fileItems,
  primaryNavigation,
  type ProjectSummary,
  utilityNavigation,
  type WorkspaceNavItem,
} from "../workspace-data";
import styles from "./workspace.module.css";

interface SidebarItemProps {
  item: WorkspaceNavItem;
  onSelect: (item: WorkspaceNavItem) => void;
  selected: boolean;
}

function SidebarItem({ item, onSelect, selected }: SidebarItemProps) {
  return (
    <button
      aria-current={selected ? "page" : undefined}
      className={styles.sidebarItem}
      data-level={item.level ?? 0}
      data-selected={selected || undefined}
      onClick={() => onSelect(item)}
      type="button"
    >
      <WorkspaceIcon className={styles.itemIcon} name={item.icon} />
      <span className={styles.itemLabel}>{item.label}</span>
      {selected && <span className={styles.srOnly}>선택됨</span>}
    </button>
  );
}

interface SectionMenuProps {
  kind: "favorites" | "files";
}

function SectionMenu({ kind }: SectionMenuProps) {
  const isFavorites = kind === "favorites";
  const label = isFavorites ? "즐겨찾기" : "파일";
  const fileTypes = [
    "원고",
    "설정",
    "캐릭터",
    "이벤트",
    "조직",
    "아이템",
    "장소",
    "세계관",
  ];

  return (
    <Menu
      buttonContent={<WorkspaceIcon name="ellipsis" />}
      buttonLabel={`${label} 메뉴`}
      className={styles.sectionMenu}
      triggerClassName={styles.moreButton}
    >
      {!isFavorites &&
        fileTypes.map((fileType) => (
          <MenuItem key={fileType}>{fileType}</MenuItem>
        ))}
      {!isFavorites && (
        <div className={styles.menuSeparator} role="separator" />
      )}
      <MenuItem>새 폴더</MenuItem>
      {!isFavorites && <MenuItem>가져오기</MenuItem>}
      <MenuItem>이름 변경</MenuItem>
      <div className={styles.menuSeparator} role="separator" />
      <MenuItem>섹션 추가</MenuItem>
    </Menu>
  );
}

interface SidebarSectionProps {
  items: WorkspaceNavItem[];
  label: string;
  menuKind: "favorites" | "files";
  onSelect: (item: WorkspaceNavItem) => void;
  selectedId: string;
}

function SidebarSection({
  items,
  label,
  menuKind,
  onSelect,
  selectedId,
}: SidebarSectionProps) {
  return (
    <section
      aria-labelledby={`${menuKind}-heading`}
      className={styles.sidebarSection}
    >
      <div className={styles.sectionHeader}>
        <h2 id={`${menuKind}-heading`}>{label}</h2>
        <SectionMenu kind={menuKind} />
      </div>
      <div className={styles.sectionItems}>
        {items.map((item, index) => (
          <SidebarItem
            item={item}
            key={`${item.id}-${index}`}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
      </div>
    </section>
  );
}

export interface WorkspaceSidebarProps {
  currentProject: ProjectSummary;
  onProjectSelect: (project: ProjectSummary) => void;
  onSelect: (item: WorkspaceNavItem) => void;
  projects: ProjectSummary[];
  selectedId: string;
  userName: string;
}

export function WorkspaceSidebar({
  currentProject,
  onProjectSelect,
  onSelect,
  projects,
  selectedId,
  userName,
}: WorkspaceSidebarProps) {
  return (
    <aside aria-label="Workspace 사이드바" className={styles.sidebar}>
      <div className={styles.userSummary}>
        <span aria-hidden="true" className={styles.avatar} />
        <span>{userName}</span>
      </div>

      <Menu
        buttonContent={
          <>
            <WorkspaceIcon name="book" />
            <span className={styles.projectName}>{currentProject.name}</span>
            <WorkspaceIcon className={styles.chevron} name="chevron" />
          </>
        }
        buttonLabel={`프로젝트 전환: ${currentProject.name}`}
        className={styles.projectSwitcher}
        placement="start"
        triggerClassName={styles.projectButton}
      >
        <MenuItem>프로젝트 목록</MenuItem>
        {projects.map((project) => (
          <MenuItem
            key={project.id}
            onClick={() => onProjectSelect(project)}
            selected={project.id === currentProject.id}
          >
            {project.name}
          </MenuItem>
        ))}
      </Menu>

      <nav aria-label="프로젝트 기능" className={styles.primaryNavigation}>
        {primaryNavigation.map((item) => (
          <SidebarItem
            item={item}
            key={item.id}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
      </nav>

      <SidebarSection
        items={favoriteItems}
        label="즐겨찾기"
        menuKind="favorites"
        onSelect={onSelect}
        selectedId={selectedId}
      />
      <SidebarSection
        items={fileItems}
        label="파일"
        menuKind="files"
        onSelect={onSelect}
        selectedId={selectedId}
      />

      <nav aria-label="프로젝트 관리" className={styles.utilityNavigation}>
        {utilityNavigation.map((item) => (
          <SidebarItem
            item={item}
            key={item.id}
            onSelect={onSelect}
            selected={item.id === selectedId}
          />
        ))}
      </nav>
    </aside>
  );
}
