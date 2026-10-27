import type { FileNode } from "@/domain/models";

/** 작가가 새 파일을 만들었다. 가져오기·복원은 알리지 않는다 */
const listeners = new Set<(node: FileNode) => void>();

export function announceFileCreated(node: FileNode) {
  listeners.forEach((listener) => listener(node));
}

export function onFileCreated(listener: (node: FileNode) => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
