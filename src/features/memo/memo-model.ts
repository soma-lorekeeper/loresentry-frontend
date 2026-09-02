export type MemoSaveStatus = "disconnected" | "error" | "saved" | "saving";

export interface ProjectMemo {
  body: string;
  id: string;
  saveStatus?: MemoSaveStatus;
}

export interface FileMemo {
  body: string;
  fileId: string;
  fileName: string;
  id: string;
  saveStatus?: MemoSaveStatus;
}

export interface MemoCollection {
  file: FileMemo[];
  project: ProjectMemo[];
}

export interface MemoSaveInput {
  body: string;
  fileId?: string;
  id: string;
  projectId: string;
  scope: "file" | "project";
}

export interface MemoDeleteInput {
  fileId?: string;
  id: string;
  projectId: string;
  scope: "file" | "project";
}

export interface MemoDeleteTarget {
  body: string;
  input: MemoDeleteInput;
  label: string;
  returnFocus: HTMLElement;
}

export const initialMemoCollections: Record<string, MemoCollection> = {
  "glass-garden": {
    project: [
      {
        id: "project-memory-direction",
        body: "균열은 문이 아니라 기억의 방향이다. 다음 장면에서 유리 조각의 의미를 다시 연결한다.",
      },
      {
        id: "project-northern-door",
        body: "북쪽 문은 서윤의 기억에 반응한다. 문 너머의 목소리는 3화에서 떠난 인물과 연결한다.",
      },
      {
        id: "project-lantern-rule",
        body: "등불이 꺼지는 순간을 장면 전환점으로 사용한다. 다른 원고에서도 같은 규칙을 유지한다.",
      },
    ],
    file: [
      {
        id: "file-manuscript-12-memo",
        fileId: "manuscript-12",
        fileName: "12화 · 균열의 밤",
        body: "손잡이 진동 묘사는 한 번만 사용한다. ‘균열’이라는 단어는 마지막 문장까지 아껴 두기.",
      },
      {
        id: "file-manuscript-11-memo",
        fileId: "manuscript-11",
        fileName: "11화 · 유리 정원",
        body: "이 장면에서 유리 조각은 주인공의 기억을 상징한다.",
      },
    ],
  },
};

export function emptyMemoCollection(): MemoCollection {
  return { file: [], project: [] };
}
