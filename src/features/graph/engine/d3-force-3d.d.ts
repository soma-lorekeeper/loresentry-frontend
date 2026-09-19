/**
 * d3-force-3d 의 타입 선언.
 *
 * 이 패키지는 타입 정의를 동봉하지 않고 @types/d3-force-3d 도 존재하지 않는다.
 * 그래서 우리가 실제로 쓰는 forceCollide 하나만 좁게 선언한다. 나머지 힘들은
 * force-graph 가 내부에서 만들어 쓰므로 우리 코드가 import 할 일이 없다.
 */
declare module "d3-force-3d" {
  /** 시뮬레이션이 부르는 힘 함수. 체이닝 setter 를 함께 갖는다 */
  export interface CollideForce<T> {
    (alpha: number): void;
    /** 시뮬레이션이 노드 배열과 함께 호출한다(난수 생성기·차원 수가 뒤에 붙는다) */
    initialize(nodes: T[], ...args: unknown[]): void;
    /** 노드마다의 충돌 반지름 */
    radius(accessor: number | ((node: T) => number)): CollideForce<T>;
    /** 겹침을 한 틱에 얼마나 해소할지. 기본 1 */
    strength(value: number): CollideForce<T>;
    /** 틱당 반복 횟수. 올리면 엄격해지고 느려진다. 기본 1 */
    iterations(value: number): CollideForce<T>;
  }

  export function forceCollide<T>(
    radius?: number | ((node: T) => number),
  ): CollideForce<T>;
}
