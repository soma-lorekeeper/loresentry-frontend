"use client";

import { useMemo, useState } from "react";

import { Icon, Segmented } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import type { Memo, MemoScope } from "@/domain/models";
import { indexNodes, isDocument } from "@/features/workspace/model/tree";
import { useFileTree } from "@/features/workspace/queries";
import { useWorkspace } from "@/features/workspace/workspace-context";
import { t } from "@/i18n";

import { MemoList } from "./memo-list";
import styles from "./memo-view.module.css";

const SCOPES = [
  { value: "file" as const, label: t("문서 메모") },
  { value: "project" as const, label: t("작품 메모") },
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

  const fileOf = (memo: Memo) =>
    memo.fileId ? index.get(memo.fileId) : undefined;

  /**
   * 문서 메모 카드의 머리. 어느 문서의 메모인지 아이콘과 이름으로 보여 준다.
   *
   * <p>이 머리가 그 문서로 가는 단추다. 여러 문서의 메모가 한 목록에 섞여 있어, 메모에서 그 문서로
   * 바로 갈 수 있어야 한다. 전에는 카드의 더보기 메뉴에 "파일로 이동" 이 따로 있었는데, 이름을
   * 누르면 그 문서가 열리는 쪽이 찾기 쉽다. 문서를 찾을 수 없으면 갈 곳이 없으니 글자로만 둔다.
   */
  const fileContext = (memo: Memo) => {
    const file = fileOf(memo);
    const label = (
      <>
        <Icon
          name={
            isDocument(file)
              ? DOCUMENT_TYPE_META[file.docType].entityIcon
              : "file"
          }
          size={15}
        />
        <span className={styles.fileTitle}>
          {file?.title ?? t("찾을 수 없는 문서")}
        </span>
      </>
    );
    return (
      <div
        className={styles.fileHead}
        data-kind={isDocument(file) ? file.docType : undefined}
      >
        {file ? (
          <button
            type="button"
            className={styles.fileLink}
            // 이름은 문서 이름 그대로 읽히고, 누르면 무슨 일이 생기는지는 설명으로 붙는다.
            title={t("파일로 이동")}
            onClick={() => open({ kind: "file", fileId: file.id })}
          >
            {label}
          </button>
        ) : (
          <span className={styles.fileLink}>{label}</span>
        )}
      </div>
    );
  };

  return (
    <div className={styles.view}>
      <header className={styles.header}>
        <h1 className={styles.title}>{t("작업공간::메모")}</h1>
        <Segmented
          label={t("작업공간::메모 범위")}
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
          addLabel={t("메모 추가")}
          emptyTitle={t("문서 메모가 없어요")}
          emptyDescription={t(
            "문서를 열어 메모 패널에서 적으면 여기에 모여요.",
          )}
          context={fileContext}
        />
      ) : (
        <MemoList
          projectId={projectId}
          scope="project"
          addLabel={t("메모 추가")}
          emptyTitle={t("작품 메모가 없어요")}
          emptyDescription={t("작품 전체에 걸친 생각을 적어 두세요.")}
        />
      )}
    </div>
  );
}
