import { describe, expect, it } from "vitest";

import { sortTrashedProjects } from "./project-trash-model";

describe("sortTrashedProjects", () => {
  it("sorts by most recently trashed and then by Korean title", () => {
    expect(
      sortTrashedProjects([
        { id: "c", title: "하늘", trashedAt: "2026-09-01", trashedAtLabel: "" },
        { id: "b", title: "바다", trashedAt: "2026-09-02", trashedAtLabel: "" },
        { id: "a", title: "가을", trashedAt: "2026-09-02", trashedAtLabel: "" },
      ]).map(({ id }) => id),
    ).toEqual(["a", "b", "c"]);
  });
});
