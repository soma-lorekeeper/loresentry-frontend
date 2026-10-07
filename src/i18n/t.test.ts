import { describe, expect, it } from "vitest";

import { LOCALE } from "./locale";
import { t } from "./t";

describe("t (Korean build)", () => {
  it("returns the Korean key and fills placeholders", () => {
    expect(LOCALE).toBe("ko");
    const key = "{name} 님" as Parameters<typeof t>[0];
    expect(t(key, { name: "서윤" })).toBe("서윤 님");
  });

  it("drops the context prefix", () => {
    expect(t("메뉴::열기" as Parameters<typeof t>[0])).toBe("열기");
  });
});
