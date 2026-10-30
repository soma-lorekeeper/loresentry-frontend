import { focusIn } from "./anchors";
import styles from "./setting-check.module.css";

/** 문장 안의 어긋나는 표현에 밑줄을 긋는다 */
export function Marked({
  text,
  focus,
}: {
  text: string;
  focus: string | null;
}) {
  const span = focusIn(text, focus);
  if (!span) return <>{text}</>;
  return (
    <>
      {text.slice(0, span.start)}
      <span className={styles.focus}>{text.slice(span.start, span.end)}</span>
      {text.slice(span.end)}
    </>
  );
}
