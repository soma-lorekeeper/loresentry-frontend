/**
 * 대표 이미지 자르기의 계산. 화면(자르기 창)과 떼어 두어 테스트로 닫는다.
 *
 * 자르기 창은 한 변이 `view` 인 정사각형이고, 그 안의 원이 보이는 영역이다. 이미지는 창을 언제나 빈틈없이
 * 덮는다 — 빈 칸이 생기면 저장한 이미지의 가장자리가 투명하거나 검게 나온다.
 */

export interface CropState {
  /** 1 이면 이미지의 짧은 변이 창에 꼭 맞는다. 그보다 작게는 줄이지 않는다 */
  zoom: number;
  /** 창 왼쪽 위에서 본 이미지 왼쪽 위의 자리(px). 언제나 0 이하다 */
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 4;
/** 저장하는 이미지의 한 변. 관계도 노드와 제목 옆 원은 이보다 훨씬 작다 */
export const OUTPUT_SIZE = 512;

/** 짧은 변을 창에 맞추는 배율. 확대 1 이 이것이다 */
function coverScale(image: Size, view: number) {
  return view / Math.min(image.width, image.height);
}

export function scaleOf(image: Size, view: number, zoom: number) {
  return coverScale(image, view) * zoom;
}

/** 이미지가 창을 벗어나지 않게 자리를 묶는다 */
export function clampCrop(image: Size, view: number, crop: CropState) {
  const zoom = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, crop.zoom));
  const scale = scaleOf(image, view, zoom);
  const minX = view - image.width * scale;
  const minY = view - image.height * scale;
  return {
    zoom,
    x: Math.min(0, Math.max(minX, crop.x)),
    y: Math.min(0, Math.max(minY, crop.y)),
  };
}

/**
 * 처음 자리. 가로로 긴 그림은 가운데, 세로로 긴 그림은 위쪽 4분의 1 을 맞춘다 — 인물 그림은 얼굴이
 * 위쪽에 있어서, 가운데를 자르면 대개 가슴께가 원에 들어온다.
 */
export function initialCrop(image: Size, view: number): CropState {
  const scale = scaleOf(image, view, MIN_ZOOM);
  const overflowX = image.width * scale - view;
  const overflowY = image.height * scale - view;
  return clampCrop(image, view, {
    zoom: MIN_ZOOM,
    x: -overflowX / 2,
    y: image.height > image.width ? -overflowY / 4 : -overflowY / 2,
  });
}

/** 창 안의 한 점(`anchor`)이 그 자리에 머물도록 확대를 바꾼다. 휠은 커서를, 단추는 가운데를 쓴다 */
export function zoomAround(
  image: Size,
  view: number,
  crop: CropState,
  zoom: number,
  anchor: { x: number; y: number } = { x: view / 2, y: view / 2 },
) {
  const before = scaleOf(image, view, crop.zoom);
  const next = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
  const after = scaleOf(image, view, next);
  // anchor 아래의 이미지 좌표가 확대 뒤에도 anchor 아래에 있게 한다.
  const imageX = (anchor.x - crop.x) / before;
  const imageY = (anchor.y - crop.y) / before;
  return clampCrop(image, view, {
    zoom: next,
    x: anchor.x - imageX * after,
    y: anchor.y - imageY * after,
  });
}

/** 원래 이미지에서 잘라 낼 정사각형(이미지 픽셀) */
export function sourceRect(image: Size, view: number, crop: CropState) {
  const scale = scaleOf(image, view, crop.zoom);
  // 자리는 언제나 0 이하다. 부호를 뒤집는 대신 절댓값을 써서 -0 을 만들지 않는다.
  return {
    x: Math.abs(crop.x) / scale,
    y: Math.abs(crop.y) / scale,
    size: view / scale,
  };
}

/**
 * 자른 정사각형을 저장할 크기로 그려 Blob 으로 만든다.
 *
 * webp 를 먼저 시도한다. 인코딩하지 못하는 브라우저는 요청한 형식을 무시하고 png 를 돌려주므로, 그때는
 * jpeg 로 다시 만든다(png 는 사진에서 몇 배 크다). jpeg 에는 투명이 없어 바탕을 흰색으로 깐다.
 */
export async function renderCrop(
  image: CanvasImageSource,
  imageSize: Size,
  view: number,
  crop: CropState,
): Promise<Blob> {
  const source = sourceRect(imageSize, view, crop);
  const size = Math.round(Math.min(OUTPUT_SIZE, source.size));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("canvas 2d context is not available");

  const draw = (background?: string) => {
    context.clearRect(0, 0, size, size);
    if (background) {
      context.fillStyle = background;
      context.fillRect(0, 0, size, size);
    }
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      source.x,
      source.y,
      source.size,
      source.size,
      0,
      0,
      size,
      size,
    );
  };

  draw();
  const webp = await toBlob(canvas, "image/webp", 0.86);
  if (webp?.type === "image/webp") return webp;

  draw("#ffffff");
  const jpeg = await toBlob(canvas, "image/jpeg", 0.88);
  if (!jpeg) throw new Error("could not encode the cropped image");
  return jpeg;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, type, quality),
  );
}
