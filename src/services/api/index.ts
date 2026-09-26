import type { Services } from "../ports";

import { createApiAccount, createApiAuth } from "./auth";
import { createApiDocuments, createApiVersions } from "./documents";
import { ApiFavoriteStore } from "./favorites";
import { createApiFiles } from "./files";
import { ApiClient } from "./http";
import { createApiMemos } from "./memos";
import { createApiProjects } from "./projects";
import { createApiSearch } from "./search";
import { unavailableServices } from "./unavailable";
import { createApiWorkspaceState } from "./workspace-state";

/**
 * 서버에 있는 포트는 HTTP 어댑터로, **서버에 없는 포트는 거절하는 구현으로** 돌려준다.
 *
 * <p><b>왜 부분 구현인가.</b> 서버가 한 번에 완성되지 않는다. 전체를 구현해야만 전환할 수 있다면
 * 마지막 엔드포인트가 끝날 때까지 프론트엔드는 계속 mock 으로 돈다. 포트 단위로 옮기면 끝난 것부터
 * 실제 데이터를 쓰고, 나머지 화면은 그대로 동작한다.
 *
 * <p>포트를 하나 더 옮길 때 할 일은 `services/api/<port>.ts` 를 쓰고 아래에 한 줄 더하는 것뿐이다.
 */
export function createApiServices(baseUrl: string): Partial<Services> {
  const client = new ApiClient(baseUrl);
  const documents = createApiDocuments(client);

  return {
    auth: createApiAuth(client),
    account: createApiAccount(client),
    projects: createApiProjects(client),
    files: createApiFiles(client, new ApiFavoriteStore(client)),
    documents,
    versions: createApiVersions(client, documents),
    search: createApiSearch(client),
    memos: createApiMemos(client),
    workspaceState: createApiWorkspaceState(client),
    // 아직 서버에 없다: graph, refresh, chat, help. 각각 graph-rag, AI 최신화, LLM,
    // 가이드 출처 결정을 기다린다. mock 으로 덮어 두면 가짜 자료를 진짜처럼 보여 준다.
    ...unavailableServices(),
  };
}
