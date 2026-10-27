"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from "react";

import { Button, DialogCard, IconButton } from "@/design-system/primitives";
import { t } from "@/i18n";

import styles from "./image-crop-dialog.module.css";
import {
  clampCrop,
  initialCrop,
  MAX_ZOOM,
  MIN_ZOOM,
  renderCrop,
  scaleOf,
  zoomAround,
  type CropState,
} from "./image-crop";

/** 자르기 창의 한 변(px). 휴대폰 폭(320px)의 대화상자 안에도 들어간다 */
const VIEW = 264;
/** 방향키 한 번에 옮기는 거리. Shift 를 누르면 네 배다 */
const NUDGE = 8;
const ZOOM_STEP = 0.25;
/** 미리보기 크기. 문서 제목 옆 원과, 관계도에서 흔히 보이는 노드 크기다 */
const previews = () => [
  { size: 44, label: t("이미지::제목 옆") },
  { size: 20, label: t("이미지::관계도") },
];

/**
 * 고른 이미지에서 원 안에 들어갈 부분을 맞춘다. 끌어서 옮기고, 휠·단추·막대로 키운다.
 * 키보드만으로도 맞출 수 있다(방향키로 옮기고 +·- 로 확대).
 *
 * 저장하면 512px 정사각형으로 줄인 Blob 을 넘긴다. 원 모양 자르기는 그리는 쪽이 한다 — 저장 파일은
 * 정사각형이라 나중에 다른 모양으로 보여도 된다.
 */
export function ImageCropDialog({
  file,
  onCancel,
  onConfirm,
  onUnreadable,
}: {
  /** 고른 파일. null 이면 닫혀 있다 */
  file: File | null;
  onCancel: () => void;
  onConfirm: (image: Blob, preview: string) => void;
  /** 이미지로 읽을 수 없는 파일이다(손상, 지원하지 않는 형식) */
  onUnreadable: () => void;
}) {
  const [source, setSource] = useState<{
    url: string;
    image: HTMLImageElement;
  } | null>(null);
  const [crop, setCrop] = useState<CropState | null>(null);
  const [saving, setSaving] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; crop: CropState } | null>(null);
  const hintId = useId();

  // 파일이 바뀌면 다시 읽는다. 읽는 동안에는 창을 열지 않아 빈 창이 깜빡이지 않는다.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    const image = new Image();
    let cancelled = false;
    image.onload = () => {
      if (cancelled) return;
      setSource({ url, image });
      setCrop(initialCrop(sizeOf(image), VIEW));
    };
    image.onerror = () => {
      if (!cancelled) onUnreadable();
    };
    image.src = url;
    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
      setSource(null);
      setCrop(null);
      setSaving(false);
    };
    // onUnreadable 이 바뀌었다고 파일을 다시 읽지 않는다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file]);

  // React 의 onWheel 은 passive 라 페이지 스크롤을 막지 못한다. 창 위의 휠은 확대에만 쓴다.
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage || !source) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = stage.getBoundingClientRect();
      const anchor = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      setCrop((current) =>
        current
          ? zoomAround(
              sizeOf(source.image),
              VIEW,
              current,
              current.zoom * Math.exp(-event.deltaY / 400),
              anchor,
            )
          : current,
      );
    };
    stage.addEventListener("wheel", onWheel, { passive: false });
    return () => stage.removeEventListener("wheel", onWheel);
  }, [source]);

  const open = Boolean(file && source && crop);
  const image = source ? sizeOf(source.image) : null;

  const update = (next: CropState) => {
    if (image) setCrop(clampCrop(image, VIEW, next));
  };
  const zoomTo = (zoom: number) => {
    if (image && crop) setCrop(zoomAround(image, VIEW, crop, zoom));
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!crop || event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, crop };
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current;
    if (!start) return;
    update({
      zoom: start.crop.zoom,
      x: start.crop.x + event.clientX - start.x,
      y: start.crop.y + event.clientY - start.y,
    });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!crop) return;
    const step = event.shiftKey ? NUDGE * 4 : NUDGE;
    const moves: Record<string, [number, number]> = {
      ArrowLeft: [step, 0],
      ArrowRight: [-step, 0],
      ArrowUp: [0, step],
      ArrowDown: [0, -step],
    };
    const move = moves[event.key];
    if (move) {
      event.preventDefault();
      // 방향키는 "보이는 영역"을 옮긴다. 왼쪽을 누르면 이미지의 더 왼쪽이 보이도록 이미지가 오른쪽으로 간다.
      update({ zoom: crop.zoom, x: crop.x + move[0], y: crop.y + move[1] });
    } else if (event.key === "+" || event.key === "=") {
      event.preventDefault();
      zoomTo(crop.zoom + ZOOM_STEP);
    } else if (event.key === "-") {
      event.preventDefault();
      zoomTo(crop.zoom - ZOOM_STEP);
    }
  };

  const confirm = async () => {
    if (!source || !crop) return;
    setSaving(true);
    try {
      const blob = await renderCrop(
        source.image,
        sizeOf(source.image),
        VIEW,
        crop,
      );
      onConfirm(blob, URL.createObjectURL(blob));
    } catch {
      onUnreadable();
    } finally {
      setSaving(false);
    }
  };

  return (
    <DialogCard
      open={open}
      onClose={onCancel}
      title={t("이미지 위치 맞추기")}
      closeLabel={t("닫기")}
      closeDisabled={saving}
      actions={
        <>
          <Button size="md" onClick={onCancel} disabled={saving}>
            {t("취소")}
          </Button>
          <Button size="md" variant="primary" busy={saving} onClick={confirm}>
            {t("저장")}
          </Button>
        </>
      }
    >
      {source && crop && image && (
        <div className={styles.body}>
          <div className={styles.editor}>
            <div
              ref={stageRef}
              className={styles.stage}
              style={{ width: VIEW, height: VIEW }}
              tabIndex={0}
              role="group"
              aria-label={t("이미지 위치")}
              aria-describedby={hintId}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
              onKeyDown={onKeyDown}
            >
              <Placed url={source.url} image={image} crop={crop} scale={1} />
              <span className={styles.mask} aria-hidden />
            </div>
            <p id={hintId} className={styles.hint}>
              {t("끌어서 옮기고, 휠이나 막대로 키워요.")}
            </p>
            <div className={styles.zoom}>
              <IconButton
                icon="zoom-out"
                label={t("축소")}
                disabled={crop.zoom <= MIN_ZOOM}
                onClick={() => zoomTo(crop.zoom - ZOOM_STEP)}
              />
              <input
                type="range"
                className={styles.slider}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={0.01}
                value={crop.zoom}
                aria-label={t("확대")}
                onChange={(event) => zoomTo(Number(event.target.value))}
              />
              <IconButton
                icon="zoom-in"
                label={t("확대")}
                disabled={crop.zoom >= MAX_ZOOM}
                onClick={() => zoomTo(crop.zoom + ZOOM_STEP)}
              />
            </div>
          </div>
          <div className={styles.previews} aria-hidden>
            {previews().map((preview) => (
              <div key={preview.size} className={styles.preview}>
                <span
                  className={styles.previewCircle}
                  style={{ width: preview.size, height: preview.size }}
                >
                  <Placed
                    url={source.url}
                    image={image}
                    crop={crop}
                    scale={preview.size / VIEW}
                  />
                </span>
                <span className={styles.previewLabel}>{preview.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </DialogCard>
  );
}

/** 자리를 맞춘 이미지. 미리보기는 같은 그림을 `scale` 만큼 줄여 그린다 */
function Placed({
  url,
  image,
  crop,
  scale,
}: {
  url: string;
  image: { width: number; height: number };
  crop: CropState;
  scale: number;
}) {
  const imageScale = scaleOf(image, VIEW, crop.zoom) * scale;
  return (
    // eslint-disable-next-line @next/next/no-img-element -- 브라우저 안의 object URL 이다
    <img
      src={url}
      alt=""
      draggable={false}
      className={styles.placed}
      style={{
        width: image.width,
        height: image.height,
        transform: `translate(${crop.x * scale}px, ${crop.y * scale}px) scale(${imageScale})`,
      }}
    />
  );
}

function sizeOf(image: HTMLImageElement) {
  return { width: image.naturalWidth, height: image.naturalHeight };
}
