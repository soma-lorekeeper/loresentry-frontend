import { ServiceError } from "../errors";
import type {
  ChatService,
  GraphService,
  HelpService,
  RefreshService,
  Services,
} from "../ports";

/**
 * 서버가 아직 없는 포트들. **mock 으로 채우지 않는다.**
 *
 * <p>mock 을 그대로 두면 화면이 그럴듯한 가짜 그래프·대화·가이드를 보여 준다. 실제 API 로 도는
 * 사이트에서 그것은 거짓말이다 — 보는 사람은 그 기능이 동작한다고 믿고, 자기 자료라고 생각한다.
 * 그래서 요청을 거절하고, 화면은 그 코드를 보고 "아직 준비되지 않았다"고 말한다.
 *
 * <p>여기서 포트가 하나 구현되면 이 파일에서 한 줄을 지우고 `services/api/<port>.ts` 를 더한다.
 */
function unavailable<T>(): Promise<T> {
  return Promise.reject(
    new ServiceError("unavailable", "이 기능은 아직 준비되지 않았어요."),
  );
}

const graph: GraphService = {
  getProjectGraph: () => unavailable(),
};

const refresh: RefreshService = {
  current: () => unavailable(),
  start: () => unavailable(),
  apply: () => unavailable(),
  discard: () => unavailable(),
};

const chat: ChatService = {
  sessions: () => unavailable(),
  createSession: () => unavailable(),
  renameSession: () => unavailable(),
  deleteSession: () => unavailable(),
  messages: () => unavailable(),
  send: () => unavailable(),
};

const help: HelpService = {
  guides: () => unavailable(),
};

export function unavailableServices(): Pick<
  Services,
  "graph" | "refresh" | "chat" | "help"
> {
  return { graph, refresh, chat, help };
}
