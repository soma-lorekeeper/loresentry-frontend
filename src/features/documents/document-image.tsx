"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type DragEvent } from "react";

import { Icon, Menu, useToast } from "@/design-system/primitives";
import { DOCUMENT_TYPE_META, type DocumentType } from "@/domain/document-types";
import { t } from "@/i18n";
import { invalidateProjectContent } from "@/services/query-keys";
import { useServices } from "@/services/services-context";
import { cx } from "@/shared/cx";

import styles from "./document-image.module.css";
import { ImageCropDialog } from "./image-crop-dialog";

/** 서버가 받는 형식. GIF 는 받지만 첫 장면만 남는다(자르기가 캔버스에 그려 다시 저장한다) */
const ACCEPTED = ["image/png", "image/jpeg", "image/webp", "image/gif"];
/**
 * 고를 수 있는 원본 크기. 저장하는 것은 512px 로 줄인 것이라 서버 한도(10MB)와 상관없다. 이 한도는
 * 브라우저가 너무 큰 그림을 풀다가 멈추지 않게 하는 것이다.
 */
const MAX_SOURCE_BYTES = 20 * 1024 * 1024;

/**
 * 문서 제목 왼쪽의 대표 이미지 자리. 이미지가 없어도 같은 크기의 원을 둔다 — 넣었을 때 제목이 밀리지
 * 않고, 무엇을 넣는 자리인지 늘 보인다.
 *
 * 비어 있으면 누르는 즉시 파일을 고르고, 이미지가 있으면 바꾸기·지우기 메뉴를 연다. 이미지 파일을
 * 끌어다 놓아도 된다. 고른 뒤에는 원 안에 들어갈 부분을 맞추는 창이 열린다.
 *
 * 잠긴 문서에서는 보기만 한다.
 */
export function DocumentImageSlot({
  projectId,
  fileId,
  title,
  docType,
  imageUrl,
  readOnly,
}: {
  projectId: string;
  fileId: string;
  title: string;
  docType: DocumentType;
  imageUrl: string | null;
  readOnly: boolean;
}) {
  const services = useServices();
  const queryClient = useQueryClient();
  const toast = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [picked, setPicked] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  /** 올리는 동안 보여 줄, 방금 자른 이미지. 서버 주소가 오면 비운다 */
  const [pending, setPending] = useState<string | null>(null);
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  useEffect(
    () => () => {
      if (pending) URL.revokeObjectURL(pending);
    },
    [pending],
  );

  const failed = () =>
    toast({
      icon: "circle-alert",
      title: t("이미지를 바꾸지 못했어요. 다시 시도해 주세요."),
    });

  const upload = useMutation({
    mutationFn: (image: Blob) => services.files.setImage(fileId, image),
    onSuccess: () => invalidateProjectContent(queryClient, projectId),
    onError: failed,
    onSettled: () => setPending(null),
  });
  const remove = useMutation({
    mutationFn: () => services.files.clearImage(fileId),
    onSuccess: () => invalidateProjectContent(queryClient, projectId),
    onError: failed,
  });
  const busy = upload.isPending || remove.isPending;

  const choose = (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPTED.includes(file.type)) {
      toast({
        icon: "circle-alert",
        title: t("PNG·JPG·WEBP·GIF 이미지만 올릴 수 있어요."),
      });
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      toast({
        icon: "circle-alert",
        title: t("20MB 이하의 이미지만 올릴 수 있어요."),
      });
      return;
    }
    setPicked(file);
  };

  const shown =
    pending ?? (imageUrl && failedUrl !== imageUrl ? imageUrl : null);
  const label = imageUrl
    ? t("‘{title}’ 이미지 바꾸기", { title })
    : t("‘{title}’에 이미지 넣기", { title });

  const face = shown ? (
    // eslint-disable-next-line @next/next/no-img-element -- 정적 export 라 next/image 최적화를 쓰지 않는다
    <img
      src={shown}
      alt=""
      className={styles.image}
      onError={() => imageUrl && setFailedUrl(imageUrl)}
    />
  ) : (
    <Icon name={DOCUMENT_TYPE_META[docType].entityIcon} size={18} />
  );

  if (readOnly) {
    return (
      <span
        className={cx(styles.slot, shown && styles.filled)}
        data-kind={docType}
        aria-hidden
      >
        {face}
      </span>
    );
  }

  const acceptsDrop = (event: DragEvent) =>
    Array.from(event.dataTransfer.items).some(
      (item) => item.kind === "file" && item.type.startsWith("image/"),
    );

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        className={cx(
          styles.slot,
          styles.interactive,
          shown && styles.filled,
          dragging && styles.dragging,
        )}
        data-kind={docType}
        aria-label={label}
        aria-haspopup={imageUrl ? "menu" : undefined}
        aria-expanded={imageUrl ? menuOpen : undefined}
        aria-busy={busy || undefined}
        disabled={busy}
        onClick={() =>
          imageUrl ? setMenuOpen(true) : inputRef.current?.click()
        }
        onDragOver={(event) => {
          if (!acceptsDrop(event)) return;
          event.preventDefault();
          event.dataTransfer.dropEffect = "copy";
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(event) => {
          if (!acceptsDrop(event)) return;
          event.preventDefault();
          setDragging(false);
          choose(event.dataTransfer.files[0]);
        }}
      >
        {face}
        <span className={styles.overlay} aria-hidden>
          <Icon
            name={busy ? "loader-circle" : "image-plus"}
            size={18}
            className={cx(busy && styles.spin)}
          />
        </span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED.join(",")}
        className={styles.input}
        tabIndex={-1}
        aria-hidden
        onChange={(event) => {
          choose(event.target.files?.[0]);
          // 같은 파일을 다시 골라도 change 가 나도록 비운다.
          event.target.value = "";
        }}
      />
      <Menu
        anchorRef={buttonRef}
        open={menuOpen}
        onOpenChange={setMenuOpen}
        label={t("대표 이미지")}
        placement="bottom-start"
        width={200}
        entries={[
          {
            id: "replace",
            label: t("이미지 바꾸기"),
            icon: "image-plus",
            onSelect: () => inputRef.current?.click(),
          },
          {
            id: "remove",
            label: t("이미지 지우기"),
            icon: "trash-2",
            destructive: true,
            onSelect: () => remove.mutate(),
          },
        ]}
      />
      <ImageCropDialog
        file={picked}
        onCancel={() => setPicked(null)}
        onUnreadable={() => {
          setPicked(null);
          toast({
            icon: "circle-alert",
            title: t("이미지를 열지 못했어요. 다른 파일을 골라 주세요."),
          });
        }}
        onConfirm={(image, preview) => {
          setPicked(null);
          setPending(preview);
          upload.mutate(image);
        }}
      />
    </>
  );
}
