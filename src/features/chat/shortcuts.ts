import type { IconName } from "@/design-system/primitives";
import { GUIDE_TOPICS } from "@/features/help/guide-content";
import {
  WORKSPACE_VIEW_KINDS,
  type WorkspaceViewKind,
} from "@/features/workspace/model/layout";
import { WORKSPACE_VIEWS } from "@/features/workspace/views/registry";
import { t } from "@/i18n";

/**
 * 사용법 질문에 대한 답 끝에 서버가 붙이는 바로가기 표시. `[[action:…]]` 마커 하나가 단추 하나가 된다.
 * 모양은 ai-chat의 `app/guide.py`가 정한다: `tour`, `import`, `view:<화면>`, `guide:<주제>#<절>`.
 */
export type ChatShortcut =
  | { id: string; kind: "tour" }
  | { id: string; kind: "import" }
  | { id: string; kind: "view"; view: WorkspaceViewKind }
  | { id: string; kind: "guide"; topic: string; section: string | null };

export const SHORTCUT_MARKER = /\[\[action:([^\]\s]+)\]\]/g;

function isViewKind(value: string): value is WorkspaceViewKind {
  return (WORKSPACE_VIEW_KINDS as readonly string[]).includes(value);
}

export function parseShortcut(id: string): ChatShortcut | null {
  if (id === "tour" || id === "import") return { id, kind: id };
  if (id.startsWith("view:")) {
    const view = id.slice("view:".length);
    return isViewKind(view) ? { id, kind: "view", view } : null;
  }
  if (id.startsWith("guide:")) {
    const [topic, section] = id.slice("guide:".length).split("#");
    if (!topic) return null;
    return { id, kind: "guide", topic, section: section || null };
  }
  return null;
}

/** 본문에서 마커를 떼어 내고, 알아볼 수 있는 바로가기만 순서대로 모은다. */
export function splitShortcuts(content: string): {
  text: string;
  shortcuts: ChatShortcut[];
} {
  const shortcuts: ChatShortcut[] = [];
  let found = false;
  const cleaned = content.replace(SHORTCUT_MARKER, (_, id: string) => {
    found = true;
    const shortcut = parseShortcut(id);
    if (shortcut && !shortcuts.some((s) => s.id === shortcut.id))
      shortcuts.push(shortcut);
    return "";
  });
  const text = found ? cleaned.replace(/[ \t]+\n/g, "\n").trimEnd() : content;
  return { text, shortcuts };
}

export function stripShortcuts(content: string) {
  return splitShortcuts(content).text;
}

const VIEW_LABELS: Record<WorkspaceViewKind, () => string> = {
  new: () => t("새 탭 열기"),
  search: () => t("검색 열기"),
  graph: () => t("관계도 열기"),
  timeline: () => t("타임라인 열기"),
  memo: () => t("메모 열기"),
  "setting-check": () => t("설정 오류 점검 열기"),
  trash: () => t("휴지통 열기"),
  settings: () => t("프로젝트 설정 열기"),
  help: () => t("사용 가이드 열기"),
};

export function shortcutLabel(shortcut: ChatShortcut) {
  switch (shortcut.kind) {
    case "tour":
      return t("작업공간 둘러보기 시작");
    case "import":
      return t("가져오기 열기");
    case "view":
      return VIEW_LABELS[shortcut.view]();
    case "guide": {
      const topic = GUIDE_TOPICS.find(
        (candidate) => candidate.id === shortcut.topic,
      );
      const section = topic?.sections.find((s) => s.id === shortcut.section);
      const title = section?.title ?? topic?.title;
      return title ? t("가이드 · {title}", { title }) : t("사용 가이드 열기");
    }
  }
}

export function shortcutIcon(shortcut: ChatShortcut): IconName {
  switch (shortcut.kind) {
    case "tour":
      return "panels-top-left";
    case "import":
      return "upload";
    case "view":
      return WORKSPACE_VIEWS[shortcut.view].icon;
    case "guide":
      return "book-open";
  }
}
