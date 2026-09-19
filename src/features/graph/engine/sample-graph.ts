import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { buildProjectGraph } from "@/services/mock/graph";

import { getRenderGraph, type RenderGraph } from "./render-graph";

/**
 * 테스트가 쓰는 실제 규모의 그래프.
 *
 * 실험 레포는 ORV 픽스처를 썼지만 그 데이터는 가져오지 않았다. 대신 mock 시드(유리
 * 정원의 기록)를 그대로 렌더 페이로드로 옮긴다. 같은 시드는 같은 객체를 돌려준다.
 */
const seeded = buildProjectGraph(getDb(), GLASS_GARDEN_ID);

export function sampleRenderGraph(): RenderGraph {
  return getRenderGraph(seeded);
}
