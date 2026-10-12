import type { Services } from "./ports";

/**
 * 데이터 출처가 정해질 때까지 호출을 붙잡아 두는 서비스.
 *
 * <p><b>왜 필요한가.</b> 어느 서버에 요청할지는 `config.json` 을 읽어야 안다(app/providers.tsx).
 * 예전에는 그때까지 화면 전체를 그리지 않아 "출처가 정해지기 전에는 요청이 나가지 않는다"를 지켰다.
 * 그 대가로 정적 HTML 의 본문이 비었다 — 검색 로봇이 읽을 글이 없었다. 이제는 화면을 바로 그리고,
 * 대신 서비스 호출이 여기서 기다린다. 화면 코드는 이 사실을 몰라도 된다. `useServices()` 가
 * 돌려주는 값의 모양과 쓰는 법은 그대로다.
 *
 * <p><b>동작.</b> {@link DeferredServices.settle} 이 불리기 전의 호출은 붙잡아 두었다가, 불린 뒤
 * 순서대로 진짜 서비스에 넘긴다. 불린 뒤의 호출은 진짜 서비스의 함수를 바로 부른다 — 설정이 온 뒤의
 * 동작과 타이밍은 이 층이 없을 때와 같다.
 *
 * <p><b>왜 mock 의 모양을 빌리는가.</b> 포트와 함수의 이름을 알아야 같은 모양의 객체를 만들 수 있다.
 * `shape` 에서는 이름만 읽고 함수를 부르지 않는다. 그래서 출처가 정해지기 전에 mock 데이터가 새어
 * 나갈 길이 없다. 포트 객체는 한 번 만들면 바뀌지 않아, effect 의 의존 배열에 넣어도 다시 돌지 않는다.
 *
 * <p><b>전제.</b> 모든 포트의 모든 함수가 `Promise` 를 돌려준다. 붙잡아 두려면 답을 나중에 줄 수
 * 있어야 하기 때문이다. 값을 바로 돌려주는 함수를 포트에 더하면 아래 {@link ServicesAreAsync} 에서
 * 컴파일이 실패한다.
 */
export interface DeferredServices {
  /** 화면에 건네는 서비스. 앱이 떠 있는 동안 같은 객체다. */
  services: Services;
  /** 읽어 온 설정으로 만든 진짜 서비스를 넘긴다. 처음 한 번만 받아들인다. */
  settle(real: Services): void;
}

type AsyncMember = (...args: never[]) => Promise<unknown>;

/** `Promise` 를 돌려주지 않는 member 의 이름. 하나도 없어야 한다. */
type SyncMembers = {
  [Port in keyof Services]: {
    [Member in keyof Services[Port]]: Services[Port][Member] extends AsyncMember
      ? never
      : Member;
  }[keyof Services[Port]];
}[keyof Services];

type Assert<Condition extends true> = Condition;

/** 포트에 동기 함수가 생기면 이 줄에서 타입 오류가 난다. 위 설명의 "전제"를 지키는 장치다. */
export type ServicesAreAsync = Assert<
  [SyncMembers] extends [never] ? true : false
>;

type Port = Record<string, (...args: unknown[]) => Promise<unknown>>;

export function deferServices(shape: Services): DeferredServices {
  let real: Services | null = null;
  let release: (services: Services) => void = () => {};
  const ready = new Promise<Services>((resolve) => {
    release = resolve;
  });

  const services: Record<string, Port> = {};
  for (const port of Object.keys(shape) as (keyof Services)[]) {
    const members: Port = {};
    for (const member of Object.keys(shape[port])) {
      members[member] = (...args) => {
        // 포트의 함수로 불러야 그 함수 안의 this 가 포트 객체를 가리킨다.
        const call = (target: Services) =>
          (target[port] as unknown as Port)[member](...args);
        return real ? call(real) : ready.then(call);
      };
    }
    services[port] = members;
  }

  return {
    services: services as unknown as Services,
    settle(next) {
      // 출처는 한 번 정해지면 바뀌지 않는다. 두 번째로 넘어온 것은 버린다 — 서비스마다 캐시를
      // 갖고 있어(예: 파일 트리), 도중에 바꾸면 먼저 받은 답과 어긋난다.
      if (real) return;
      // 값을 먼저 꽂고 약속을 푼다. 이 줄 뒤의 호출은 곧바로 진짜 함수로 간다.
      real = next;
      release(next);
    },
  };
}
