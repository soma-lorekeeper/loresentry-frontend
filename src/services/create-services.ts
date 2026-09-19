import type { RuntimeConfig } from "@/config/runtime-config";

import { createMockServices } from "./mock";
import type { Services } from "./ports";

export function createServices(config: RuntimeConfig): Services {
  if (config.dataSource === "api") {
    // 백엔드 HTTP 어댑터는 API 계약이 확정된 뒤 services/api에 추가한다. 그 전까지는 mock으로 동작한다.
    console.warn(
      "dataSource=api는 아직 구현되지 않아 mock 데이터를 사용합니다.",
    );
  }
  return createMockServices();
}
