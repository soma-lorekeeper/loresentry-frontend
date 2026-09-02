"use client";

import { useTheme, type Theme } from "./theme-provider";

const themes: Array<{ value: Theme; label: string }> = [
  { value: "dark", label: "다크" },
  { value: "light", label: "라이트" },
  { value: "system", label: "시스템" },
];

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <fieldset className={className}>
      <legend>테마</legend>
      <div role="group" aria-label="화면 테마">
        {themes.map((option) => (
          <button
            type="button"
            aria-pressed={theme === option.value}
            key={option.value}
            onClick={() => setTheme(option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}
