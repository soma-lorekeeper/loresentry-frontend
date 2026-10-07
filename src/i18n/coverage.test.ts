import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

import { EN_AREAS } from "./en";

/**
 * 화면에 나가는 한국어가 모두 사전을 지나는지 지킨다.
 *
 * 소스의 문자열·JSX 글자 가운데 한글이 든 것은 `t(...)`·`tRich(...)` 의 첫 인자여야 한다. 언어마다
 * 데이터를 따로 두는 파일(예: 날짜 표기, 목업 원고)은 맨 위에 `i18n-exempt-file:` 과 이유를 적는다.
 * `I18N_SCOPE=src/features/landing` 처럼 범위를 주면 그 아래만 본다.
 */

const ROOT = join(__dirname, "..");
const HANGUL = /[가-힣]/;
const SKIP_DIRS = new Set(["i18n", "test"]);
const TRANSLATORS = new Set(["t", "tRich"]);

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory())
      return dir === ROOT && SKIP_DIRS.has(name) ? [] : sourceFiles(path);
    return /\.tsx?$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

function isTranslatorArgument(node: ts.Node) {
  const parent = node.parent;
  return (
    ts.isCallExpression(parent) &&
    parent.arguments[0] === node &&
    ts.isIdentifier(parent.expression) &&
    TRANSLATORS.has(parent.expression.text)
  );
}

function untranslated(file: string) {
  const text = readFileSync(file, "utf8");
  if (/^\s*(\/\/|\/\*)\s*i18n-exempt-file:/m.test(text.slice(0, 400)))
    return [];
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    const literal =
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateExpression(node) ||
      ts.isJsxText(node);
    if (literal && HANGUL.test(node.getText(source))) {
      if (!isTranslatorArgument(node)) {
        const { line } = source.getLineAndCharacterOfPosition(node.getStart());
        found.push(
          `${relative(join(ROOT, ".."), file)}:${line + 1}  ${node
            .getText(source)
            .trim()
            .replace(/\s+/g, " ")
            .slice(0, 80)}`,
        );
      }
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("i18n coverage", () => {
  it("routes every Korean UI string through the dictionary", () => {
    const scope = process.env.I18N_SCOPE;
    const files = sourceFiles(ROOT).filter(
      (file) => !scope || relative(join(ROOT, ".."), file).startsWith(scope),
    );
    const missing = files.flatMap(untranslated);
    expect(missing, missing.join("\n")).toEqual([]);
  });

  it("keeps each key in exactly one area file", () => {
    const owners = new Map<string, string[]>();
    for (const [area, messages] of Object.entries(EN_AREAS)) {
      for (const key of Object.keys(messages))
        owners.set(key, [...(owners.get(key) ?? []), area]);
    }
    const duplicated = [...owners]
      .filter(([, areas]) => areas.length > 1)
      .map(([key, areas]) => `${key} → ${areas.join(", ")}`);
    expect(duplicated, duplicated.join("\n")).toEqual([]);
  });

  it("keeps placeholders identical between Korean and English", () => {
    const mismatched: string[] = [];
    for (const messages of Object.values(EN_AREAS)) {
      for (const [key, value] of Object.entries(messages)) {
        if (typeof value !== "string") continue;
        const names = (text: string) =>
          [...text.matchAll(/\{(\w+)\}/g)]
            .map((m) => m[1])
            .sort()
            .join(",");
        if (names(key) !== names(value)) mismatched.push(`${key} → ${value}`);
      }
    }
    expect(mismatched, mismatched.join("\n")).toEqual([]);
  });
});
