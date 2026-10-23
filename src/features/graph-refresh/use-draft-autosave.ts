"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";

import type { RefreshProposal } from "@/domain/models";
import { isServiceError } from "@/services/errors";
import { RefreshDraftConflict, type RefreshDraftSides } from "@/services/ports";
import { useServices } from "@/services/services-context";

import { isResolved, type MergeState } from "./merge";

/** 마지막으로 고친 뒤 이만큼 조용하면 저장한다. 화살표를 연달아 눌러도 요청은 한 번이다 */
const SAVE_DELAY_MS = 700;

/**
 * 작업본 하나의 저장 상태.
 *
 * @param saved  서버에 있는 두 쪽(JSON). 화면 값이 이것과 같으면 저장할 것이 없다
 * @param wanted 화면의 두 쪽과 그 JSON
 */
interface Entry {
  revision: number;
  matched: boolean;
  saved: string;
  wanted: RefreshDraftSides;
  wantedKey: string;
  timer: number | null;
  inFlight: Promise<void> | null;
}

/**
 * 화면의 두 쪽을 저장할 모양으로.
 *
 * <p>화면이 두 쪽이 같다고 보면(줄 단위 본문, 빈 속성은 없는 것과 같음) 왼쪽을 두 쪽에 똑같이 보낸다.
 * 서버는 두 쪽을 JSON 그대로 비교하므로, 이렇게 해야 화면이 "정해졌다"고 보인 작업본을 서버도 맞춘
 * 것으로 본다.
 */
function sidesOf(state: MergeState, proposal: RefreshProposal) {
  const current = state.left.get(proposal.fileId) ?? null;
  const proposed = isResolved(state, proposal.fileId)
    ? current
    : (state.right.get(proposal.fileId) ?? null);
  return { current, proposed };
}

/**
 * 검토 작업본의 자동 저장.
 *
 * <p>고친 작업본만 저장한다. 작업본마다 요청은 한 번에 하나이고, 기다리는 동안 또 고치면 끝난 뒤 마지막
 * 값만 보낸다. 다른 탭·기기가 먼저 저장했으면(`onConflict`) 화면이 서버 값을 다시 읽고, 검토가 이미
 * 끝났으면(`onEnded`) 창을 닫는다.
 */
export function useDraftAutosave({
  projectId,
  runId,
  proposals,
  state,
  onConflict,
  onEnded,
}: {
  projectId: string;
  runId: string;
  proposals: readonly RefreshProposal[];
  state: MergeState;
  onConflict: () => void;
  onEnded: () => void;
}) {
  const services = useServices();
  const [, rerender] = useReducer((n: number) => n + 1, 0);
  const [failed, setFailed] = useState(false);
  const callbacks = useRef({ onConflict, onEnded });
  useEffect(() => {
    callbacks.current = { onConflict, onEnded };
  });

  // 작업본마다의 저장 상태. 저장 요청이 고쳐 쓰는 값이라 화면을 다시 그릴 때는 rerender 로 알린다.
  const [entries] = useState(
    () =>
      new Map<string, Entry>(
        proposals.map((proposal) => {
          const loaded = {
            current: proposal.current,
            proposed: proposal.proposed,
          };
          const key = JSON.stringify(loaded);
          return [
            proposal.id,
            {
              revision: proposal.draftRevision,
              matched: proposal.matched,
              saved: key,
              wanted: loaded,
              wantedKey: key,
              timer: null,
              inFlight: null,
            },
          ];
        }),
      ),
  );

  const send = useCallback(
    (draftId: string): Promise<void> => {
      const entry = entries.get(draftId);
      if (!entry) return Promise.resolve();
      if (entry.inFlight) return entry.inFlight;
      if (entry.wantedKey === entry.saved) return Promise.resolve();
      const save = async () => {
        // 기다리는 동안 또 고쳤으면 끝난 뒤 마지막 값을 이어서 보낸다.
        while (entry.wantedKey !== entry.saved) {
          const key = entry.wantedKey;
          try {
            const saved = await services.refresh.saveDraft(
              projectId,
              runId,
              draftId,
              { ...entry.wanted, draftRevision: entry.revision },
            );
            entry.revision = saved.draftRevision;
            entry.matched = saved.matched;
            entry.saved = key;
            setFailed(false);
          } catch (error) {
            if (error instanceof RefreshDraftConflict)
              callbacks.current.onConflict();
            else if (isServiceError(error) && error.code === "not-found")
              callbacks.current.onEnded();
            else setFailed(true);
            return;
          }
        }
      };
      entry.inFlight = save().finally(() => {
        entry.inFlight = null;
        rerender();
      });
      rerender();
      return entry.inFlight;
    },
    [entries, projectId, runId, services],
  );

  useEffect(() => {
    for (const proposal of proposals) {
      const entry = entries.get(proposal.id);
      if (!entry) continue;
      const wanted = sidesOf(state, proposal);
      const key = JSON.stringify(wanted);
      if (key === entry.wantedKey) continue;
      entry.wanted = wanted;
      entry.wantedKey = key;
      if (entry.timer !== null) window.clearTimeout(entry.timer);
      entry.timer = window.setTimeout(() => {
        entry.timer = null;
        void send(proposal.id);
      }, SAVE_DELAY_MS);
    }
    rerender();
  }, [entries, proposals, state, send]);

  // 창을 닫으면 기다리던 저장을 바로 보낸다. 고친 것이 사라지지 않는다.
  useEffect(
    () => () => {
      for (const [draftId, entry] of entries) {
        if (entry.timer === null) continue;
        window.clearTimeout(entry.timer);
        entry.timer = null;
        void send(draftId);
      }
    },
    [entries, send],
  );

  /** 기다리는 저장을 모두 보내고 끝날 때까지 기다린다. 하나라도 실패하면 false 다 */
  const flush = useCallback(async () => {
    const all = [...entries];
    for (const [, entry] of all) {
      if (entry.timer === null) continue;
      window.clearTimeout(entry.timer);
      entry.timer = null;
    }
    await Promise.all(all.map(([draftId]) => send(draftId)));
    return all.every(([, entry]) => entry.wantedKey === entry.saved);
  }, [entries, send]);

  const values = [...entries.values()];
  return {
    /** 서버에 아직 닿지 않은 고침이 있다 */
    pending: values.some(
      (entry) => entry.inFlight !== null || entry.wantedKey !== entry.saved,
    ),
    /** 마지막 저장이 실패했다. `flush` 로 다시 보낸다 */
    failed,
    /** 서버가 본 두 쪽이 모든 작업본에서 같다 */
    allMatched: values.every((entry) => entry.matched),
    flush,
  };
}
