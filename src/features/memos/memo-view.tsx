"use client";

import { useMemo, useState } from "react";

import { Icon, Segmented } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { Memo, MemoScope } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";

import { MemoList } from "./memo-list";
import styles from "./memo-view.module.css";

const SCOPES = [
  { value: "file" as const, label: "문서 메모" },
  { value: "project" as const, label: "작품 메모" },
];

/**
 * 메모 전용 화면.
 *
 * <p>편집기 옆 패널과 **같은 카드**를 쓴다. 전에는 이 화면과 패널이 다르게 생겼고, 문서 메모는
 * 목록이 아니라 큰 입력창 하나였다. 같은 자료를 세 가지 모양으로 보여 줄 이유가 없다.
 *
 * <p>문서 메모는 여기서 새로 만들 수 없다 — 어느 문서에 붙일지 고를 수 없기 때문이다. 문서를 열면
 * 그 문서의 메모 패널에서 만든다.
 */
export function MemoView() {
  const { projectId, open } = useWorkspace();
  const [scope, setScope] = useState<MemoScope>("file");
  const tree = useFileTree(projectId);
  const index = useMemo(() => indexNodes(tree.data ?? []), [tree.data]);

  const fileContext = (memo: Memo) => {
    const file = memo.fileId ? index.get(memo.fileId) : undefined;
    const title = file?.title ?? "찾을 수 없는 문서";
    return (
      <div className={styles.fileHead}>
        <Icon
          name={
            isDocument(file)
              ? DOCUMENT_TYPE_META[file.docType].entityIcon
              : "file"
          }
          size={15}
        />
        {file ? (
          <button
            type="button"
            className={styles.fileLink}
            onClick={() => open({ kind: "file", fileId: file.id })}
          >
            {title}
          </button>
        ) : (
          <span className={styles.fileTitle}>{title}</span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>메모</h1>
        <Segmented
          label="메모 범위"
          options={SCOPES}
          value={scope}
          onChange={setScope}
          className={styles.scope}
        />
      </header>

      {scope === "file" ? (
        <MemoList
          projectId={projectId}
          scope="file"
          canAdd={false}
          addLabel="메모 추가"
          emptyTitle="문서 메모가 없어요"
          emptyDescription="문서를 열어 메모 패널에서 적으면 여기에 모입니다."
          context={fileContext}
        />
      ) : (
        <MemoList
          projectId={projectId}
          scope="project"
          addLabel="메모 추가"
          emptyTitle="작품 메모가 없어요"
          emptyDescription="작품 전체에 걸친 생각을 적어 두세요."
        />
      )}
    </div>
  );
}
