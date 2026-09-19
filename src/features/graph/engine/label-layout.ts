/**
 * 캔버스 라벨 겹침 정리.
 *
 * 노드마다 이름을 그대로 그리면 밀집한 구역에서 글자가 서로 포개져 아무것도 읽히지
 * 않는다(허브 하나에 마우스를 올리면 이웃 200개의 이름이 한꺼번에 뜨는 식). 그래서
 * "이미 그린 라벨과 겹치면 그리지 않는다"는 규칙 하나로 밀도를 잘라낸다.
 *
 * 사각형은 **그래프 좌표**로 받는다. 한 프레임 안에서는 배율이 하나뿐이라, 그래프
 * 좌표에서 겹치면 화면에서도 겹치고 그 반대도 성립한다 — 굳이 화면 좌표로 바꿀 이유가
 * 없다.
 *
 * 프레임마다 새로 시작해야 하므로 그리기 직전에 reset() 을 부른다. 2D 렌더러에는
 * onRenderFramePre 훅이 있어 거기가 그 자리다.
 */

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface LabelPacker {
  /** 프레임 시작. 지금까지 쌓인 사각형을 버린다 */
  reset(): void;
  /**
   * 이 사각형에 라벨을 놓을 수 있으면 자리를 잡고 true.
   * 이미 놓인 것과 겹치면 아무것도 하지 않고 false.
   *
   * @param force 겹쳐도 무조건 놓는다. 마우스를 올린 노드처럼 반드시 보여야 하는 라벨용
   */
  place(
    x0: number,
    y0: number,
    x1: number,
    y1: number,
    force?: boolean,
  ): boolean;
}

export function createLabelPacker(): LabelPacker {
  const boxes: Box[] = [];

  return {
    reset() {
      boxes.length = 0;
    },

    place(x0, y0, x1, y1, force = false) {
      if (!force) {
        for (const box of boxes) {
          // 두 사각형이 어느 축에서도 떨어져 있지 않으면 겹친 것이다.
          if (x0 < box.x1 && x1 > box.x0 && y0 < box.y1 && y1 > box.y0) {
            return false;
          }
        }
      }
      boxes.push({ x0, y0, x1, y1 });
      return true;
    },
  };
}
