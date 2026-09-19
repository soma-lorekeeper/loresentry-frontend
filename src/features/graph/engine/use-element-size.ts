import { useEffect, useRef, useState } from "react";

/**
 * force-graph 는 width/height 를 안 주면 window 크기로 잡는다. 사이드바가 있는
 * 레이아웃에서는 그러면 캔버스가 넘치므로 컨테이너를 직접 재서 넘긴다.
 */
export function useElementSize<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width: Math.round(width), height: Math.round(height) });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { ref, size };
}
