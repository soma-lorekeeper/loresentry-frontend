"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";

import {
  Button,
  DialogBullets,
  DialogCard,
  Icon,
  IconButton,
  InlineNotice,
  useToast,
} from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { t } from "@/i18n";
import { isServiceError } from "@/services/errors";
import { invalidateProjectContent } from "@/services/query-keys";
import { useServices } from "@/services/services-context";

import { categoryFolderOf } from "./model/tree";
import { useFileTree } from "./queries";
import {
  IMPORT_ACCEPT,
  importFormatOf,
  importTitleOf,
  useImportDocument,
  type ImportFormat,
} from "./use-import-document";
import { useWorkspace } from "./workspace-context";
import styles from "./import-dialog.module.css";

/** 올려 둔 파일 하나. 아직 서버에는 아무것도 없다(가져오기를 눌러야 만들어진다) */
interface Staged {
  /** 목록에서 이 줄을 가리키는 값. 같은 파일을 두 번 담지 않는 데에도 쓴다 */
  key: string;
  file: File;
  /** 만들어질 원고의 제목 */
  title: string;
  format: ImportFormat;
  /** 가져오다 실패해 목록에 남은 줄인가 */
  failed?: boolean;
  failure?: string;
  /** 실패하기 전에 이미 만들어 둔 원고. 다시 시도할 때는 글만 담는다 */
  nodeId?: string;
}

/** 파일 크기를 읽기 쉬운 단위로. 어느 파일인지 가늠하는 데 쓰므로 어림값이면 된다 */
function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}

/** 끌고 있는 것이 OS 의 파일인가. 탭이나 사이드바 줄 같은 화면 안의 끌기는 아니다 */
function carriesFiles(event: DragEvent) {
  return Array.from(event.dataTransfer?.types ?? []).includes("Files");
}

/**
 * 원고 가져오기. 파일을 **올려 두고 → 목록으로 확인하고 → 가져오기로 확정**한다.
 *
 * <p><b>확정 전에는 아무것도 만들지 않는다.</b> 올린 파일은 이 창의 목록에만 있다. 취소하거나
 * 닫으면 그대로 버려지고 서버에는 요청이 가지 않는다. `가져오기` 를 눌러야 원고 폴더에 원고가
 * 하나씩 만들어진다.
 *
 * <p><b>일부만 실패하면</b> 된 것은 목록에서 빠지고 안 된 줄만 남는다. 다시 누르면 남은 줄만
 * 다시 한다. 이미 만들어진 원고는 되돌리지 않는다 — 닫을 때 그중 첫 원고를 연다.
 *
 * <p>열려 있는 동안에만 그린다(부르는 쪽이 `{importing && <ImportDialog />}`). 닫을 때마다 목록이
 * 비워져야 하기 때문이다.
 */
export function ImportDialog({ onClose }: { onClose: () => void }) {
  const { projectId, open } = useWorkspace();
  const tree = useFileTree(projectId);
  const queryClient = useQueryClient();
  const services = useServices();
  const toast = useToast();
  const importer = useImportDocument(projectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const pickRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const [staged, setStaged] = useState<Staged[]>([]);
  /** 방금 올린 것 가운데 받지 않은 파일들의 이름(형식이 다른 것) */
  const [refused, setRefused] = useState<string[]>([]);
  /** 가져오는 중이면 몇 번째 파일까지 끝냈는가. 아니면 null */
  const [progress, setProgress] = useState<number | null>(null);
  /** 이 창이 열려 있는 동안 만들어진 원고들. 닫을 때 알리고 첫 원고를 연다 */
  const [made, setMade] = useState<Array<{ id: string; title: string }>>([]);
  /** OS 의 파일을 끌어 이 화면 위에 올려 둔 상태인가 */
  const [dragging, setDragging] = useState(false);

  const busy = progress !== null;
  // 가져온 원고가 들어갈 곳. 파일 트리가 아직 오지 않았으면 가져올 수 없다.
  const parent = categoryFolderOf(tree.data ?? [], "manuscript");
  const failed = staged.filter((item) => item.failed).length;
  // 가져오는 중에는 놓아도 받지 않는다. 받는 것처럼 보이지도 않게 한다.
  const receiving = dragging && !busy;

  /** 고르거나 끌어 놓은 파일을 목록에 더한다 */
  const add = (files: readonly File[]) => {
    const known = new Set(staged.map((item) => item.key));
    const next: Staged[] = [];
    const unsupported: string[] = [];
    for (const file of files) {
      const format = importFormatOf(file.name);
      if (!format) {
        unsupported.push(file.name);
        continue;
      }
      // 같은 파일을 다시 올린 것은 한 번만 담는다. 이름만 같은 다른 파일은 따로 담긴다.
      const key = `${file.name}:${file.size}:${file.lastModified}`;
      if (known.has(key)) continue;
      known.add(key);
      next.push({ key, file, title: importTitleOf(file.name), format });
    }
    setStaged([...staged, ...next]);
    setRefused(unsupported);
  };

  /**
   * 만들다 만 원고를 휴지통으로 보낸다.
   *
   * 글을 담다가 실패한 파일은 제목만 있는 빈 원고를 남긴다(다시 시도하면 거기에 글을 담는다).
   * 그 줄을 빼거나 그대로 닫으면 "가져오지 못했다" 던 원고가 빈 채로 원고 폴더에 남으므로 치운다.
   * 지우지 않고 휴지통으로 보낸다 — 되돌릴 수 있는 쪽이 안전하다. 이것마저 실패하면(연결이 끊긴
   * 채라면) 더 할 수 있는 일이 없어 조용히 둔다.
   */
  const discard = (items: readonly Staged[]) => {
    const ids = items.flatMap((item) => (item.nodeId ? [item.nodeId] : []));
    if (ids.length === 0) return;
    void Promise.allSettled(
      ids.map((id) => services.files.moveToTrash(id)),
    ).then(() => invalidateProjectContent(queryClient, projectId));
  };

  /**
   * 창을 닫는다. 이번에 만든 원고가 있으면 알리고 첫 원고를 연다.
   *
   * @param created 만들어진 원고들
   * @param abandoned 목록에 남긴 채 닫는 줄들. 만들다 만 원고가 있으면 치운다
   */
  const finish = (created = made, abandoned: readonly Staged[] = staged) => {
    discard(abandoned);
    if (created.length > 0) {
      toast({
        icon: "upload",
        title:
          created.length === 1
            ? t("원고를 가져왔어요.")
            : t("원고 {count}개를 가져왔어요.", { count: created.length }),
        // 하나면 어느 원고인지 적는다. 여러 개면 수가 곧 내용이라 덧붙이지 않는다.
        description: created.length === 1 ? created[0].title : undefined,
      });
      open({ kind: "file", fileId: created[0].id });
    }
    onClose();
  };

  /** 목록의 파일을 차례로 원고로 만든다 */
  const run = async () => {
    if (!parent || busy) return;
    setRefused([]);
    const created = [...made];
    const left: Staged[] = [];
    for (const [index, item] of staged.entries()) {
      setProgress(index);
      let nodeId = item.nodeId;
      try {
        nodeId ??= await importer.create(item.file, parent.id);
        await importer.fill(nodeId, item.file);
        created.push({ id: nodeId, title: item.title });
      } catch (error) {
        // 만들기까지 됐으면 그 id 를 남겨 둔다. 다시 시도할 때 원고가 하나 더 생기지 않는다.
        left.push({
          ...item,
          failed: true,
          nodeId,
          failure:
            isServiceError(error) && error.code === "duplicate"
              ? t(
                  "같은 위치에 같은 제목의 원고가 있어요. 파일 이름을 바꾼 뒤 이 항목을 빼고 다시 선택해 주세요.",
                )
              : t("가져오지 못했어요. 다시 시도해 주세요."),
        });
      }
    }
    // 새 원고가 파일 트리·그래프·검색에 보이게 한다. 파일마다가 아니라 한 번만 한다.
    await invalidateProjectContent(queryClient, projectId);
    setProgress(null);
    setMade(created);
    // 다 됐으면 남긴 줄이 없다. 방금 글을 담은 원고를 "만들다 만 것" 으로 치우면 안 된다.
    if (left.length === 0) finish(created, []);
    else setStaged(left);
  };

  /*
   * 줄을 빼면 그 줄의 단추가 사라진다. 포커스를 그대로 두면 대화상자의 맨 위로 튕겨, 키보드로
   * 여러 줄을 이어서 뺄 수 없다. 그 자리로 올라온 줄(마지막 줄을 뺐으면 그 앞줄)의 빼기 단추로
   * 옮기고, 목록이 비었으면 파일을 고르는 단추로 보낸다.
   */
  const removedAt = useRef<number | null>(null);
  useEffect(() => {
    const index = removedAt.current;
    if (index === null) return;
    removedAt.current = null;
    const buttons =
      listRef.current?.querySelectorAll<HTMLButtonElement>("button") ?? [];
    (buttons[Math.min(index, buttons.length - 1)] ?? pickRef.current)?.focus();
  }, [staged]);

  /*
   * 끌어다 놓기는 창(window)에서 듣는다. 이 대화상자가 떠 있는 동안에는 뒤의 화면을 쓸 수 없으니,
   * 파일을 어디에 놓든 이 목록에 담는 것이 맞다. 빗나간 드롭을 브라우저가 "그 파일 열기" 로 받아
   * 화면을 떠나 버리는 일도 여기서 막는다.
   */
  const dropRef = useRef<(files: File[]) => void>(() => {});
  useEffect(() => {
    dropRef.current = (files) => {
      setDragging(false);
      if (!busy) add(files);
    };
  });
  useEffect(() => {
    const onEnter = (event: DragEvent) => {
      if (carriesFiles(event)) setDragging(true);
    };
    const onOver = (event: DragEvent) => {
      // 기본 동작을 막아야 놓을 수 있는 자리가 된다.
      if (carriesFiles(event)) event.preventDefault();
    };
    const onDrop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      dropRef.current(Array.from(event.dataTransfer?.files ?? []));
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("drop", onDrop);
    };
  }, []);

  return (
    <DialogCard
      open
      onClose={() => finish()}
      size="md"
      title={t("원고 가져오기")}
      // 이 창의 안내는 문장이 아니라 명사형으로 짧게 적는다("끌어다 놓기"). 무엇을 하라는 설명이
      // 아니라 자리마다 붙은 이름표에 가깝다. 일어난 일을 알리는 글(알림·오류)만 해요체다.
      description={t("텍스트(.txt)·마크다운(.md) 파일 지원")}
      // 머리에 닫기(X) 단추를 두지 않는다. 그만두는 길은 아래의 `취소` 하나다(Esc 와 바깥 누르기도
      // 같은 일을 한다).
      dismissible={!busy}
      footerHint={
        // 담긴 수와 진행을 읽어 주는 자리. 처음부터 있어야 글자가 바뀔 때 읽힌다(비어 있다가
        // 생긴 자리는 읽어 주는 도구가 놓친다).
        <span role="status">
          {staged.length === 0
            ? ""
            : progress !== null
              ? t("{total}개 중 {done}번째를 가져오는 중", {
                  done: progress + 1,
                  total: staged.length,
                })
              : t("파일 {count}개", { count: staged.length })}
        </span>
      }
      actions={
        <>
          <Button
            size="md"
            icon="x"
            disabled={busy}
            data-tour="import-cancel"
            onClick={() => finish()}
          >
            {/* 이미 만들어진 원고가 있으면 "취소" 는 거짓말이다. 그것들은 남는다. */}
            {made.length > 0 ? t("닫기") : t("취소")}
          </Button>
          <Button
            size="md"
            variant="primary"
            icon="upload"
            busy={busy}
            disabled={staged.length === 0 || !parent}
            onClick={run}
          >
            {failed > 0 ? t("다시 시도") : t("가져오기")}
          </Button>
        </>
      }
    >
      {/*
        끄는 동안 화면 전체를 덮는 보이지 않는 막. 끌기의 사건을 이 막 하나가 받게 해서, 막을
        떠났다는 것이 곧 창을 벗어났다는 뜻이 되게 한다 — 자식 요소 사이를 넘을 때마다 오는
        dragleave 와 구별할 필요가 없어진다(Safari 는 어디로 갔는지를 알려 주지 않는다).
      */}
      {dragging && (
        <div
          className={styles.catcher}
          onDragLeave={() => setDragging(false)}
        />
      )}
      <div className={styles.body}>
        {/* 올리는 자리와 올린 목록은 한 판에 있다. 투어가 이 판을 가리킨다. */}
        <div
          className={styles.tray}
          data-tour="import-dialog"
          data-dragging={receiving || undefined}
        >
          <div className={styles.picker}>
            <Button
              ref={pickRef}
              size="md"
              // 확정하는 `가져오기` 와 같은 아이콘을 쓰면 어느 쪽이 "올리는" 단추인지 헷갈린다.
              icon="file-plus"
              disabled={busy}
              onClick={() => inputRef.current?.click()}
            >
              {t("파일 선택")}
            </Button>
            <span className={styles.pickerHint}>
              {receiving ? t("여기에 놓기") : t("또는 끌어다 놓기")}
            </span>
            <input
              ref={inputRef}
              type="file"
              multiple
              accept={IMPORT_ACCEPT}
              hidden
              onChange={(event) => {
                add(Array.from(event.target.files ?? []));
                // 같은 파일을 다시 골라도 change 가 나도록 값을 비운다.
                event.target.value = "";
              }}
            />
          </div>
          {/*
            목록 자리는 비어 있든 차 있든 같은 높이다. 줄 수에 따라 창의 높이가 달라지면 창이 다시
            가운데로 가면서 단추들이 움직인다 — 줄을 하나 빼면 다음 줄의 빼기 단추가 커서 밑에서
            달아난다.
          */}
          {staged.length === 0 ? (
            <p className={styles.empty}>
              <span>{t("올린 파일 없음")}</span>
              <span>{t("‘가져오기’를 눌러야 원고로 생성")}</span>
            </p>
          ) : (
            <ul
              ref={listRef}
              className={styles.list}
              aria-label={t("가져올 파일")}
            >
              {staged.map((item, index) => (
                // 만들어질 것(원고)의 아이콘과 색으로 그린다.
                <li
                  key={item.key}
                  className={styles.row}
                  data-kind="manuscript"
                >
                  <Icon
                    name={DOCUMENT_TYPE_META.manuscript.entityIcon}
                    size={16}
                    className={styles.icon}
                  />
                  <span className={styles.copy}>
                    <span className={styles.title}>{item.title}</span>
                    {item.failed ? (
                      <span className={styles.failure}>
                        <Icon name="triangle-alert" size={13} />
                        {item.failure ?? t("가져오지 못했어요")}
                      </span>
                    ) : (
                      <span className={styles.meta}>
                        {item.format === "markdown"
                          ? t("마크다운")
                          : t("텍스트")}
                        {" · "}
                        {sizeLabel(item.file.size)}
                      </span>
                    )}
                  </span>
                  <IconButton
                    icon="x"
                    iconSize={15}
                    label={t("{title} 빼기", { title: item.title })}
                    disabled={busy}
                    onClick={() => {
                      discard([item]);
                      removedAt.current = index;
                      setStaged(staged.filter((other) => other !== item));
                    }}
                  />
                </li>
              ))}
            </ul>
          )}
        </div>
        {failed > 0 ? (
          <InlineNotice>
            {/* 된 줄은 목록에서 빠진다. 말해 주지 않으면 사라진 파일이 들어갔는지 알 수 없다. */}
            {made.length > 0
              ? t(
                  "{done}개는 가져왔어요. {count}개는 가져오지 못했으니 다시 시도하거나 목록에서 빼 주세요.",
                  { done: made.length, count: failed },
                )
              : t(
                  "{count}개를 가져오지 못했어요. 다시 시도하거나 목록에서 빼 주세요.",
                  { count: failed },
                )}
          </InlineNotice>
        ) : (
          refused.length > 0 && (
            <InlineNotice icon="info">
              {/* 하나면 어느 파일인지 적는다. 받는 형식은 위의 설명에 있으니 짧게만 되짚는다. */}
              {refused.length === 1
                ? t(
                    "‘{name}’ 파일은 담지 않았어요. .txt와 .md 파일만 담을 수 있어요.",
                    { name: refused[0] },
                  )
                : t(
                    "{count}개는 담지 않았어요. .txt와 .md 파일만 담을 수 있어요.",
                    { count: refused.length },
                  )}
            </InlineNotice>
          )
        )}
        <DialogBullets
          items={[
            { icon: "folder", text: t("원고 폴더에 새 원고로 생성") },
            { icon: "file-text", text: t("파일 이름이 원고 제목") },
          ]}
        />
      </div>
    </DialogCard>
  );
}
