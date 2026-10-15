const BUBBLE =
  "M20 15.5a2.5 2.5 0 0 1-2.5 2.5H8.5L4 21.5V6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5Z";

export function AiMark({
  solid = false,
  size = 16,
  className,
}: {
  solid?: boolean;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={solid ? "none" : "currentColor"}
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {solid ? (
        <>
          <path d={BUBBLE} fill="currentColor" />
          <path
            d="M13.4 3h4.2v8.1l-2.1-1.6-2.1 1.6Z"
            fill="var(--mark-cut, var(--lk-color-accent-primary))"
          />
        </>
      ) : (
        <>
          <path d={BUBBLE} />
          <path d="M13.5 4v6.75l2-1.5 2 1.5V4" />
        </>
      )}
    </svg>
  );
}
