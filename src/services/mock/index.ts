import type { Services } from "../ports";

import { mockAccount, mockAuth } from "./account";
import { mockChat } from "./chat";
import { mockDocuments, mockVersions } from "./documents";
import { mockFiles } from "./files";
import { mockGraph, mockWorkspaceState } from "./graph";
import { mockHelp } from "./help";
import { mockMemos } from "./memos";
import { mockProjects } from "./projects";
import { mockRefresh } from "./refresh";
import { mockSearch } from "./search";

export function createMockServices(): Services {
  return {
    auth: mockAuth,
    account: mockAccount,
    projects: mockProjects,
    files: mockFiles,
    documents: mockDocuments,
    versions: mockVersions,
    memos: mockMemos,
    search: mockSearch,
    graph: mockGraph,
    refresh: mockRefresh,
    chat: mockChat,
    workspaceState: mockWorkspaceState,
    help: mockHelp,
  };
}
