import type { Services } from "../ports";

import { createApiDocuments, createApiVersions } from "./documents";
import { LocalFavoriteStore } from "./favorites";
import { createApiFiles } from "./files";
import { ApiClient } from "./http";
import { createApiProjects } from "./projects";
import { createApiSearch } from "./search";

/**
 * 서버에 있는 포트만 돌려준다. 나머지는 호출자가 mock 구현 위에 이것을 겹쳐 채운다.
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
    projects: createApiProjects(client),
    files: createApiFiles(client, new LocalFavoriteStore()),
    documents,
    versions: createApiVersions(client, documents),
    search: createApiSearch(client),
    // 아직 서버에 없다: auth, account, memos, graph, refresh, chat, workspaceState, help.
    // 각각 authentication 서비스 연동, 테이블 결정, graph-rag, LLM 을 기다린다.
  };
}
