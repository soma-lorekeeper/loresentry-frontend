"use client";

import { useMemo, useRef } from "react";

import { Button, Icon, useToast } from "@/design-system/primitives";
import {
  DOCUMENT_TYPE_META,
  DOCUMENT_TYPES,
  type DocumentType,
} from "@/domain/document-types";
import type { DocumentNode } from "@/domain/models";
import { useServices } from "@/services/services-context";
import { relativeTime } from "@/shared/format";

import { categoryFolderOf, documentsOf } from "../model/tree";
import { useCreateFile, useFileTree } from "../queries";
import { useWorkspace } from "../workspace-context";
import styles from "./new-tab.module.css";

const IMPORT_ACCEPT = ".txt,.md,.markdown,text/plain,text/markdown";

export function NewTabView() {
  const { project, projectId, open } = useWorkspace();
  const services = useServices();
  const toast = useToast();
  const tree = useFileTree(projectId);
  const create = useCreateFile(projectId);
  const fileInput = useRef<HTMLInputElement>(null);
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
        title: `제목 없는 ${DOCUMENT_TYPE_META[type].label}`,
      },
      { onSuccess: (node) => open({ kind: "file", fileId: node.id }) },
    );
  };

  const importFile = async (file: File) => {
    const parent = categoryFolderOf(nodes, "manuscript");
    if (!parent) return;
    const text = await file.text();
    const title =
      file.name.replace(/\.(txt|md|markdown)$/i, "") || "가져온 원고";
    const node = await create.mutateAsync({
      parentId: parent.id,
      kind: "document",
      docType: "manuscript",
      title,
    });
    const doc = await services.documents.get(node.id);
    await services.documents.save(node.id, {
      draft: { title: doc.title, bodyMd: text, properties: doc.properties },
      ifMatchRevision: doc.revisionNo,
      saveId: crypto.randomUUID(),
    });
    toast({ icon: "upload", title: "원고를 가져왔어요.", description: title });
    open({ kind: "file", fileId: node.id });
  };

  return (
    <div className={styles.view}>
      <p className={styles.context}>{project.title}</p>

      <section className={styles.banner} aria-label="이어서 작업하기">
        <div className={styles.bannerCopy}>
          {last ? (
            <>
              <span className={styles.eyebrow}>마지막으로 작업한 파일</span>
              <span className={styles.bannerTitle}>{last.title}</span>
              <span className={styles.bannerMeta}>
                {relativeTime(last.updatedAt)} · 마지막 편집 위치에서 열기
              </span>
            </>
          ) : (
            <>
              <span className={styles.eyebrow}>
                아직 작업한 파일이 없습니다
              </span>
              <span className={styles.bannerTitle}>
                첫 파일을 만들어 시작하세요
              </span>
              <span className={styles.bannerMeta}>
                원고나 설정 파일을 만들면 마지막 작업 위치가 여기에 표시됩니다.
              </span>
            </>
          )}
        </div>
        {last ? (
          <Button
            size="lg"
            variant="primary"
            trailingIcon="arrow-right"
            iconSize={15}
            onClick={() => open({ kind: "file", fileId: last.id })}
          >
            이어서 작업하기
          </Button>
        ) : (
          <Button
            size="lg"
            variant="primary"
            trailingIcon="plus"
            iconSize={15}
            onClick={() => createDocument("manuscript")}
          >
            원고 만들기
          </Button>
        )}
      </section>

      <section className={styles.section} aria-labelledby="new-tab-create">
        <div className={styles.sectionHeader}>
          <h2 id="new-tab-create" className={styles.sectionTitle}>
            새로 만들기
          </h2>
          <button
            type="button"
            className={styles.import}
            onClick={() => fileInput.current?.click()}
          >
            <Icon name="upload" size={14} />
            가져오기
          </button>
          <input
            ref={fileInput}
            type="file"
            accept={IMPORT_ACCEPT}
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (file) void importFile(file);
            }}
          />
        </div>
        <div className={styles.createGrid}>
          {DOCUMENT_TYPES.map((type) => (
            <button
              key={type}
              type="button"
              className={styles.create}
              disabled={create.isPending}
              onClick={() => createDocument(type)}
            >
              <span className={styles.createIcon}>
                <Icon name={DOCUMENT_TYPE_META[type].createIcon} size={15} />
              </span>
              {DOCUMENT_TYPE_META[type].label}
            </button>
          ))}
        </div>
      </section>

      <section className={styles.section} aria-labelledby="new-tab-recent">
        <h2 id="new-tab-recent" className={styles.sectionTitle}>
          최근에 연 파일
        </h2>
        <div className={styles.recent}>
          {others.length === 0 ? (
            <div className={styles.emptyRecent}>
              <Icon name="clock-3" size={16} />
              <strong>최근에 연 파일이 없습니다</strong>
              <span>파일을 열면 최근 순서대로 여기에 표시됩니다.</span>
            </div>
          ) : (
            others.map((doc) => (
              <button
                key={doc.id}
                type="button"
                className={styles.recentRow}
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
