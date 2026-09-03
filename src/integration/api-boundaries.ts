export const UNRESOLVED_API_BOUNDARIES = [
  {
    id: "auth.start-google-oauth",
    frontendPort: "LoginRoute.startGoogleOAuth",
    source: "docs/design/login/frontend-handoff.md",
  },
  {
    id: "auth.logout",
    frontendPort: "ProjectListRoute.logout",
    source: "docs/design/project-list/frontend-handoff.md",
  },
  {
    id: "projects.list",
    frontendPort: "ProjectList.loadProjects",
    source: "docs/design/workflow/project-entry.md",
  },
  {
    id: "projects.validate-access",
    frontendPort: "ProjectListRoute.openProject",
    source: "docs/design/workflow/project-entry.md",
  },
  {
    id: "workspace.restore-layout",
    frontendPort: "WorkspaceRoute",
    source: "docs/design/workflow/project-entry.md",
  },
  {
    id: "workspace.persist-before-switch",
    frontendPort: "WorkspaceShell.onProjectChange",
    source: "docs/design/workflow/project-switching.md",
  },
  {
    id: "workspace.documents",
    frontendPort: "WorkspaceShell save/delete adapters",
    source: "docs/design/workspace/final-validation.md",
  },
  {
    id: "account.update",
    frontendPort: "AccountSettingsDialog.updateAccount",
    source: "docs/design/project-list/frontend-handoff.md",
  },
] as const;

export type UnresolvedApiBoundaryId =
  (typeof UNRESOLVED_API_BOUNDARIES)[number]["id"];
