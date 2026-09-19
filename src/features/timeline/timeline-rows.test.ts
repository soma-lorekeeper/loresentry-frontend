/**
 * 타임라인 표 계약 테스트.
 *
 * 이 화면이 답하려는 질문은 "이 노드가 **언제** 있었나"다. 그래서 여기서 못 박는 것도
 * 시간에 관한 것들이다 — 등장이 빠짐없이 잡히는가, 끊긴 구간이 끊긴 채로 남는가,
 * 자주 나온 것이 위로 오는가.
 *
 * 실험 레포의 픽스처 대신 mock 시드(유리 정원의 기록)로 같은 성질을 확인한다.
 */

import { describe, expect, it } from "vitest";

import { buildAdjacency } from "@/features/graph/engine/adjacency";
import { GLASS_GARDEN_ID, getDb } from "@/services/mock/db";
import { buildProjectGraph } from "@/services/mock/graph";

import { getTimeline } from "./timeline-data";
import {
  FAVORITES_GROUP,
  buildTimelineTable,
  chaptersOf as orderedChapters,
  stepColumn,
} from "./timeline-rows";

const graph = buildProjectGraph(getDb(), GLASS_GARDEN_ID);
const adjacency = buildAdjacency(graph);
const episodes = graph.episodes.map((episode) => episode.id);
const episodeTitle = (id: string) =>
  graph.episodes.find((episode) => episode.id === id)?.title;

function allChapters() {
  return orderedChapters(graph);
}

function chaptersOf(episodeId: string) {
  const ids = graph.episodes.find((e) => e.id === episodeId)?.chapterIds ?? [];
  return allChapters().filter((chapter) => ids.includes(chapter.id));
}

function getEpisode(chapterId: string) {
  return graph.episodes.find((e) => e.chapterIds.includes(chapterId))?.title;
}

const table = buildTimelineTable(allChapters(), graph);
const rows = table.groups.flatMap((group) => group.rows);

describe("열 — 회차", () => {
  it("회차가 진행 순서대로 열이 된다", () => {
    expect(table.columns).toHaveLength(allChapters().length);
    for (let i = 1; i < table.columns.length; i += 1) {
      expect(table.columns[i].number).toBeGreaterThan(
        table.columns[i - 1].number,
      );
    }
  });

  it("에피소드 구간이 빈틈없이 열을 덮는다", () => {
    // 구간이 어긋나면 머리글 띠가 엉뚱한 회차 위에 얹힌다.
    expect(table.episodes[0].from).toBe(0);
    expect(table.episodes[table.episodes.length - 1].to).toBe(
      table.columns.length - 1,
    );
    for (let i = 1; i < table.episodes.length; i += 1) {
      expect(table.episodes[i].from).toBe(table.episodes[i - 1].to + 1);
    }
  });

  it("구간마다 그 회차들의 에피소드가 실제로 같다", () => {
    for (const episode of table.episodes) {
      for (let i = episode.from; i <= episode.to; i += 1) {
        expect(
          getEpisode(table.columns[i].chapterId) ?? "(에피소드 없음)",
        ).toBe(episode.name);
      }
    }
  });
});

describe("줄 — 엔티티", () => {
  it("회차와 이어진 노드가 전부 줄이 된다", () => {
    // 기대하는 집합을 따로 만들어 맞춰 본다.
    const expected = new Set<string>();
    for (const chapter of allChapters()) {
      for (const neighborId of adjacency.neighbors.get(chapter.id) ?? []) {
        const neighbor = graph.nodes.find((node) => node.id === neighborId);
        if (neighbor && neighbor.docType !== "manuscript")
          expected.add(neighborId);
      }
    }
    expect(new Set(rows.map((row) => row.nodeId))).toEqual(expected);
  });

  it("회차는 줄이 되지 않는다", () => {
    // 회차는 열이다. 줄로도 나오면 같은 것이 두 축에 있게 된다.
    expect(rows.every((row) => row.kind !== "manuscript")).toBe(true);
  });

  it("등장 회차가 실제 관계와 일치한다", () => {
    for (const row of rows) {
      const actual = new Set(
        row.columns.map((index) => table.columns[index].chapterId),
      );
      const expected = new Set(
        [...(adjacency.neighbors.get(row.nodeId) ?? [])].filter((id) =>
          table.columns.some((column) => column.chapterId === id),
        ),
      );
      expect(actual, row.name).toEqual(expected);
    }
  });

  it("등장 회차가 오름차순이다", () => {
    for (const row of rows) {
      for (let i = 1; i < row.columns.length; i += 1) {
        expect(row.columns[i], row.name).toBeGreaterThan(row.columns[i - 1]);
      }
    }
  });
});

describe("막대", () => {
  it("이어진 등장은 막대 하나로 묶인다", () => {
    const merged = buildTimelineTable(allChapters(), graph);
    for (const row of merged.groups.flatMap((group) => group.rows)) {
      // 막대가 덮는 열을 펼치면 등장 목록과 정확히 같아야 한다.
      const covered: number[] = [];
      for (const run of row.runs) {
        for (let i = run.from; i <= run.to; i += 1) covered.push(i);
      }
      expect(covered, row.name).toEqual(row.columns);
    }
  });

  it("끊긴 구간은 끊긴 채로 남는다", () => {
    // 여기가 이 화면의 값어치다 — 붙여 버리면 "몇 화째 안 나왔다"가 사라진다.
    const gapped = rows.filter((row) => row.runs.length > 1);
    expect(gapped.length).toBeGreaterThan(0);
    for (const row of gapped) {
      for (let i = 1; i < row.runs.length; i += 1) {
        expect(row.runs[i].from, row.name).toBeGreaterThan(
          row.runs[i - 1].to + 1,
        );
      }
    }
  });

  it("첫·마지막 등장이 막대의 양 끝과 같다", () => {
    // 옅은 연결선을 이 두 값으로 긋는다. 어긋나면 선이 막대 밖으로 삐져나온다.
    for (const row of rows) {
      expect(row.first, row.name).toBe(row.runs[0].from);
      expect(row.last, row.name).toBe(row.runs[row.runs.length - 1].to);
    }
  });
});

describe("정렬과 묶음", () => {
  it("폴더 안에서 자주 나온 순으로 온다", () => {
    // 대부분이 몇 회만 나오므로, 정렬하지 않으면 스치고 마는 노드가 주역과
    // 뒤섞여 표가 읽히지 않는다.
    for (const group of table.groups) {
      for (let i = 1; i < group.rows.length; i += 1) {
        expect(
          group.rows[i - 1].columns.length,
          group.id,
        ).toBeGreaterThanOrEqual(group.rows[i].columns.length);
      }
    }
  });

  it("한 노드는 한 폴더에만 들어간다", () => {
    expect(new Set(rows.map((row) => row.nodeId)).size).toBe(rows.length);
    for (const group of table.groups) {
      expect(group.rows.every((row) => row.kind === group.kind)).toBe(true);
    }
  });

  it("빈 분류는 폴더를 만들지 않는다", () => {
    expect(table.groups.every((group) => group.rows.length > 0)).toBe(true);
  });

  it("같은 입력이면 같은 표가 나온다", () => {
    const again = buildTimelineTable(allChapters(), graph);
    expect(again.groups.map((g) => g.rows.map((r) => r.nodeId))).toEqual(
      table.groups.map((g) => g.rows.map((r) => r.nodeId)),
    );
  });
});

describe("즐겨찾기 폴더", () => {
  const DOKJA = "glass-garden:c-seoyun";
  const SANGAH = "glass-garden:c-lena";
  const starred = new Set([DOKJA, SANGAH]);
  const withStars = buildTimelineTable(allChapters(), graph, starred);

  it("즐겨찾기가 없으면 폴더도 없다", () => {
    // 빈 폴더가 맨 위에 있으면 자리만 차지한다.
    expect(table.groups.some((group) => group.id === FAVORITES_GROUP)).toBe(
      false,
    );
  });

  it("맨 앞에 온다", () => {
    // 먼저 보라고 만든 폴더다. 뒤에 있으면 뜻이 없다.
    expect(withStars.groups[0].id).toBe(FAVORITES_GROUP);
    expect(withStars.groups[0].label).toBe("즐겨찾기");
    // 분류가 없으므로 일곱 색 중 하나를 빌리지 않는다.
    expect(withStars.groups[0].kind).toBeNull();
  });

  it("분류와 무관하게 한 폴더에 모인다", () => {
    const across = new Set([DOKJA, "glass-garden:i-lantern"]);
    const mixed = buildTimelineTable(allChapters(), graph, across);
    const kinds = new Set(mixed.groups[0].rows.map((row) => row.kind));
    expect(mixed.groups[0].rows.map((row) => row.nodeId).sort()).toEqual(
      [...across].sort(),
    );
    // 인물과 사물이 한 폴더에 있다.
    expect(kinds.size).toBeGreaterThan(1);
  });

  it("원래 분류 폴더에서는 빠진다", () => {
    /*
     * 여기가 사이드바와 갈리는 지점이다. 양쪽에 다 두면 같은 막대가 두 줄
     * 그려져 등장 횟수를 잘못 읽게 된다.
     */
    const characters = withStars.groups.find(
      (group) => group.id === "character",
    );
    expect(characters?.rows.some((row) => row.nodeId === DOKJA)).toBe(false);

    const before =
      table.groups.find((group) => group.id === "character")?.rows.length ?? 0;
    expect(characters?.rows.length).toBe(before - 2);
  });

  it("줄 수 합계는 그대로다", () => {
    // 옮겨 담았을 뿐 없어지거나 늘어난 줄은 없다.
    expect(withStars.rowCount).toBe(table.rowCount);
    const moved = withStars.groups.flatMap((group) => group.rows);
    expect(new Set(moved.map((row) => row.nodeId)).size).toBe(moved.length);
    expect(moved).toHaveLength(rows.length);
  });

  it("폴더 안에서도 자주 나온 순이다", () => {
    const group = withStars.groups[0];
    for (let i = 1; i < group.rows.length; i += 1) {
      expect(group.rows[i - 1].columns.length).toBeGreaterThanOrEqual(
        group.rows[i].columns.length,
      );
    }
  });

  it("열과 에피소드 구간은 건드리지 않는다", () => {
    // 즐겨찾기는 줄을 재배치할 뿐이다. 시간축이 흔들리면 비교가 무너진다.
    expect(withStars.columns).toEqual(table.columns);
    expect(withStars.episodes).toEqual(table.episodes);
  });

  it("그래프에 없는 id 는 무시한다", () => {
    const ghost = buildTimelineTable(
      allChapters(),
      graph,
      new Set(["없는_노드"]),
    );
    expect(ghost.groups.some((group) => group.id === FAVORITES_GROUP)).toBe(
      false,
    );
  });
});

const DOKJA_ID = "glass-garden:c-seoyun";

describe("에피소드 필터", () => {
  it("고른 에피소드의 회차만 열이 된다", () => {
    const id = episodes[2];
    const only = buildTimelineTable(chaptersOf(id), graph);
    expect(only.columns.map((c) => c.chapterId)).toEqual(
      chaptersOf(id).map((chapter) => chapter.id),
    );
    expect(only.episodes).toHaveLength(1);
    expect(only.episodes[0].name).toBe(episodeTitle(id));
  });

  it("같은 조건이면 같은 객체다", () => {
    const none = new Set<string>();
    expect(getTimeline(graph, null, none)).toBe(getTimeline(graph, null, none));
    expect(getTimeline(graph, null, none)).not.toBe(
      getTimeline(graph, [episodes[1]], none),
    );
  });

  it("에피소드 여럿을 고르면 그 회차들이 모두 열이 된다", () => {
    // 예전에는 드롭다운이라 한 번에 하나였다. 이제 체크박스라 여럿을 남길 수 있다.
    const none = new Set<string>();
    const pair = [episodes[1], episodes[3]];
    const both = getTimeline(graph, pair, none);
    const expected = allChapters()
      .filter((chapter) =>
        pair.flatMap((id) => chaptersOf(id)).some((c) => c.id === chapter.id),
      )
      .map((chapter) => chapter.id);

    expect(both.columns.map((c) => c.chapterId)).toEqual(expected);
    // 회차 순으로 서야 한다 — 에피소드별로 이어 붙이면 시간이 뒤엉킨다.
    expect(both.episodes.map((e) => e.name)).toEqual(pair.map(episodeTitle));
  });

  it("고른 조합이 같으면 순서가 달라도 같은 객체다", () => {
    const none = new Set<string>();
    const pair = [episodes[2], episodes[0]];
    expect(getTimeline(graph, pair, none)).toBe(
      getTimeline(graph, [...pair].reverse(), none),
    );
  });

  it("즐겨찾기가 바뀌면 표를 다시 만든다", () => {
    // 캐시가 즐겨찾기를 열쇠에 넣지 않으면 별을 켜도 폴더가 안 생긴다.
    const before = getTimeline(graph, null, new Set());
    const after = getTimeline(graph, null, new Set([DOKJA_ID]));
    expect(after).not.toBe(before);
    expect(after.groups[0].id).toBe(FAVORITES_GROUP);
  });
});

describe("키보드 이동", () => {
  it("좌우는 한 회차씩 옮긴다", () => {
    expect(stepColumn(table, 0, 1, 0)).toBe(1);
    expect(stepColumn(table, 5, -1, 0)).toBe(4);
  });

  it("양 끝에서는 더 가지 않는다", () => {
    expect(stepColumn(table, 0, -1, 0)).toBe(0);
    const last = table.columns.length - 1;
    expect(stepColumn(table, last, 1, 0)).toBe(last);
  });

  it("아래는 다음 에피소드의 첫 회차로 건너뛴다", () => {
    const next = stepColumn(table, 0, 0, 1);
    expect(next).toBe(table.episodes[1].from);
  });

  it("에피소드 한가운데에서 위는 그 에피소드의 첫 회차로", () => {
    // 곧바로 두 단락 앞으로 튀지 않게 한 걸음씩 물러난다.
    const episode = table.episodes[2];
    const middle = episode.from + 1;
    expect(stepColumn(table, middle, 0, -1)).toBe(episode.from);
  });

  it("첫 회차에 서 있으면 위는 이전 에피소드로", () => {
    const episode = table.episodes[2];
    expect(stepColumn(table, episode.from, 0, -1)).toBe(table.episodes[1].from);
  });

  it("맨 앞·맨 뒤 에피소드에서는 그대로 있는다", () => {
    expect(stepColumn(table, 0, 0, -1)).toBe(0);
    const lastEpisode = table.episodes[table.episodes.length - 1];
    expect(stepColumn(table, lastEpisode.from, 0, 1)).toBe(lastEpisode.from);
  });
});
