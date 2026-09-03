import type { ReactNode, SVGProps } from "react";

export type WorkspaceIconName =
  | "arrow-up"
  | "book"
  | "calendar-days"
  | "character"
  | "check"
  | "circle-alert"
  | "circle-help"
  | "cloud-off"
  | "chevron"
  | "chevron-left"
  | "chevron-right"
  | "close"
  | "download"
  | "ellipsis"
  | "event"
  | "external-link"
  | "file"
  | "folder"
  | "graph"
  | "grip"
  | "help"
  | "history"
  | "home"
  | "item"
  | "lock"
  | "loader-circle"
  | "list-ordered"
  | "message-square"
  | "memo"
  | "notebook-pen"
  | "organization"
  | "panel-bottom"
  | "panel-right"
  | "plus"
  | "pencil"
  | "place"
  | "search"
  | "settings"
  | "setting-file"
  | "sidebar"
  | "sparkles"
  | "trash"
  | "type"
  | "worldbuilding";

const paths: Record<WorkspaceIconName, ReactNode> = {
  "arrow-up": <path d="m5 12 7-7 7 7M12 5v14" />,
  book: (
    <>
      <path d="M4 4.5A2.5 2.5 0 0 1 6.5 2H11v15H6.5A2.5 2.5 0 0 0 4 19.5Z" />
      <path d="M20 4.5A2.5 2.5 0 0 0 17.5 2H13v15h4.5a2.5 2.5 0 0 1 2.5 2.5Z" />
    </>
  ),
  "calendar-days": (
    <>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M8 3v4M16 3v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01" />
    </>
  ),
  character: (
    <>
      <circle cx="12" cy="8" r="3" />
      <path d="M6.5 20a5.5 5.5 0 0 1 11 0" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  "circle-alert": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v6M12 17h.01" />
    </>
  ),
  "circle-help": (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2 1-1.2 1.8M12 17h.01" />
    </>
  ),
  "cloud-off": (
    <>
      <path d="m3 3 18 18" />
      <path d="M7.6 7.6A5.5 5.5 0 0 1 18 10a4 4 0 0 1 1.6 7.7M6 18a4 4 0 0 1-1.9-7.5" />
    </>
  ),
  chevron: <path d="m8 10 4 4 4-4" />,
  "chevron-left": <path d="m15 18-6-6 6-6" />,
  "chevron-right": <path d="m9 18 6-6-6-6" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  download: (
    <>
      <path d="M12 3v12M7 10l5 5 5-5M5 21h14" />
    </>
  ),
  ellipsis: (
    <>
      <circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
      <circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  event: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="1" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  "external-link": (
    <>
      <path d="M14 4h6v6M13 11l7-7" />
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
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
  grip: <path d="M9 5h.01M15 5h.01M9 12h.01M15 12h.01M9 19h.01M15 19h.01" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.8 9a2.4 2.4 0 1 1 3.4 2.2c-.9.4-1.2 1-1.2 1.8M12 17h.01" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  home: (
    <>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v11h14V10M10 21v-6h4v6" />
    </>
  ),
  item: (
    <>
      <path d="m12 3 7 5-7 13L5 8Z" />
      <path d="M5 8h14M9 8l3 13 3-13" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="10" width="14" height="11" rx="1" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  "loader-circle": (
    <>
      <path d="M21 12a9 9 0 1 1-5.3-8.2" />
      <path d="M16 3h5v5" />
    </>
  ),
  "list-ordered": (
    <>
      <path d="M10 6h11M10 12h11M10 18h11" />
      <path d="M4 6h1V3M4 11h2l-2 3h2M4 17h2v4H4" />
    </>
  ),
  "message-square": (
    <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />
  ),
  memo: (
    <>
      <path d="M5 3h14v18H5Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  "notebook-pen": (
    <>
      <path d="M5 3h14v18H5Z" />
      <path d="M9 3v18M12 8h4M12 12h4M12 16h2" />
    </>
  ),
  organization: (
    <>
      <circle cx="9" cy="8" r="3" />
      <circle cx="17" cy="9" r="2" />
      <path d="M3.5 20a5.5 5.5 0 0 1 11 0M14 15.5a4 4 0 0 1 6.5 3.1" />
    </>
  ),
  "panel-bottom": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M3 14h18" />
    </>
  ),
  "panel-right": (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M14 4v16" />
    </>
  ),
  plus: <path d="M12 5v14M5 12h14" />,
  pencil: (
    <>
      <path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z" />
      <path d="m14 7 3 3" />
    </>
  ),
  place: (
    <>
      <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.5" />
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
  "setting-file": (
    <>
      <path d="M5 3h14v18H5Z" />
      <path d="M9 3v18M12 8h4M12 12h4M12 16h2" />
    </>
  ),
  sidebar: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="1" />
      <path d="M9 4v16" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 1.2 3.8L17 8l-3.8 1.2L12 13l-1.2-3.8L7 8l3.8-1.2Z" />
      <path d="m18 14 .7 2.3L21 17l-2.3.7L18 20l-.7-2.3L15 17l2.3-.7Z" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16M9 7V4h6v3M7 7l1 14h8l1-14" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  type: <path d="M5 6V4h14v2M12 4v16M8 20h8" />,
  worldbuilding: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
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
