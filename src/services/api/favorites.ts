import type { FavoriteStore } from "./files";

/**
 * 즐겨찾기는 서버에 테이블이 없다(`CONTENT_PROJECT_API.md` §9, 결정 미완). 원본을 가리키는 id
 * 목록일 뿐이므로 브라우저에 두어도 창작 자료가 사라지지 않는다 — 원본은 서버에 있다.
 *
 * 서버 테이블이 생기면 {@link FavoriteStore} 를 구현한 다른 클래스로 갈아끼운다.
 */
const STORAGE_KEY = "loresentry.favorites";

type Stored = Record<string, string[]>;

function readAll(): Stored {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Stored) : {};
  } catch {
    // 프라이빗 창이나 저장이 막힌 환경. 즐겨찾기가 비어 보일 뿐 다른 기능은 그대로다.
    return {};
  }
}

function writeAll(value: Stored): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // 저장하지 못하면 이 세션에서만 유효하다.
  }
}

export class LocalFavoriteStore implements FavoriteStore {
  read(projectId: string): string[] {
    return readAll()[projectId] ?? [];
  }

  write(projectId: string, fileId: string, favorite: boolean): string[] {
    const all = readAll();
    const current = all[projectId] ?? [];
    const next = favorite
      ? current.includes(fileId)
        ? current
        : [...current, fileId]
      : current.filter((id) => id !== fileId);
    all[projectId] = next;
    writeAll(all);
    return next;
  }
}
