import { QueryClient } from "@tanstack/react-query";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { readLocaleCookie } from "@/i18n/preference";
import { getDb } from "@/services/mock/db";
import { queryKeys } from "@/services/query-keys";
import { renderWithServices } from "@/test/render";

import { AccountSettingsDialog } from "./account-settings-dialog";

const user = {
  id: "user-1",
  displayName: "Yunju Seo",
  email: "yunju@lore.kr",
  onboardingCompleted: true,
  locale: "en" as const,
};

afterEach(() => {
  vi.restoreAllMocks();
  document.cookie = "ls_locale=; Path=/; Max-Age=0";
});

function open() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  queryClient.setQueryData(queryKeys.session, user);
  renderWithServices(
    <AccountSettingsDialog
      open
      user={user}
      onClose={() => {}}
      onDeleteAccount={() => {}}
    />,
    { queryClient, before: () => void (getDb().signedIn = true) },
  );
  return screen.getByRole("dialog", { name: "Account settings" });
}

describe("AccountSettingsDialog (English build)", () => {
  it("shows its fields in English", () => {
    const dialog = open();

    expect(within(dialog).getByRole("textbox", { name: "Name" })).toHaveValue(
      "Yunju Seo",
    );
    expect(
      within(dialog).getByRole("textbox", { name: /Email/ }),
    ).toBeVisible();
    expect(
      within(dialog).getByRole("button", { name: "Delete account" }),
    ).toBeVisible();
    const language = within(dialog).getByRole("radiogroup", {
      name: "Language",
    });
    expect(
      within(language).getByRole("radio", { name: "English" }),
    ).toBeChecked();
    expect(
      within(language).getByRole("radio", { name: "한국어" }),
    ).toHaveAttribute("lang", "ko");
    expect(dialog.textContent!.replace("한국어", "")).not.toMatch(/[가-힣]/);
  });

  it("switches to Korean right away and records it on the account", async () => {
    const reload = vi.fn();
    vi.spyOn(window, "location", "get").mockReturnValue({
      ...window.location,
      pathname: "/projects/",
      search: "",
      hash: "",
      reload,
      assign: vi.fn(),
    } as Location);
    const actor = userEvent.setup();
    const dialog = open();

    await actor.click(within(dialog).getByRole("radio", { name: "한국어" }));

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(readLocaleCookie()).toBe("ko");
    expect(getDb().user.locale).toBe("ko");
    expect(within(dialog).getByRole("radio", { name: "한국어" })).toBeChecked();
  });
});
