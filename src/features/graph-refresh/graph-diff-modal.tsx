"use client";

import { Modal } from "@/design-system/primitives";
import type { RefreshRun } from "@/domain/models";

export function GraphDiffModal({
  run,
  open,
  onClose,
}: {
  run: RefreshRun;
  open: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open={open} onClose={onClose} label="변경 사항">
      <p style={{ padding: 24 }}>변경 {run.proposals.length}건</p>
    </Modal>
  );
}
