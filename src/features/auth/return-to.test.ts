import { afterEach, expect, it } from "vitest";

import {
  clearOAuthReturnTo,
  readOAuthReturnTo,
  rememberOAuthReturnTo,
  safeReturnTo,
} from "./return-to";

afterEach(() => window.sessionStorage.clear());

it.each([
  "/workspace?projectId=qa&open=file:one",
  "/ko/workspace/?projectId=qa&open=file:one",
  "/en/workspace/?projectId=qa",
  "/ko/projects/guide/",
  "/en/projects/",
])("preserves a supported internal return path: %s", (path) => {
  expect(safeReturnTo(path)).toBe(path);
});

it.each([
  "https://example.com",
  "//example.com",
  "/admin/settings",
  "/fr/workspace/",
  "/ko/../admin",
  "/\\example.com/workspace",
  "/ko/workspace/../../../admin",
  "/en/projects-evil",
])("rejects an unsupported return path: %s", (path) => {
  expect(safeReturnTo(path)).toBeNull();
});

it("keeps a validated OAuth intent across the callback and clears it after use", () => {
  const path = "/ko/workspace/?projectId=qa&open=file:one";
  rememberOAuthReturnTo(path);
  window.history.replaceState({}, "", "/ko/login/?result=success");
  expect(readOAuthReturnTo()).toBe(path);
  clearOAuthReturnTo();
  expect(readOAuthReturnTo()).toBeNull();
  rememberOAuthReturnTo(path);
  rememberOAuthReturnTo("//example.com");
  expect(readOAuthReturnTo()).toBeNull();
  window.history.replaceState({}, "", "/");
});
