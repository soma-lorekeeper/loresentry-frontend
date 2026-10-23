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
import { ReauthNotice } from "@/features/auth/reauth-notice";
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
import {
  formatOf,
  useDeviceFormat,
  type DocumentFormat,
} from "./document-format";
import { createDocumentExtensions } from "./editor/extensions";
import {
  replaceDocument,
  setDocumentFormat,
} from "./editor/formatted-document";
import { documentJSON } from "./editor/text-align";
import { FileHeader } from "./file-header";
import { PrintSheet, printRows } from "./print-sheet";
import { PropertyTable } from "./property-table";
import type { SaveStatus } from "./document-session";
import { useDocumentSession } from "./use-document-session";
import { bodyOf, type DocumentBody } from "@/domain/document-body";

const MIN_EDITOR_WIDTH = 640;
/**
 * 직접 시킨 저장에서 "저장 중…" 이 머무는 가장 짧은 시간(ms). 저장이 이보다 빨리 끝나도(또는 저장할
 * 것이 없어도) 이만큼은 보인다 — 눈에 띄기 전에 지나가면 눌렀는지 알 수 없다.
 */
const SAVE_ECHO_MS = 600;

/**
 * 저장을 직접 시켰을 때(단축키) 저장 상태 표시가 그것을 보여 주게 한다.
 *
 * <p>단축키로 시킨 저장은 화면에 잘 보이지 않는다 — 손을 멈추고 0.8초면 자동 저장이 끝나 있어
 * 대부분 할 일이 없고, 할 일이 있어도 순식간에 끝난다. 눌렀는데 화면이 그대로면 저장됐는지 알 수
 * 없다. 그래서 누르면 곧바로 "저장 중…" 을 띄우고, 읽힐 만큼({@link SAVE_ECHO_MS}) 머문 뒤
 * 실제 상태("저장됨")로 돌아간다. "저장 대기 중" 은 거치지 않는다 — 기다리는 것이 아니라 지금
 * 저장하라고 시킨 것이다.
 *
 * <p><b>화면만 그렇다.</b> 실제 저장은 누르는 즉시 나가고, 표시가 머무는 동안 기다리지 않는다.
 *
 * <p>문제가 생겼으면(저장 실패, 겹친 수정, 잠김) 보여 주던 것을 그만두고 실제 상태를 보인다.
 *
 * @param status 실제 저장 상태
 * @returns `shown` 은 화면에 보일 상태, `play` 는 "저장 중…" 을 지금부터 보여 주는 함수
 */
function useSaveEcho(status: SaveStatus) {
  const [echoing, setEchoing] = useState(false);
  const timer = useRef<number | null>(null);

  const stop = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => stop, []);

  const play = () => {
    // 보여 주는 중에 또 누르면 그때부터 다시 센다.
    stop();
    setEchoing(true);
    timer.current = window.setTimeout(() => setEchoing(false), SAVE_ECHO_MS);
  };

  // 평소의 세 상태일 때만 덮어 보인다. 그 밖의 상태는 작가가 지금 알아야 하는 것이다.
  const routine =
    status === "saved" || status === "dirty" || status === "saving";
  return { shown: echoing && routine ? ("saving" as const) : status, play };
}

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
    replaceDocument(editor, body.doc);
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
        // 누가 시킨 저장인지(`acknowledge`)를 그대로 넘긴다.
        save: (options) => latest.current.save(options),
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
  const deviceFormat = useDeviceFormat();
  const doc = useDocumentSession(fileId);
  const format = formatOf(doc.draft?.body.doc, deviceFormat);
  // 웹 글꼴은 처음 고를 때 받는다. 오기 전에는 기기의 비슷한 글꼴로 그린다(editor-fonts.ts).
  const fontStack = useEditorFontStack(format.font);
  // 단축키로 저장을 시키면 도구 막대의 저장 상태가 곧바로 "저장 중…" 을 보여 준다.
  const saveEcho = useSaveEcho(doc.status);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [lockPending, setLockPending] = useState(false);
  const [versionsOpen, setVersionsOpen] = useState(false);
  // 찾기 막대. 도구 막대의 단추와 단축키(문서에서 찾기)가 함께 여닫는다.
  const [findOpen, setFindOpen] = useState(false);
  // 인쇄 중일 때만 본문 HTML 이 들어 있다. 그동안에만 인쇄 지면을 그린다(print-sheet.tsx).
  const [printing, setPrinting] = useState<string | null>(null);
  // 내보내기가 진행 중인가. 저장과 글꼴을 기다리는 동안에는 `printing` 이 아직 비어 있어,
  // 그것만 보면 그 사이에 한 번 더 불렸을 때(단축키를 누르고 있을 때) 인쇄 창이 두 번 뜬다.
  const exporting = useRef(false);
  const [exportPending, setExportPending] = useState(false);
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
    const expired =
      isServiceError(doc.query.error) && doc.query.error.requiresLogin;
    return (
      <div className={styles.state}>
        <EmptyState
          role="alert"
          icon={missing ? "file-x" : "cloud-off"}
          title={
            expired
              ? t("다시 로그인해 주세요")
              : missing
                ? t("문서를 찾을 수 없어요")
                : t("문서를 불러오지 못했어요")
          }
          description={
            expired ? (
              <ReauthNotice fileId={fileId} />
            ) : missing ? (
              t("휴지통으로 옮겨졌거나 삭제된 문서예요.")
            ) : (
              t("잠시 후 다시 시도해 주세요.")
            )
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
  // 글꼴·크기·줄 간격은 문서마다 본문에 담긴다. 정렬은 문단마다 담겨 여기 없다.
  const editorVars = {
    "--editor-font": fontStack,
    "--editor-size": `${format.fontSize}pt`,
    "--editor-line-height": String(format.lineHeight),
  } as CSSProperties;
  const changeFormat = (patch: Partial<DocumentFormat>) => {
    if (editor && !locked) setDocumentFormat(editor, { ...format, ...patch });
  };

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
    // 이미 내보내는 중이면(준비 중이거나 대화상자가 떠 있으면) 다시 시작하지 않는다.
    if (exporting.current || !editor) return;
    exporting.current = true;
    setExportPending(true);
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
      exporting.current = false;
      setExportPending(false);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  const exportAs = async (format: ExportFormat) => {
    if (format === "pdf") {
      try {
        await exportPdf();
      } catch {
        exporting.current = false;
        setExportPending(false);
        toast({
          icon: "triangle-alert",
          title: t("내보내지 못했어요."),
          description: t("잠시 후 다시 시도해 주세요."),
        });
      }
      return;
    }
    if (exporting.current) return;
    exporting.current = true;
    setExportPending(true);
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
    } finally {
      exporting.current = false;
      setExportPending(false);
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
          save: async (options) => {
            // 보여 주는 것은 여기서 시작하고, 저장은 기다리지 않고 바로 보낸다.
            if (options?.acknowledge) saveEcho.play();
            if (
              options?.acknowledge &&
              doc.session.getSnapshot().status === "expired"
            )
              await doc.session.retry();
            else await doc.session.save();
            // 저장은 실패해도 조용히 끝난다(상태로만 알린다). 서버에 닿지 못한 글이 남았는지를
            // 돌려줘야, 탭을 옮기는 쪽이 그 글을 잃지 않게 멈출 수 있다.
            return !doc.session.hasUnsavedChanges;
          },
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
            format={format}
            onFormat={changeFormat}
            status={saveEcho.shown}
            locked={locked}
            onRetry={() => void doc.session.retry()}
            findOpen={findOpen}
            onFindOpenChange={setFindOpen}
            actions={
              <FileHeader
                memoOpen={panels.memoOpen}
                locked={locked}
                lockPending={lockPending}
                exportPending={exportPending}
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
          {doc.status === "expired" && <ReauthNotice fileId={fileId} unsaved />}
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
                data-file-id={fileId}
                data-file-title={draft.title}
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
                    disabled={setFavorite.isPending}
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
                  movePending={move.isPending}
                  onChange={(properties) => doc.session.update({ properties })}
                  onChangeType={changeType}
                  onMoveToEpisode={(episodeId) =>
                    !move.isPending &&
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
        {/*
          패널 닫기와 공간 부족 접힘 모두 편집 상태를 보존한다. 메모를 버리는 동작은 편집기의 취소다.
        */}
        <MemoPanel
          open={panels.memoOpen}
          hidden={memoCollapsed}
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
      </div>
      <VersionHistoryModal
        open={versionsOpen}
        fileId={fileId}
        title={draft.title || t("제목 없음")}
        current={{ ...draft, docType }}
        locked={locked}
        unsaved={
          doc.status === "error" ||
          doc.status === "conflict" ||
          doc.status === "expired"
        }
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
