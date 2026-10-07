import { GUIDE_TOPICS } from "@/features/help/guide-content";

import type { HelpService } from "../ports";

/**
 * 사용 가이드는 앱과 함께 배포되는 정적 글이다. 프로젝트 목록의 가이드 페이지(`/projects/guide`)가
 * 이미 같은 글을 읽으므로, 작업공간의 가이드 탭도 서버 없이 같은 글을 보여 준다.
 */
export function createApiHelp(): HelpService {
  return { guides: async () => GUIDE_TOPICS };
}
