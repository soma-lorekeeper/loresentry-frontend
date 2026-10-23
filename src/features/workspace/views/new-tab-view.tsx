"use client";

import { useMemo } from "react";

import { Button, Icon } from "@/design-system/primitives";
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPE_SINGULAR_LABEL,
  type DocumentType,
} from "@/domain/document-types";
import type { DocumentNode } from "@/domain/models";
import { QueryFailure } from "@/features/common/query-failure";
import { t } from "@/i18n";
import { relativeTime } from "@/shared/format";

import { categoryFolderOf, documentsOf } from "../model/tree";
import { useCreateFile, useFileTree } from "../queries";
import { useWorkspace } from "../workspace-context";
import styles from "./new-tab.module.css";

export function NewTabView() {
  const { project, projectId, open, setImporting } = useWorkspace();
  const tree = useFileTree(projectId);
  const create = useCreateFile(projectId);
  const nodes = useMemo(() => tree.data ?? [], [tree.data]);

  // 서버 가정: "최근에 연 파일"은 서버가 사용자별 열람 기록으로 돌려준다. mock은 최근 수정 순으로 대신한다.
  const recent = useMemo(
    () =>
      documentsOf(nodes)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 4),
    [nodes],
  );
  const last: DocumentNode | undefined =
    recent.find((doc) => doc.id === project.lastFile?.id) ?? recent[0];
  const others = recent.filter((doc) => doc.id !== last?.id).slice(0, 3);

  const createDocument = (type: DocumentType) => {
    const parent = categoryFolderOf(nodes, type);
    if (!parent) return;
    create.mutate(
      {
        parentId: parent.id,
        kind: "document",
        docType: type,
        title: t("제목 없는 {kind}", {
          kind: DOCUMENT_TYPE_META[type].label,
          type,
        }),
      },
      { onSuccess: (node) => open({ kind: "file", fileId: node.id }) },
    );
  };

  if (tree.isError)
    return (
      <div className={styles.view}>
        <QueryFailure
          title={t("파일 목록을 불러오지 못했어요")}
          retrying={tree.isFetching}
          onRetry={() => void tree.refetch()}
        />
      </div>
    );
  if (tree.isPending)
    return (
      <div className={styles.view} role="status" aria-busy="true">
        {t("파일을 불러오는 중…")}
      </div>
    );

  return (
    <div className={styles.view}>
      <h1 className={styles.title}>{project.title}</h1>

      <section
        className={styles.banner}
        aria-label={t("작업공간::이어서 작업하기")}
      >
        <div className={styles.bannerCopy}>
          {last ? (
            <>
              <span className={styles.bannerTitle} data-kind={last.docType}>
                <Icon
                  name={DOCUMENT_TYPE_META[last.docType].entityIcon}
                  size={18}
                />
                <span className={styles.bannerName}>{last.title}</span>
              </span>
              <span className={styles.bannerMeta}>
                {relativeTime(last.updatedAt)}
              </span>
            </>
          ) : (
            <span className={styles.bannerTitle}>
              {t("첫 파일을 만들어 시작하세요")}
            </span>
          )}
        </div>
        {last ? (
          <Button
            size="lg"
            variant="primary"
            onClick={() => open({ kind: "file", fileId: last.id })}
          >
            {t("작업공간::이어서 작업하기")}
          </Button>
        ) : (
          <Button
            size="lg"
            variant="primary"
            trailingIcon="plus"
            iconSize={15}
            onClick={() => createDocument("manuscript")}
          >
            {t("원고 만들기")}
          </Button>
        )}
      </section>

      <section className={styles.section} aria-labelledby="new-tab-create">
        <div className={styles.sectionHeader}>
          <h2 id="new-tab-create" className={styles.sectionTitle}>
            {t("작업공간::새로 만들기")}
          </h2>
          <button
            type="button"
            className={styles.import}
            onClick={() => setImporting(true)}
          >
            <Icon name="upload" size={14} />
            {t("가져오기")}
          </button>
        </div>
        <div className={styles.createGrid}>
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={styles.create}
              data-kind={type}
              data-tour={`create-${type}`}
              disabled={create.isPending}
              onClick={() => createDocument(type)}
            >
              <Icon name={DOCUMENT_TYPE_META[type].entityIcon} size={16} />
              {DOCUMENT_TYPE_SINGULAR_LABEL[type]}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="new-tab-recent">
        <h2 id="new-tab-recent" className={styles.sectionTitle}>
          {t("작업공간::최근에 연 파일")}
        </h2>
        <div className={styles.recent}>
          {others.length === 0 ? (
            <div className={styles.emptyRecent}>
              <Icon name="clock-3" size={16} />
              {t("최근에 연 파일이 없어요")}
            </div>
          ) : (
            others.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={styles.recentRow}
                data-kind={doc.docType}
                onClick={() => open({ kind: "file", fileId: doc.id })}
              >
                <Icon
                  name={DOCUMENT_TYPE_META[doc.docType].entityIcon}
                  size={15}
                />
                <span className={styles.recentName}>{doc.title}</span>
                <span className={styles.recentMeta}>
                  {relativeTime(doc.updatedAt)}
                </span>
                <Icon name="arrow-up-right" size={14} />
              </button>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
