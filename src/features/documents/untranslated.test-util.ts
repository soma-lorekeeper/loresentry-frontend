import { DOCUMENT_TYPE_META } from "@/domain/document-types";
import { getDb } from "@/services/mock/db";

const HANGUL = /[가-힣]/;
const ATTRIBUTES = ["aria-label", "placeholder", "title"];

function mockStrings(extra: unknown[]) {
  const found = new Set<string>();
  const visit = (value: unknown) => {
    if (typeof value === "string") {
      for (const line of [value, ...value.split("\n")])
        if (HANGUL.test(line)) found.add(line.trim());
    } else if (Array.isArray(value)) value.forEach(visit);
    else if (value && typeof value === "object")
      Object.values(value).forEach(visit);
  };
  visit(getDb());
  visit(Object.values(DOCUMENT_TYPE_META));
  extra.forEach(visit);
  return [...found].sort((a, b) => b.length - a.length);
}

export function untranslatedText(root: HTMLElement, extraData: unknown[] = []) {
  const data = mockStrings(extraData);
  const texts: string[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  for (let node = walker.nextNode(); node; node = walker.nextNode()) {
    if (node.parentElement?.closest(".ProseMirror")) continue;
    texts.push(node.textContent ?? "");
  }
  root.querySelectorAll("*").forEach((element) => {
    for (const name of ATTRIBUTES) {
      const value = element.getAttribute(name);
      if (value) texts.push(value);
    }
  });
  return texts.filter((text) => {
    let rest = text;
    for (const value of data) rest = rest.split(value).join("");
    return HANGUL.test(rest);
  });
}
