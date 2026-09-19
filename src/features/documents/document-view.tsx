"use client";

import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
} from "react";

import {
  Button,
  EmptyState,
  Icon,
  IconButton,
  InlineNotice,
  useToast,
} from "@/design-system/primitives";
import type { DocumentType } from "@/domain/document-types";
import type { ExportFormat, FolderNode } from "@/domain/models";
import { MemoPanel } from "@/features/memos/memo-panel";
import { isServiceError } from "@/services/errors";
import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";
import { useElementSize } from "@/shared/use-element-size";

import {
  categoryFolderOf,
  episodeOf,
  indexNodes,
  isDocument,
} from "../workspace/model/tree";
import {
  useFavorites,
  useFileTree,
  useMoveFile,
  useSetFavorite,
} from "../workspace/queries";
import { useWorkspace } from "../workspace/workspace-context";
import styles from "./document.module.css";
import { EditorToolbar } from "./editor-toolbar";
import { EDITOR_FONTS, useEditorPrefs } from "./editor-prefs";
import { createDocumentExtensions } from "./editor/extensions";
import { FileHeader } from "./file-header";
import { PropertyTable } from "./property-table";
import { useDocumentSession } from "./use-document-session";

const MIN_EDITOR_WIDTH = 560;

function BodyEditor({
  markdown,
  version,
  editable,
  onChange,
  onReady,
}: {
  markdown: string;
  version: number;
  editable: boolean;
  onChange: (markdown: string) => void;
  onReady: (editor: Editor | null) => void;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: createDocumentExtensions({ placeholder: "내용을 입력하세요" }),
    content: markdown,
    contentType: "markdown",
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        "aria-label": "본문",
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) =>
      onChangeRef.current(current.getMarkdown()),
  });

  useEffect(() => {
    onReady(editor);
    return () => onReady(null);
  }, [editor, onReady]);

  useEffect(() => {
    editor?.setEditable(editable, false);
  }, [editor, editable]);

  const appliedVersion = useRef(version);
  useEffect(() => {
    if (!editor || appliedVersion.current === version) return;
    appliedVersion.current = version;
    editor.commands.setContent(markdown, {
      contentType: "markdown",
      emitUpdate: false,
    });
  }, [editor, markdown, version]);

  return <EditorContent editor={editor} className={styles.editor} />;
}

function download(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function DocumentView({
  fileId,
}: {
  fileId: string;
  paneId: string;
  active: boolean;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { projectId, open, layout, dispatch } = useWorkspace();
  const tree = useFileTree(projectId);
  const favorites = useFavorites(projectId);
  const setFavorite = useSetFavorite(projectId);
  const move = useMoveFile(projectId);
  const prefs = useEditorPrefs();
  const doc = useDocumentSession(fileId);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [lockPending, setLockPending] = useState(false);
  const printRoot = useRef<HTMLDivElement>(null);
  const [workArea, setWorkArea] = useState<HTMLDivElement | null>(null);
  const workSize = useElementSize(workArea);

  const nodes = useMemo(() => tree.data ?? [], [tree.data]);
  const index = useMemo(() => indexNodes(nodes), [nodes]);
  const node = index.get(fileId);
  const episodes = useMemo(
    () =>
      nodes.filter(
        (n): n is FolderNode => n.kind === "folder" && n.role === "episode",
      ),
    [nodes],
  );

  if (doc.query.isError) {
    const missing =
      isServiceError(doc.query.error) && doc.query.error.code === "not-found";
    return (
      <div className={styles.state}>
        <EmptyState
          icon={missing ? "file-x" : "cloud-off"}
          title={missing ? "문서를 찾을 수 없어요" : "문서를 불러오지 못했어요"}
          description={
            missing
              ? "휴지통으로 옮겨졌거나 삭제된 문서예요."
              : "잠시 후 다시 시도해 주세요."
          }
          action={
            missing ? undefined : (
              <Button
                size="md"
                icon="refresh-cw"
                onClick={() => doc.query.refetch()}
              >
                다시 시도
              </Button>
            )
          }
        />
      </div>
    );
  }

  const content = doc.content;
  const draft = doc.draft;
  if (!content || !draft)
    return <div className={styles.state} aria-busy="true" />;

  const locked = doc.status === "locked";
  const favorite = (favorites.data ?? []).includes(fileId);
  const docType: DocumentType = isDocument(node)
    ? node.docType
    : content.docType;
  const font = EDITOR_FONTS.find((f) => f.id === prefs.font) ?? EDITOR_FONTS[0];
  const editorVars = {
    "--editor-font": font.stack,
    "--editor-size": `${prefs.fontSize}px`,
    "--editor-line-height": String(prefs.lineHeight),
    "--editor-align": prefs.align,
  } as CSSProperties;

  const toggleLock = async () => {
    setLockPending(true);
    try {
      await doc.session.save();
      const next = await services.documents.setLocked(fileId, !locked);
      doc.session.replace(next);
      queryClient.setQueryData(queryKeys.document(fileId), next);
      void invalidateProjectContent(queryClient, projectId);
      toast(
        next.locked
          ? {
              icon: "lock",
              title: "파일을 잠갔어요.",
              description: "잠금을 풀기 전까지는 편집할 수 없어요.",
            }
          : {
              icon: "lock-open",
              title: "잠금을 해제했어요.",
              description: "이제 다시 편집할 수 있어요.",
            },
      );
    } catch {
      toast({
        icon: "triangle-alert",
        title: "잠금 상태를 바꾸지 못했어요.",
        description: "잠시 후 다시 시도해 주세요.",
      });
    } finally {
      setLockPending(false);
    }
  };

  const exportAs = async (format: ExportFormat) => {
    if (format === "pdf") {
      await doc.session.save();
      document.body.classList.add("lk-printing");
      printRoot.current?.setAttribute("data-print-root", "");
      window.print();
      document.body.classList.remove("lk-printing");
      printRoot.current?.removeAttribute("data-print-root");
      return;
    }
    try {
      await doc.session.save();
      const result = await services.documents.export(fileId, format);
      if (result.url) {
        download(result.url, result.fileName);
        toast({
          icon: "download",
          title: "내보내기 파일을 만들었어요.",
          description: result.fileName,
        });
      } else {
        toast({
          icon: "info",
          title: `${format.toUpperCase()} 내보내기를 준비하고 있어요.`,
          description: "이 형식은 서버가 연결되면 내려받을 수 있어요.",
        });
      }
    } catch {
      toast({
        icon: "triangle-alert",
        title: "내보내지 못했어요.",
        description: "잠시 후 다시 시도해 주세요.",
      });
    }
  };

  const changeType = (type: DocumentType) => {
    const folder = categoryFolderOf(nodes, type);
    if (!folder) return;
    move.mutate(
      { fileId, parentId: folder.id, beforeId: null },
      {
        onSuccess: () =>
          queryClient.invalidateQueries({
            queryKey: queryKeys.document(fileId),
          }),
      },
    );
  };

  const panels = layout.panels;
  const memoSize =
    panels.memoDock === "right"
      ? panels.memoRightWidth
      : panels.memoBelowHeight;
  // 요구사항 §5.3: 편집 영역이 너무 좁아지면 오른쪽 메모를 접고 다시 열 수 있게 안내한다.
  const memoCollapsed =
    panels.memoOpen &&
    panels.memoDock === "right" &&
    workSize !== null &&
    workSize.width - panels.memoRightWidth < MIN_EDITOR_WIDTH;
  const closeMemo = () => {
    dispatch({ type: "setPanels", panels: { memoOpen: false } });
    workArea
      ?.closest("[data-document-view]")
      ?.querySelector<HTMLElement>("[data-memo-toggle]")
      ?.focus();
  };

  return (
    <div className={styles.view} data-document-view>
      <FileHeader
        memoOpen={panels.memoOpen}
        locked={locked}
        lockPending={lockPending}
        onToggleMemo={() =>
          dispatch({
            type: "setPanels",
            panels: { memoOpen: !panels.memoOpen },
          })
        }
        onOpenVersions={() =>
          toast({
            icon: "history",
            title: "버전 기록",
            description: "버전 기록 화면을 준비하고 있어요.",
          })
        }
        onExport={exportAs}
        onToggleLock={toggleLock}
      />
      <div
        ref={setWorkArea}
        className={cx(
          styles.workArea,
          panels.memoDock === "below" && styles.below,
        )}
      >
        {memoCollapsed && (
          <div className={styles.collapsedNotice} role="status">
            <Icon name="panel-right-close" size={15} />
            <span>작업 영역이 좁아 메모를 접었습니다</span>
            <Button
              size="md"
              icon="panel-bottom"
              onClick={() =>
                dispatch({ type: "setPanels", panels: { memoDock: "below" } })
              }
            >
              다시 열기
            </Button>
          </div>
        )}
        <div className={styles.main}>
          <EditorToolbar
            key={editor ? "ready" : "pending"}
            editor={editor}
            prefs={prefs}
            status={doc.status}
            locked={locked}
            onRetry={() => void doc.session.retry()}
          />
          {doc.status === "conflict" && (
            <InlineNotice
              icon="triangle-alert"
              action={
                <>
                  <Button onClick={() => void doc.session.keepMine()}>
                    내 변경 유지
                  </Button>
                  <Button onClick={() => void doc.session.takeTheirs()}>
                    최신 버전 불러오기
                  </Button>
                </>
              }
            >
              다른 곳에서 같은 문단을 먼저 고쳤어요. 어느 쪽을 남길지 골라
              주세요.
            </InlineNotice>
          )}
          <div className={styles.body}>
            <div className={styles.canvasScroll}>
              <div ref={printRoot} className={styles.column} style={editorVars}>
                <div className={styles.titleRow}>
                  <input
                    className={styles.title}
                    value={draft.title}
                    readOnly={locked}
                    placeholder="제목 없음"
                    aria-label="제목"
                    onChange={(event) =>
                      doc.session.update({ title: event.target.value })
                    }
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        editor?.commands.focus("start");
                      }
                    }}
                  />
                  <IconButton
                    icon="star"
                    iconSize={15}
                    label={favorite ? "즐겨찾기에서 제거" : "즐겨찾기에 추가"}
                    aria-pressed={favorite}
                    className={styles.favorite}
                    onClick={() =>
                      setFavorite.mutate({ fileId, favorite: !favorite })
                    }
                  />
                </div>
                <PropertyTable
                  fileId={fileId}
                  docType={docType}
                  properties={draft.properties}
                  nodes={nodes}
                  episode={episodeOf(index, fileId)}
                  episodes={episodes}
                  readOnly={locked}
                  onChange={(properties) => doc.session.update({ properties })}
                  onChangeType={changeType}
                  onMoveToEpisode={(episodeId) =>
                    move.mutate({ fileId, parentId: episodeId, beforeId: null })
                  }
                  onOpenFile={(target) =>
                    open({ kind: "file", fileId: target })
                  }
                />
                <BodyEditor
                  markdown={draft.bodyMd}
                  version={doc.contentVersion}
                  editable={!locked}
                  onChange={(bodyMd) => doc.session.update({ bodyMd })}
                  onReady={setEditor}
                />
              </div>
            </div>
          </div>
        </div>
        {panels.memoOpen && !memoCollapsed && (
          <MemoPanel
            projectId={projectId}
            fileId={fileId}
            fileTitle={draft.title || "제목 없음"}
            docType={docType}
            dock={panels.memoDock}
            size={memoSize}
            onResize={(size) =>
              dispatch({
                type: "setPanels",
                panels:
                  panels.memoDock === "right"
                    ? { memoRightWidth: size }
                    : { memoBelowHeight: size },
              })
            }
            onDock={(memoDock) =>
              dispatch({ type: "setPanels", panels: { memoDock } })
            }
            onClose={closeMemo}
          />
        )}
      </div>
    </div>
  );
}
