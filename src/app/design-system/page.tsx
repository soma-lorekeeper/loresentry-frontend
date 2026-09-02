import { ThemeSwitcher } from "@/design-system/theme-switcher";
import styles from "./page.module.css";

const surfaces = [
  { name: "탐색", value: "navigation" },
  { name: "상단 바", value: "topbar" },
  { name: "기본", value: "default" },
  { name: "돌출", value: "raised" },
] as const;

export default function DesignSystemPage() {
  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Lorekeeper 디자인 시스템</h1>
        <p className={styles.description}>
          같은 DOM에서 Pencil의 dark/light 토큰을 전환하는 검증 fixture입니다.
        </p>
      </header>

      <ThemeSwitcher className={styles.switcher} />

      <section className={styles.section} aria-labelledby="surface-heading">
        <h2 id="surface-heading">표면과 대비</h2>
        <div className={styles.samples}>
          {surfaces.map((surface) => (
            <article
              className={styles.sample}
              data-surface={surface.value}
              key={surface.value}
            >
              <h3>{surface.name}</h3>
              <p className={styles.secondary}>보조 텍스트 대비</p>
              <span className={styles.accent}>강조 행동</span>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
