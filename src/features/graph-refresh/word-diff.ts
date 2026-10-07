/**
 * 짝지은 두 줄 안에서 **바뀐 낱말만** 짚는다.
 *
 * 줄 전체를 칠하면 무엇이 바뀌었는지는 두 줄을 번갈아 읽어 찾아야 한다. 같은 줄 안의 다른
 * 낱말에 더 진한 표시를 얹으면 눈이 곧장 그 자리로 간다.
 *
 * 낱말은 띄어쓰기로 끊는다(어절). 글자 단위로 견주면 조사 하나가 바뀐 자리마다 자잘한 표시가
 * 흩어져 오히려 읽기 어렵다. 두 줄이 거의 다르면 표시를 아예 두지 않는다 — 온통 칠해진 줄은
 * 줄 전체 띠와 다를 것이 없고 시끄럽기만 하다.
 */

export interface Segment {
  text: string;
  changed: boolean;
}

/** 짧은 쪽 낱말 가운데 같은 것의 비율이 이보다 낮으면 표시하지 않는다 */
const MIN_SHARED = 0.35;

/** 낱말과 띄어쓰기를 번갈아. 이어 붙이면 원래 글이 된다 */
function tokenize(text: string): string[] {
  return text.match(/\s+|\S+/g) ?? [];
}

/** 이웃한 같은 성격의 조각을 하나로 잇는다 */
function joined(tokens: string[], changed: boolean[]): Segment[] {
  const out: Segment[] = [];
  tokens.forEach((text, index) => {
    // 띄어쓰기는 홀로 표시되지 않는다. 바뀐 낱말 사이에 끼었을 때만 표시 안에 넣어, 낱말마다
    // 따로 칠한 것처럼 끊겨 보이지 않게 한다.
    const flag = /^\s+$/.test(text)
      ? !!changed[index - 1] && !!changed[index + 1]
      : changed[index];
    const last = out[out.length - 1];
    if (last && last.changed === flag) last.text += text;
    else out.push({ text, changed: flag });
  });
  return out;
}

/**
 * 두 글의 낱말 차이. 표시할 만큼 닮지 않았으면 null 이다.
 *
 * 알고리즘은 줄 비교(line-diff)와 같은 LCS 다. 한 줄은 길어야 수백 낱말이다.
 */
export function wordDiff(
  left: string,
  right: string,
): { left: Segment[]; right: Segment[] } | null {
  if (left === right) return null;
  const a = tokenize(left);
  const b = tokenize(right);
  const words = (tokens: string[]) => tokens.filter((t) => /\S/.test(t)).length;
  if (words(a) === 0 || words(b) === 0) return null;

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

  const keepA = new Array<boolean>(a.length).fill(false);
  const keepB = new Array<boolean>(b.length).fill(false);
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) {
      keepA[i] = true;
      keepB[j] = true;
      i += 1;
      j += 1;
    } else if (lcs[i + 1][j] >= lcs[i][j + 1]) i += 1;
    else j += 1;
  }

  const shared = a.filter((t, i) => keepA[i] && /\S/.test(t)).length;
  // 짧은 쪽을 기준으로 잰다. 짧은 설명에 낱말 몇 개가 더 붙은 경우가 흔한데, 긴 쪽으로 재면
  // 그때마다 표시가 사라진다.
  if (shared === 0 || shared / Math.min(words(a), words(b)) < MIN_SHARED)
    return null;

  return {
    left: joined(
      a,
      keepA.map((keep) => !keep),
    ),
    right: joined(
      b,
      keepB.map((keep) => !keep),
    ),
  };
}
