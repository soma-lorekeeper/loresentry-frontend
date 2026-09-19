import type { MenuEntry } from "../primitives/menu";
import { THEME_MODES, type ThemeMode } from "../tokens/tokens";
import type { ThemePreference } from "./theme-store";

// Pencil 테마 축에 모드가 늘면 여기 이름만 더하면 된다. 이름이 없으면 모드 값을 그대로 보여 준다.
const MODE_LABEL: Partial<Record<ThemeMode, string>> = {
  dark: "다크",
  light: "라이트",
};

export function themeMenuEntries(
  preference: ThemePreference,
  onSelect: (preference: ThemePreference) => void,
): MenuEntry[] {
  return [
    { type: "group", id: "theme", label: "화면 테마" },
    {
      id: "theme:system",
      label: "시스템 설정 따르기",
      icon: "monitor",
      checked: preference === "system",
      onSelect: () => onSelect("system"),
    },
    ...THEME_MODES.map((mode) => ({
      id: `theme:${mode}`,
      label: MODE_LABEL[mode] ?? mode,
      icon: mode === "light" ? ("sun" as const) : ("moon" as const),
      checked: preference === mode,
      onSelect: () => onSelect(mode),
    })),
  ];
}
