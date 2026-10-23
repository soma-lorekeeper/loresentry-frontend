import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it } from "vitest";

import { readLocaleSync, setLocaleSync } from "@/i18n/preference";
import { getDb } from "@/services/mock/db";
import { setMockRule } from "@/services/mock/control";
import { renderWithServices } from "@/test/render";

import { LocaleSyncNotice } from "./locale-sync-notice";

afterEach(() => setLocaleSync(null));

describe("LocaleSyncNotice", () => {
  it("retains a failed account update and lets the same user retry without changing the device language", async () => {
    const actor = userEvent.setup();
    const user = { ...getDb().user };
    setLocaleSync({ userId: user.id, locale: "en" });
    renderWithServices(<LocaleSyncNotice user={user} />, {
      before: () => setMockRule("account.updateLocale", "once"),
    });
    await actor.click(
      await screen.findByRole("button", { name: "계정 언어 다시 저장" }),
    );
    await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
    expect(readLocaleSync(user.id)?.locale).toBe("en");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "이 기기의 언어는 변경했지만 계정에 저장하지 못했어요.",
    );
    await actor.click(screen.getByRole("button"));
    await waitFor(() =>
      expect(screen.queryByRole("alert")).not.toBeInTheDocument(),
    );
    expect(getDb().user.locale).toBe("en");
    expect(readLocaleSync(user.id)).toBeNull();
  });

  it("does not offer to apply another user's language to this account", () => {
    setLocaleSync({ userId: "other-user", locale: "en" });
    renderWithServices(<LocaleSyncNotice user={getDb().user} />);
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });
});
