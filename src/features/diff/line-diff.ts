/**
 * 본문을 줄 단위로 견준다.
 *
 * 설명이나 관계와 달리 본문은 문단이 여럿인 글이다. 값 하나로 통째로 비교하면 "본문이
 * 달라졌다"까지만 알 수 있고, 어느 문단이 붙었는지는 눈으로 찾아야 한다. 줄로 끊어
 * 견주면 바뀐 구간만 짚어낼 수 있고, 그 구간 하나가 곧 반영 단위가 된다.
 *
 * 붙어 있는 변경은 **한 덩어리로 묶는다**(hunk). 현재 버전의 11번째 줄이 신규 버전의
 * 13번째 줄과 같고 그 사이 두 줄이 새로 생긴 것이라면, 그 셋을 따로 세우지 않고
 * "여기가 이렇게 바뀐다" 하나로 보여주는 편이 읽힌다.
 *
 * 알고리즘은 교과서적인 LCS 다. 본문은 길어야 백 줄 남짓이라 O(n×m) 로 충분하고,
 * 라이브러리를 들일 이유가 없다.
 */

/** 견줄 대상이 되는 한 덩어리 */
export interface Hunk {
  /** 양쪽이 같은 구간인가. 다르면 화살표가 걸린다 */
  same: boolean;
  /** 현재 버전에서 이 덩어리가 시작하는 줄 번호(0부터) */
  leftStart: number;
  leftLines: string[];
  /** 신규 버전에서 이 덩어리가 시작하는 줄 번호(0부터) */
  rightStart: number;
  rightLines: string[];
}

/** 빈 글은 줄이 하나도 없는 것으로 본다 — 빈 줄 한 개와 구분해야 한다 */
export function toLines(text: string): string[] {
  return text === "" ? [] : text.split("\n");
}

export function fromLines(lines: string[]): string {
  return lines.join("\n");
}

/**
 * 두 글을 줄 단위로 견주어 덩어리 목록을 만든다.
 *
 * 돌려주는 덩어리는 **양쪽을 빠짐없이 한 번씩** 덮는다 — 같은 구간과 다른 구간이
 * 번갈아 나오고, 이어 붙이면 원래 글이 된다.
 */
export function lineDiff(left: string, right: string): Hunk[] {
  const a = toLines(left);
  const b = toLines(right);

  // lcs[i][j] = a[i..] 와 b[j..] 의 최장 공통 부분수열 길이.
  const lcs: number[][] = Array.from({ length: a.length + 1 }, () =>
    new Array<number>(b.length + 1).fill(0),
  );
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i][j] =
        a[i] === b[j]
          ? lcs[i + 1][j + 1] + 1
          : Math.max(lcs[i + 1][j], lcs[i][j + 1]);
    }
  }

  const hunks: Hunk[] = [];
  /** 지금 모으고 있는 덩어리. 성격(같다/다르다)이 바뀔 때 밀어 넣는다 */
  let open: Hunk | null = null;

  const push = (
    same: boolean,
    leftLine: string | null,
    rightLine: string | null,
    i: number,
    j: number,
  ) => {
    if (!open || open.same !== same) {
      if (open) hunks.push(open);
      open = {
        same,
        leftStart: i,
        leftLines: [],
        rightStart: j,
        rightLines: [],
      };
    }
    if (leftLine !== null) open.leftLines.push(leftLine);
    if (rightLine !== null) open.rightLines.push(rightLine);
  };

  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      push(true, a[i], b[j], i, j);
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) {
      // 현재 버전에만 있는 줄 — 신규 버전에서 빠졌다.
      push(false, a[i], null, i, j);
      i += 1;
    } else {
      // 신규 버전에만 있는 줄 — 새로 생겼다.
      push(false, null, b[j], i, j);
      j += 1;
    }
  }
  while (i < a.length) {
    push(false, a[i], null, i, j);
    i += 1;
  }
  while (j < b.length) {
    push(false, null, b[j], i, j);
    j += 1;
  }
  if (open) hunks.push(open);

  return hunks;
}

/**
 * 한쪽 덩어리를 반대쪽 값으로 갈아 끼운 글.
 *
 * 줄 번호가 아니라 **덩어리 자체**를 받는 것은, 반영하고 나면 뒤쪽 덩어리의 줄 번호가
 * 밀리기 때문이다. 화면은 매번 새로 견주므로(diff 를 다시 계산하므로) 그때그때의
 * 덩어리를 그대로 넘기면 된다.
 */
export function applyHunk(
  target: string,
  start: number,
  removeCount: number,
  lines: string[],
): string {
  const next = toLines(target);
  next.splice(start, removeCount, ...lines);
  return fromLines(next);
}
