"use client";

import { useEffect, useState } from "react";

import type { Rect } from "./place-card";

const FIND_TIMEOUT_MS = 2500;

/** `data-tour` 이름으로 화면의 대상을 찾는다. 숨겨진 조상 아래 것은 없는 것으로 본다. */
export function findTarget(name: string) {
  const candidates = document.querySelectorAll<HTMLElement>(
    `[data-tour="${name}"]`,
  );
  return (
    Array.from(candidates).find(
      (node) => node.isConnected && !node.closest("[hidden]"),
    ) ?? null
  );
}

export function present(name: string) {
  return findTarget(name) !== null;
}

function visibleRect(node: HTMLElement): Rect {
  const box = node.getBoundingClientRect();
  const top = Math.max(box.top, 8);
  const bottom = Math.min(box.bottom, window.innerHeight - 8);
  return {
    left: box.left,
    top,
    width: box.width,
    height: Math.max(0, bottom - top),
  };
}

interface TargetState {
  name: string | null;
  rect: Rect | null;
  missing: boolean;
}

/**
 * 대상의 화면 자리를 따라 잰다. 대상이 아직 없으면 잠시 기다렸다가, 끝내 없으면 `missing` 으로
 * `ready` 만 올린다(코치마크가 구멍 없이 가운데 선다).
 */
export function useTargetRect(name: string | null) {
  const [state, setState] = useState<TargetState>({
    name: null,
    rect: null,
    missing: false,
  });

  useEffect(() => {
    if (!name) return;
    const target = name;
    let node: HTMLElement | null = null;
    let frame = 0;
    const started = performance.now();
    const measure = () => {
      if (!node) return;
      if (!node.isConnected || node.closest("[hidden]")) {
        observer?.disconnect();
        node = null;
        frame = window.requestAnimationFrame(look);
        return;
      }
      setState({ name: target, rect: visibleRect(node), missing: false });
    };
    const observer =
      typeof ResizeObserver === "undefined"
        ? null
        : new ResizeObserver(measure);
    function look() {
      node = findTarget(target);
      if (node) {
        node.scrollIntoView?.({ block: "nearest", inline: "nearest" });
        measure();
        observer?.observe(node);
        return;
      }
      if (performance.now() - started > FIND_TIMEOUT_MS) {
        setState({ name: target, rect: null, missing: true });
        return;
      }
      frame = window.requestAnimationFrame(look);
    }
    frame = window.requestAnimationFrame(look);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [name]);

  const current = state.name === name ? state : null;
  return {
    rect: current?.rect ?? null,
    ready: current !== null && (current.rect !== null || current.missing),
  };
}
