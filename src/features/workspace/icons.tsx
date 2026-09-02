import type { ReactNode, SVGProps } from "react";

export type WorkspaceIconName =
  | "book"
  | "character"
  | "chevron"
  | "ellipsis"
  | "file"
  | "folder"
  | "graph"
  | "help"
  | "memo"
  | "search"
  | "settings"
  | "sidebar"
  | "trash";

const paths: Record<WorkspaceIconName, ReactNode> = {
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v15H6.5A2.5 2.5 0 0 0 4 19.5Z" />
      <path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v15h4.5a2.5 2.5 0 0 1 2.5 2.5Z" />
    </>
  ),
  character: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  ellipsis: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  file: (
    <>
      <path d="M6 2h8l4 4v16H6Z" />
      <path d="M14 2v5h4M9 12h6M9 16h6" />
    </>
  ),
  folder: <path d="M3 6h7l2 2h9v11H3Z" />,
  graph: (
    <>
      <circle cx="6" cy="7" r="2" />
      <circle cx="18" cy="5" r="2" />
      <circle cx="16" cy="18" r="2" />
      <path d="m8 7 8-2M7.5 8.5l7 8" />
    </>
  ),
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2 1-1.2 1.8M12 17h.01" />
    </>
  ),
  memo: (
    <>
      <path d="M5 3h14v18H5Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m16 16 5 5" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M9 4v16" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
};

export function WorkspaceIcon({
  name,
  ...props
}: { name: WorkspaceIconName } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.7"
      viewBox="0 0 24 24"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
