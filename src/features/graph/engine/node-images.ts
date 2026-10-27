/**
 * 관계도 노드에 그릴 문서 이미지.
 *
 * 캔버스는 `<img>` 처럼 스스로 다시 그리지 않는다. 다 불러온 이미지만 그리고, 새로 하나가 도착할 때마다
 * `version` 을 올려 그리는 함수의 identity 를 바꾼다 — force-graph 는 그것을 보고 리드로를 예약한다.
 *
 * `crossOrigin` 을 두지 않는다. 미디어 CDN 은 GET 에 CORS 헤더를 주지 않아서, 두면 이미지가 아예
 * 불러와지지 않는다. 두지 않으면 캔버스가 "오염"되어 픽셀을 읽을 수 없게 되지만 이 화면은 읽지 않는다.
 * 포인터 판정은 force-graph 의 그림자 캔버스가 하고, 그쪽에는 이미지를 그리지 않는다.
 */

import { useEffect, useState } from "react";

type Entry = HTMLImageElement | "loading" | "failed";

/** 주소 하나에 요소 하나. 탭을 오가거나 다시 그려도 같은 이미지를 다시 받지 않는다 */
const cache = new Map<string, Entry>();
const listeners = new Set<() => void>();

function load(url: string) {
  if (cache.has(url)) return;
  cache.set(url, "loading");
  const image = new Image();
  image.decoding = "async";
  image.onload = () => {
    cache.set(url, image);
    listeners.forEach((listener) => listener());
  };
  // 실패한 주소는 다시 시도하지 않는다. 그 노드는 분류 아이콘으로 남는다.
  image.onerror = () => cache.set(url, "failed");
  image.src = url;
}

/** 다 불러온 이미지. 아직이거나 실패했으면 null 이고, 그동안 노드는 분류 아이콘을 그린다 */
export function loadedNodeImage(url: string | null | undefined) {
  if (!url) return null;
  const entry = cache.get(url);
  return entry instanceof HTMLImageElement ? entry : null;
}

/**
 * 노드들의 이미지를 불러오고, 하나가 도착할 때마다 바뀌는 값을 돌려준다.
 * 그리는 함수의 의존성에 넣는다.
 */
export function useNodeImages(
  nodes: ReadonlyArray<{ imageUrl?: string | null }>,
) {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    let frame = 0;
    // 한 프레임에 여럿이 도착해도 다시 그리기는 한 번이다.
    const listener = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setVersion((value) => value + 1);
      });
    };
    listeners.add(listener);
    for (const node of nodes) if (node.imageUrl) load(node.imageUrl);
    return () => {
      listeners.delete(listener);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [nodes]);
  return version;
}
