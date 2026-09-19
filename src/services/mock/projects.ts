import { DOCUMENT_TYPE_META, DOCUMENT_TYPES } from "@/domain/document-types";
import type { Project } from "@/domain/models";

import { ServiceError } from "../errors";
import type { ProjectService } from "../ports";

import { simulate } from "./control";
import { getDb, nextId, persistDb } from "./db";

export const PROJECT_TITLE_MAX = 255;

const NEW_PROJECT_ICONS = [
  "book-open",
  "sparkles",
  "library",
  "orbit",
  "notebook-tabs",
] as const;

function requireProject(projectId: string) {
  const project = getDb().projects.find((p) => p.id === projectId);
  if (!project)
    throw new ServiceError("not-found", "프로젝트를 찾을 수 없어요.");
  return project;
}

function validateTitle(title: string, ignoreId?: string) {
  const trimmed = title.trim();
  if (!trimmed)
    throw new ServiceError("validation", "프로젝트 제목을 입력해 주세요.");
  if (trimmed.length > PROJECT_TITLE_MAX) {
    throw new ServiceError(
      "validation",
      `프로젝트 제목은 ${PROJECT_TITLE_MAX}자 이하로 입력해 주세요.`,
    );
  }
  const duplicate = getDb().projects.some(
    (p) =>
      p.id !== ignoreId &&
      !p.trashedAt &&
      p.title.toLocaleLowerCase() === trimmed.toLocaleLowerCase(),
  );
  if (duplicate)
    throw new ServiceError("duplicate", "같은 이름의 프로젝트가 이미 있어요.");
  return trimmed;
}

const byRecent = (a: Project, b: Project) =>
  b.lastWorkedAt.localeCompare(a.lastWorkedAt);

export const mockProjects: ProjectService = {
  list: () =>
    simulate("projects.list", () =>
      getDb()
        .projects.filter((p) => !p.trashedAt)
        .sort(byRecent),
    ),
  get: (projectId) =>
    simulate("projects.get", () => {
      const project = requireProject(projectId);
      if (project.trashedAt) {
        throw new ServiceError(
          "not-found",
          "휴지통에 있는 프로젝트는 열 수 없어요.",
        );
      }
      return project;
    }),
  create: ({ title, description }) =>
    simulate("projects.create", () => {
      const db = getDb();
      const now = new Date().toISOString();
      const project: Project = {
        id: nextId("project"),
        title: validateTitle(title),
        description: description.trim(),
        icon: NEW_PROJECT_ICONS[db.projects.length % NEW_PROJECT_ICONS.length],
        createdAt: now,
        lastWorkedAt: now,
        lastFile: null,
        trashedAt: null,
      };
      db.projects.push(project);
      DOCUMENT_TYPES.forEach((type, index) =>
        db.files.push({
          kind: "folder",
          id: `${project.id}:folder:${type}`,
          projectId: project.id,
          parentId: null,
          title: DOCUMENT_TYPE_META[type].label,
          role: "category",
          category: type,
          rank: String((index + 1) * 1024),
          trashedAt: null,
        }),
      );
      db.favorites[project.id] = [];
      db.sections[project.id] = [];
      persistDb();
      return project;
    }),
  rename: (projectId, title) =>
    simulate("projects.rename", () => {
      const project = requireProject(projectId);
      project.title = validateTitle(title, projectId);
      persistDb();
      return project;
    }),
  moveToTrash: (projectId) =>
    simulate("projects.trash", () => {
      requireProject(projectId).trashedAt = new Date().toISOString();
      persistDb();
    }),
  listTrash: () =>
    simulate("projects.listTrash", () =>
      getDb()
        .projects.filter((p) => p.trashedAt)
        .sort((a, b) => (b.trashedAt ?? "").localeCompare(a.trashedAt ?? "")),
    ),
  restore: (projectId) =>
    simulate("projects.restore", () => {
      const project = requireProject(projectId);
      validateTitle(project.title, projectId);
      project.trashedAt = null;
      persistDb();
      return project;
    }),
  deletePermanently: (projectId) =>
    simulate("projects.delete", () => {
      const db = getDb();
      db.projects = db.projects.filter((p) => p.id !== projectId);
      const fileIds = new Set(
        db.files.filter((f) => f.projectId === projectId).map((f) => f.id),
      );
      db.files = db.files.filter((f) => f.projectId !== projectId);
      for (const id of fileIds) delete db.documents[id];
      db.memos = db.memos.filter((m) => m.projectId !== projectId);
      db.chatSessions = db.chatSessions.filter(
        (s) => s.projectId !== projectId,
      );
      delete db.workspaceStates[projectId];
      persistDb();
    }),
  getSettings: (projectId) =>
    simulate("projects.settings", () => {
      const project = requireProject(projectId);
      return { title: project.title, description: project.description };
    }),
  saveSettings: (projectId, settings) =>
    simulate("projects.saveSettings", () => {
      const project = requireProject(projectId);
      project.title = validateTitle(settings.title, projectId);
      project.description = settings.description.trim();
      persistDb();
      return project;
    }),
};
