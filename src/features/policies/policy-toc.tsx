"use client";

import { useEffect, useState } from "react";

import { t } from "@/i18n";
import { cx } from "@/shared/cx";

import styles from "./policy.module.css";

/** 지금 읽고 있는 조항을 밝힌다. 화면 위쪽 30% 안에 처음 들어온 제목이 기준이다. */
export function PolicyToc({
  headings,
}: {
  headings: { id: string; text: string }[];
}) {
  const [active, setActive] = useState(headings[0]?.id ?? null);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "0px 0px -70% 0px" },
    );
    for (const { id } of headings) {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [headings]);

  return (
    <nav className={styles.toc} aria-label={t("목차")}>
      <ol>
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              className={cx(
                styles.tocLink,
                active === heading.id && styles.tocActive,
              )}
              aria-current={active === heading.id ? "location" : undefined}
              onClick={() => setActive(heading.id)}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
