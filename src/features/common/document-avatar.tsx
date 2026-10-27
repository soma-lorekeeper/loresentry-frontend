"use client";

import { useState } from "react";

import { Icon } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import { cx } from "@/shared/cx";

import styles from "./document-avatar.module.css";

/**
 * 목록 줄의 문서 표식. 대표 이미지가 있으면 그것을 작은 원으로, 없으면 지금까지처럼 분류 아이콘을 그린다.
 *
 * 이미지에는 분류 색 테두리를 두른다. 아이콘이 빠진 자리에서 문서 종류를 알아보는 단서다. 색만으로
 * 종류를 말하지 않는 것은 줄에 함께 있는 분류 이름이 맡는다.
 *
 * 장식이다(`alt=""`). 문서 이름은 늘 바로 옆에 글자로 있다.
 */
export function DocumentAvatar({
  docType,
  imageUrl,
  size,
  className,
}: {
  docType: DocumentType;
  imageUrl?: string | null;
  size: number;
  className?: string;
}) {
  // 주소가 바뀌면(이미지를 바꾸면) 실패 기억도 새로 시작한다.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  if (!imageUrl || failedUrl === imageUrl) {
    return (
      <Icon
        name={DOCUMENT_TYPE_META[docType].entityIcon}
        size={size}
        className={className}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 export 라 next/image 최적화를 쓰지 않는다
    <img
      src={imageUrl}
      alt=""
      width={size}
      height={size}
      data-kind={docType}
      className={cx(styles.avatar, className)}
      onError={() => setFailedUrl(imageUrl)}
    />
  );
}
