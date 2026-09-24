import type { RuntimeConfig } from "@/config/runtime-config";

import { createApiServices } from "./api";
import { createMockServices } from "./mock";
import type { Services } from "./ports";

/**
 * `dataSource: "api"` 면 서버에 있는 포트만 HTTP 어댑터로 바꾸고, 나머지는 mock 을 그대로 쓴다.
 * 서버가 포트 단위로 늘어나므로 전환도 포트 단위다 — 전체가 끝날 때까지 기다리지 않는다.
 *
 * `apiBaseUrl` 이 비어 있으면 어댑터가 어디로 요청할지 알 수 없으므로 mock 으로 남는다.
 */
export function createServices(config: RuntimeConfig): Services {
  const mock = createMockServices();
  if (config.dataSource !== "api") return mock;

  if (!config.apiBaseUrl) {
    console.warn(
      "dataSource=api 인데 apiBaseUrl 이 없어 mock 으로 동작합니다.",
    );
    return mock;
  }

  return { ...mock, ...createApiServices(config.apiBaseUrl) };
}
