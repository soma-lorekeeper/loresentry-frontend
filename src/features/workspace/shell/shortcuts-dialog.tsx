"use client";

import { Button, DialogCard } from "@/design-system/primitives";
import { t } from "@/i18n";

import { SHORTCUTS, formatChord, isMac } from "./shortcuts";
import styles from "./shortcuts-dialog.module.css";

/**
 * 작업공간 단축키 목록. 도움말 메뉴에서 연다.
 *
 * 목록은 단축키 표(shortcuts.ts)를 그대로 읽어 그린다. 키를 듣는 쪽과 같은 표라서
 * 여기 적힌 키가 실제로 듣는 키와 어긋나지 않는다.
 */
export function ShortcutsDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // 이 기기의 자판에 맞는 표기로 적는다(Mac 은 ⌘, 그 밖은 Ctrl).
  const mac = isMac();
  return (
    <DialogCard
      open={open}
      onClose={onClose}
      title={t("키보드 단축키")}
      actions={
        <Button size="md" variant="primary" onClick={onClose}>
          {t("확인")}
        </Button>
      }
    >
      <dl className={styles.list}>
        {SHORTCUTS.map((shortcut) => (
          <div key={shortcut.id} className={styles.row}>
            <dt>{shortcut.label}</dt>
            <dd>
              <kbd className={styles.keys}>
                {formatChord(shortcut.chords[0], mac)}
              </kbd>
            </dd>
          </div>
        ))}
      </dl>
      <p className={styles.note}>
        {t(
          "굵게·기울임·되돌리기 같은 편집 단축키는 에디터에서 그대로 쓸 수 있어요.",
        )}
      </p>
    </DialogCard>
  );
}
