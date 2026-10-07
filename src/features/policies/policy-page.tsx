import Link from "next/link";

import { LanguageSwitch } from "@/features/locale/language-switch";
import { t } from "@/i18n";

import { POLICY_DOCUMENTS, type PolicyKind } from "./documents";
import { parseMarkdown, renderInline, type Block } from "./markdown";
import styles from "./policy.module.css";
import { PolicyToc } from "./policy-toc";

const NAV: { kind: PolicyKind; href: string; label: () => string }[] = [
  { kind: "terms", href: "/policies/terms/", label: () => t("이용약관") },
  {
    kind: "privacy",
    href: "/policies/privacy/",
    label: () => t("개인정보처리방침"),
  },
];

function BlockView({ block }: { block: Block }) {
  switch (block.kind) {
    case "heading":
      return (
        <h2 id={block.id} className={styles.heading}>
          <a href={`#${block.id}`}>{block.text}</a>
        </h2>
      );
    case "paragraph":
      return <p>{renderInline(block.text)}</p>;
    case "list":
      return (
        <ul>
          {block.items.map((item, index) => (
            <li key={index}>{renderInline(item)}</li>
          ))}
        </ul>
      );
    case "table":
      return (
        <div className={styles.tableWrap}>
          <table>
            <thead>
              <tr>
                {block.header.map((cell, index) => (
                  <th key={index} scope="col">
                    {renderInline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {row.map((cell, index) =>
                    index === 0 ? (
                      <th key={index} scope="row">
                        {renderInline(cell)}
                      </th>
                    ) : (
                      <td key={index}>{renderInline(cell)}</td>
                    ),
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
  }
}

/** 서비스 이용약관·개인정보 처리방침. 원문은 빌드 때 읽어 정적 HTML 로 나간다. */
export function PolicyPage({ kind }: { kind: PolicyKind }) {
  const policy = POLICY_DOCUMENTS[kind];
  const blocks = parseMarkdown(policy.source, policy.headingId);
  const headings = blocks.flatMap((block) =>
    block.kind === "heading" ? [{ id: block.id, text: block.text }] : [],
  );

  return (
    <div className={styles.page}>
      <header className={styles.bar}>
        <Link
          href="/"
          className={styles.wordmark}
          aria-label={t("Lore Sentry 소개")}
        >
          <span className={styles.letterMark} aria-hidden="true">
            L
          </span>
          Lore Sentry
        </Link>
        <nav className={styles.switcher} aria-label={t("정책 문서")}>
          {NAV.map((item) => (
            <Link
              key={item.kind}
              href={item.href}
              className={styles.switch}
              aria-current={item.kind === kind ? "page" : undefined}
            >
              {item.label()}
            </Link>
          ))}
        </nav>
        <LanguageSwitch className={styles.language} />
      </header>

      <div className={styles.layout}>
        <PolicyToc headings={headings} />
        <main className={styles.sheet}>
          <header className={styles.head}>
            <h1 className={styles.title}>{policy.title}</h1>
            <p className={styles.meta}>
              {policy.effective ? (
                <span>{t("{date} 시행", { date: policy.effective })}</span>
              ) : (
                <span>
                  {t(
                    "게시 전 초안입니다. 최초 공개·시행일은 운영 원문 등록 시 확정합니다.",
                  )}
                </span>
              )}
              <span className={styles.version}>{policy.version}</span>
            </p>
          </header>
          <article className={styles.article}>
            {blocks.map((block, index) => (
              <BlockView key={index} block={block} />
            ))}
          </article>
        </main>
      </div>
    </div>
  );
}
