"use client";

import { useRef } from "react";

import { cx } from "@/shared/cx";

import { Icon } from "../icons/icon";
import styles from "./info-hint.module.css";
import { Tooltip } from "./tooltip";

/**
 * 기능 이름 옆에 서는 작은 info 아이콘. 포인터를 올리면 그 기능이 무엇을 하는지 몇 줄로 설명한다.
 *
 * <p>단추 안에 들어가므로 저 스스로는 눌리지 않는다 — 누르면 감싼 단추가 눌리지 않게 삼키고,
 * 보조 기술에는 숨긴다(기능 설명은 눈으로 훑는 사람을 위한 것이고, 단추의 이름은 그대로다).
 */
export function InfoHint({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className={cx(styles.hint, className)}
      aria-hidden="true"
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation();
      }}
    >
      <Icon name="info" size={13} />
      <Tooltip anchorRef={ref} label={text} multiline />
    </span>
  );
}
