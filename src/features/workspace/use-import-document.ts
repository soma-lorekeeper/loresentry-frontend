"use client";

import { useMemo } from "react";

import { t } from "@/i18n";
import { useServices } from "@/services/services-context";
import { bodyFromPlainText } from "@/domain/document-body";
import { markdownToBody } from "@/features/documents/editor/body-markdown";
import { useOnboardingAnalytics } from "@/features/analytics/onboarding-analytics";

/** 파일 선택 창이 보여 줄 형식. 실제로 받을지는 {@link importFormatOf} 가 이름으로 다시 본다 */
export const IMPORT_ACCEPT = ".txt,.md,.markdown,text/plain,text/markdown";

export type ImportFormat = "markdown" | "text";

/**
 * 파일 이름으로 형식을 안다. 가져올 수 없는 파일이면 `null` 이다.
 *
 * 브라우저가 알려 주는 종류(MIME)는 OS·브라우저마다 비어 있거나 달라서 믿지 않는다. 대소문자도
 * 가리지 않는다 — `.MD` 를 일반 글로 읽으면 `#` 같은 기호가 본문에 그대로 남는다.
 */
export function importFormatOf(fileName: string): ImportFormat | null {
  if (/\.(md|markdown)$/i.test(fileName)) return "markdown";
  if (/\.txt$/i.test(fileName)) return "text";
  return null;
}

/** 그 파일로 만들어질 원고의 제목. 확장자를 뗀 파일 이름이다 */
export function importTitleOf(fileName: string) {
  return (
    fileName.replace(/\.(txt|md|markdown)$/i, "").trim() || t("가져온 원고")
  );
}

// 요구사항 §4.2: 외부 파일을 원고로 가져온다. DOCX 등 지원 범위는 미확정이라 지금은 텍스트 형식만 받는다.
/**
 * 파일 하나를 원고로 가져오는 두 걸음.
 *
 * <p>서버에는 "가져오기" 가 따로 없다. 빈 원고를 만들고(`create`) 거기에 파일의 글을 담는다(`fill`).
 * 둘을 나눠 둔 것은 다시 시도할 때문이다 — 만들기는 됐는데 담기가 실패한 파일을 처음부터 다시
 * 하면 같은 제목의 원고가 하나 더 생긴다. 부르는 쪽이 만든 원고의 id 를 쥐고 있다가 담기만 다시 한다.
 *
 * <p>실패는 던진다. 여러 파일을 한꺼번에 가져오므로 알림과 목록 갱신은 부르는 쪽이 한 번만 한다
 * (import-dialog.tsx).
 */
export function useImportDocument(projectId: string) {
  const services = useServices();
  const track = useOnboardingAnalytics();

  return useMemo(
    () => ({
      /** 원고 폴더(`parentId`)에 빈 원고를 만들고 그 id 를 돌려준다. 제목은 파일 이름이다 */
      create: async (file: File, parentId: string) => {
        const node = await services.files.create({
          projectId,
          parentId,
          kind: "document",
          docType: "manuscript",
          title: importTitleOf(file.name),
        });
        return node.id;
      },
      /** 만들어 둔 원고에 파일의 글을 담는다 */
      fill: async (nodeId: string, file: File) => {
        const text = await file.text();
        const doc = await services.documents.get(nodeId);
        await services.documents.save(nodeId, {
          draft: {
            title: doc.title,
            // 마크다운은 서식을 살려 들여오고, 일반 글은 줄마다 문단이다.
            body:
              importFormatOf(file.name) === "markdown"
                ? markdownToBody(text)
                : bodyFromPlainText(text),
            properties: doc.properties,
          },
          ifMatchRevision: doc.revisionNo,
          saveId: crypto.randomUUID(),
        });
        track("manuscript_saved");
      },
    }),
    [projectId, services, track],
  );
}
