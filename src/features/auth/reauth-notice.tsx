"use client";

import { usePathname, useSearchParams } from "next/navigation";

import { InlineNotice } from "@/design-system/primitives";
import { LOCALE, t } from "@/i18n";

import { safeReturnTo } from "./return-to";

export function ReauthNotice({
  fileId,
  unsaved = false,
}: {
  fileId: string;
  unsaved?: boolean;
}) {
  const pathname = usePathname();
  const params = new URLSearchParams(useSearchParams().toString());
  params.set("open", `file:${fileId}`);
  const returnTo = safeReturnTo(`${pathname}?${params}`) ?? "/projects";
  return (
    <InlineNotice
      icon="lock"
      action={
        <a
          href={`/${LOCALE}/login/?auth=expired&returnTo=${encodeURIComponent(returnTo)}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t("새 탭에서 로그인")}
        </a>
      }
    >
      {unsaved
        ? t(
            "로그인이 만료되어 저장하지 못했어요. 변경한 내용은 이 화면에 남아 있어요. 새 탭에서 로그인한 뒤 다시 저장해 주세요.",
          )
        : t(
            "다시 로그인이 필요해요. 새 탭에서 로그인한 뒤 문서를 다시 불러와 주세요.",
          )}
    </InlineNotice>
  );
}
