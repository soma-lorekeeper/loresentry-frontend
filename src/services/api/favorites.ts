/**
 * 즐겨찾기는 서버 테이블이 생겼다. 원본을 가리키는 id 목록일 뿐이라 추가·제거가 본문 없는
 * PUT·DELETE 이고, 둘 다 갱신된 전체 목록을 돌려준다 — 화면이 목록을 다시 요청하지 않는다.
 */
import type { ApiClient } from "./http";

export interface FavoriteStore {
  read(projectId: string): Promise<string[]>;
  write(
    projectId: string,
    fileId: string,
    favorite: boolean,
  ): Promise<string[]>;
}

export class ApiFavoriteStore implements FavoriteStore {
  constructor(private readonly client: ApiClient) {}

  async read(projectId: string): Promise<string[]> {
    const body = await this.client.request<{ file_ids: string[] }>(
      `/projects/${projectId}/favorites`,
      { operation: "files.favorites" },
    );
    return body.file_ids;
  }

  async write(
    projectId: string,
    fileId: string,
    favorite: boolean,
  ): Promise<string[]> {
    const body = await this.client.request<{ file_ids: string[] }>(
      `/projects/${projectId}/favorites/${fileId}`,
      { method: favorite ? "PUT" : "DELETE", operation: "files.setFavorite" },
    );
    return body.file_ids;
  }
}
