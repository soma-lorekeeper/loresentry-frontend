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
import { flushSync } from "react-dom";

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
import { VersionHistoryModal } from "@/features/versions/version-history-modal";
import { isServiceError } from "@/services/errors";
import { invalidateProjectContent, queryKeys } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";
import { useElementSize } from "@/shared/use-element-size";
import { t } from "@/i18n";

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
import { tabIdFor } from "../workspace/model/layout";
import { useWorkspace, type TabActions } from "../workspace/workspace-context";
import styles from "./document.module.css";
import { EditorToolbar } from "./editor-toolbar";
import { useEditorFontStack } from "./editor-fonts";
import { useEditorPrefs } from "./editor-prefs";
import { createDocumentExtensions } from "./editor/extensions";
import { documentJSON } from "./editor/text-align";
import { FileHeader } from "./file-header";
import { PrintSheet, printRows } from "./print-sheet";
import { PropertyTable } from "./property-table";
import { useDocumentSession } from "./use-document-session";
import { bodyOf, type DocumentBody } from "@/domain/document-body";

const MIN_EDITOR_WIDTH = 640;

function BodyEditor({
  body,
  version,
  editable,
  onChange,
  onReady,
}: {
  body: DocumentBody;
  version: number;
  editable: boolean;
  onChange: (body: DocumentBody) => void;
  onReady: (editor: Editor | null) => void;
}) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const editor = useEditor({
    extensions: createDocumentExtensions({
      placeholder: t("내용을 입력하세요"),
    }),
    content: body.doc,
    immediatelyRender: false,
    editable,
    editorProps: {
      attributes: {
        "aria-label": t("본문"),
        role: "textbox",
        "aria-multiline": "true",
      },
    },
    onUpdate: ({ editor: current }) =>
      onChangeRef.current(bodyOf(documentJSON(current))),
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
    editor.commands.setContent(body.doc, { emitUpdate: false });
  }, [editor, body, version]);

  return (
    <EditorContent
      editor={editor}
      className={styles.editor}
      data-tour="editor"
    />
  );
}

/**
 * 이 문서 탭이 단축키에 내주는 일을 작업공간에 등록한다(저장, 찾기, PDF).
 *
 * 등록은 탭이 바뀔 때만 다시 하고, 불릴 때는 늘 지금의 함수를 부른다. 문서 화면은 글자를
 * 칠 때마다 다시 그려지므로 그때마다 등록을 갈아 끼우지 않으려는 것이다.
 */
function TabActionsBridge({
  paneId,
  tabId,
  actions,
}: {
  paneId: string;
  tabId: string;
  actions: Required<TabActions>;
}) {
  const { registerTabActions } = useWorkspace();
  const latest = useRef(actions);
  useEffect(() => {
    latest.current = actions;
  });
  useEffect(
    () =>
      registerTabActions(paneId, tabId, {
        save: () => latest.current.save(),
        find: () => latest.current.find(),
        exportPdf: () => latest.current.exportPdf(),
      }),
    [paneId, tabId, registerTabActions],
  );
  return null;
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
  paneId,
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
  // 웹 글꼴은 처음 고를 때 받는다. 오기 전에는 기기의 비슷한 글꼴로 그린다(editor-fonts.ts).
  const fontStack = useEditorFontStack(prefs.font);
  const doc = useDocumentSession(fileId);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [lockPending, setLockPending] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  // 찾기 막대. 도구 막대의 단추와 단축키(문서에서 찾기)가 함께 여닫는다.
  const [findOpen, setFindOpen] = useState(false);
  // 인쇄 중일 때만 본문 HTML 이 들어 있다. 그동안에만 인쇄 지면을 그린다(print-sheet.tsx).
  const [printing, setPrinting] = useState<string | null>(null);
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
          title={
            missing ? t("문서를 찾을 수 없어요") : t("문서를 불러오지 못했어요")
          }
          description={
            missing
              ? t("휴지통으로 옮겨졌거나 삭제된 문서예요.")
              : t("잠시 후 다시 시도해 주세요.")
          }
          action={
            missing ? undefined : (
              <Button
                size="md"
                icon="refresh-cw"
                onClick={() => doc.query.refetch()}
              >
                {t("다시 시도")}
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
  // 글꼴·크기·줄 간격은 이 브라우저의 설정이다. 정렬은 문단마다 본문에 담겨 여기 없다.
  const editorVars = {
    "--editor-font": fontStack,
    "--editor-size": `${prefs.fontSize}pt`,
    "--editor-line-height": String(prefs.lineHeight),
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
              title: t("파일을 잠갔어요."),
              description: t("잠금을 풀기 전까지는 편집할 수 없어요."),
            }
          : {
              icon: "lock-open",
              title: t("잠금을 해제했어요."),
              description: t("이제 다시 편집할 수 있어요."),
            },
      );
    } catch {
      toast({
        icon: "triangle-alert",
        title: t("잠금 상태를 바꾸지 못했어요."),
        description: t("잠시 후 다시 시도해 주세요."),
      });
    } finally {
      setLockPending(false);
    }
  };

  /**
   * PDF 로 내보낸다 — 브라우저의 인쇄로 넘긴다(대화상자에서 "PDF 로 저장" 을 고른다).
   *
   * <p>편집 화면을 그대로 인쇄하면 입력창·도구 막대·스크롤 영역이 종이에 찍힌다. 그래서 제목·
   * 속성·본문만 담은 인쇄 지면을 따로 그리고, 인쇄하는 동안 그것만 보이게 한다.
   */
  const exportPdf = async () => {
    // 이미 인쇄 중이면(대화상자가 떠 있으면) 다시 시작하지 않는다.
    if (printing !== null || !editor) return;
    await doc.session.save();
    // 지면이 실제로 그려진 뒤에 인쇄해야 한다. 상태만 바꾸고 바로 인쇄하면 빈 종이가 나온다.
    flushSync(() => setPrinting(editor.getHTML()));
    // 고른 글꼴을 아직 받는 중이면 다 올 때까지 기다린다. 기다리지 않으면 대체 글꼴로 찍힌다.
    await document.fonts?.ready;
    // 인쇄 대화상자는 문서 제목을 PDF 파일 이름으로 쓴다.
    const pageTitle = document.title;
    document.title = draft.title || t("제목 없음");
    document.body.classList.add("lk-printing");
    // 대화상자가 닫히면(저장했든 취소했든) 원래대로 돌린다. print() 가 끝나기를 기다리지 않는
    // 브라우저도 있어, 돌아오는 것을 믿지 않고 이 사건을 듣는다.
    const restore = () => {
      window.removeEventListener("afterprint", restore);
      document.body.classList.remove("lk-printing");
      document.title = pageTitle;
      setPrinting(null);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const exportAs = async (format: ExportFormat) => {
    if (format === "pdf") {
      await exportPdf();
      return;
    }
    try {
      await doc.session.save();
      const result = await services.documents.export(fileId, format);
      if (result.url) {
        download(result.url, result.fileName);
        toast({
          icon: "download",
          title: t("내보내기 파일을 만들었어요."),
          description: result.fileName,
        });
      } else {
        toast({
          icon: "info",
          title: t("{format} 내보내기를 준비하고 있어요.", {
            format: format.toUpperCase(),
          }),
          description: t("이 형식은 서버가 연결되면 내려받을 수 있어요."),
        });
      }
    } catch {
      toast({
        icon: "triangle-alert",
        title: t("내보내지 못했어요."),
        description: t("잠시 후 다시 시도해 주세요."),
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
    workSize.width > 0 &&
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
      <TabActionsBridge
        paneId={paneId}
        tabId={tabIdFor({ kind: "file", fileId })}
        actions={{
          save: () => doc.session.save(),
          find: () => setFindOpen(true),
          exportPdf: () => void exportAs("pdf"),
        }}
      />
      {printing !== null && (
        <PrintSheet
          title={draft.title || t("제목 없음")}
          rows={printRows(
            docType,
            draft.properties,
            index,
            episodeOf(index, fileId),
          )}
          html={printing}
          style={editorVars}
        />
      )}
      <div
        ref={setWorkArea}
        className={cx(
          styles.workArea,
          panels.memoDock === "below" && styles.below,
        )}
      >
        <div className={styles.main}>
          <EditorToolbar
            key={editor ? "ready" : "pending"}
            editor={editor}
            prefs={prefs}
            status={doc.status}
            locked={locked}
            onRetry={() => void doc.session.retry()}
            findOpen={findOpen}
            onFindOpenChange={setFindOpen}
            actions={
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
                onOpenVersions={() => setVersionsOpen(true)}
                onExport={exportAs}
                onToggleLock={toggleLock}
              />
            }
          />
          {memoCollapsed && (
            <div className={styles.collapsedNotice} role="status">
              <Icon name="panel-right-close" size={15} />
              <span>{t("작업 영역이 좁아 메모를 접었습니다")}</span>
              <Button
                size="md"
                icon="panel-bottom"
                onClick={() =>
                  dispatch({ type: "setPanels", panels: { memoDock: "below" } })
                }
              >
                {t("다시 열기")}
              </Button>
            </div>
          )}
          {doc.status === "conflict" && (
            <InlineNotice
              icon="triangle-alert"
              action={
                <>
                  <Button onClick={() => void doc.session.keepMine()}>
                    {t("내 변경 유지")}
                  </Button>
                  <Button onClick={() => void doc.session.takeTheirs()}>
                    {t("최신 버전 불러오기")}
                  </Button>
                </>
              }
            >
              {t(
                "다른 곳에서 같은 문단을 먼저 고쳤어요. 어느 쪽을 남길지 골라 주세요.",
              )}
            </InlineNotice>
          )}
          <div className={styles.body}>
            <div className={styles.canvasScroll}>
              <div
                className={styles.column}
                style={editorVars}
                data-kind={docType}
              >
                <div className={styles.titleRow}>
                  <input
                    className={styles.title}
                    value={draft.title}
                    readOnly={locked}
                    placeholder={t("제목 없음")}
                    aria-label={t("제목")}
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
                    label={
                      favorite ? t("즐겨찾기에서 제거") : t("즐겨찾기에 추가")
                    }
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
                  body={draft.body}
                  version={doc.contentVersion}
                  editable={!locked}
                  onChange={(body) => doc.session.update({ body })}
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
            fileTitle={draft.title || t("제목 없음")}
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
      <VersionHistoryModal
        open={versionsOpen}
        fileId={fileId}
        title={draft.title || t("제목 없음")}
        current={{ ...draft, docType }}
        locked={locked}
        unsaved={doc.status === "error" || doc.status === "conflict"}
        index={index}
        onClose={() => setVersionsOpen(false)}
        beforeSave={() => doc.session.save()}
        currentRevision={() => doc.session.revisionNo}
        onRestored={(next) => {
          doc.session.replace(next);
          queryClient.setQueryData(queryKeys.document(fileId), next);
          void invalidateProjectContent(queryClient, projectId);
          toast({
            icon: "rotate-ccw",
            title: t("선택한 버전으로 복원했어요."),
            description: t("복원 직전 상태도 버전 기록에 남겨 두었어요."),
          });
        }}
      />
    </div>
  );
}
