import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DEFAULT_DOCUMENT_FORMAT, formatOf } from "./document-format";

async function readDeviceFormat() {
  vi.resetModules();
  const { useDeviceFormat } = await import("./document-format");
  return renderHook(() => useDeviceFormat()).result.current;
}

const LEGACY_KEY = "loresentry.editor-prefs";
const KEY = "loresentry.editor-prefs.v2";

beforeEach(() => window.localStorage.clear());

describe("device format", () => {
  it("starts at 10.5pt, the same size as the old 14px default", async () => {
    expect(await readDeviceFormat()).toEqual({
      font: "inter",
      fontSize: 10.5,
      lineHeight: 1.5,
    });
  });

  it.each([
    [13, 10],
    [14, 10.5],
    [16, 12],
    [20, 16],
  ])("moves a size saved as %ipx to %fpt", async (px, pt) => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ font: "mono", fontSize: px, lineHeight: 2 }),
    );

    expect(await readDeviceFormat()).toEqual({
      font: "mono",
      fontSize: pt,
      lineHeight: 2,
    });
  });

  it("reads a size saved in pt as it is", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ font: "batang", fontSize: 14, lineHeight: 1.65 }),
    );
    window.localStorage.setItem(LEGACY_KEY, JSON.stringify({ fontSize: 20 }));

    expect(await readDeviceFormat()).toEqual({
      font: "batang",
      fontSize: 14,
      lineHeight: 1.65,
    });
  });

  it("moves the old single serif choice to Nanum Myeongjo and drops the alignment", async () => {
    window.localStorage.setItem(
      LEGACY_KEY,
      JSON.stringify({ font: "myeongjo", fontSize: 14, align: "justify" }),
    );

    expect(await readDeviceFormat()).toEqual({
      font: "nanum-myeongjo",
      fontSize: 10.5,
      lineHeight: 1.5,
    });
  });

  it("falls back to the defaults for values that are no longer offered", async () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ font: "comic-sans", fontSize: 99, lineHeight: 3 }),
    );

    expect(await readDeviceFormat()).toEqual(DEFAULT_DOCUMENT_FORMAT);
  });
});

describe("formatOf", () => {
  const device = {
    font: "batang",
    fontSize: 12,
    lineHeight: 2,
  } as const;

  it("uses the document's own format", () => {
    expect(
      formatOf(
        {
          type: "doc",
          attrs: { font: "georgia", fontSize: 14, lineHeight: 1.65 },
        },
        device,
      ),
    ).toEqual({ font: "georgia", fontSize: 14, lineHeight: 1.65 });
  });

  it("shows a document without a format the way this device did before", () => {
    expect(formatOf({ type: "doc", content: [] }, device)).toEqual(device);
    expect(formatOf(undefined, device)).toEqual(device);
  });

  it("fills a missing or unknown value from the device", () => {
    expect(
      formatOf(
        { type: "doc", attrs: { font: "comic-sans", fontSize: 16 } },
        device,
      ),
    ).toEqual({ font: "batang", fontSize: 16, lineHeight: 2 });
  });
});
