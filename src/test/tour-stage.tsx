import { useState } from "react";

import { useWorkspace } from "@/features/workspace/workspace-context";

export function TourStage({
  refresh = true,
  check = true,
  drawer = false,
}: {
  refresh?: boolean;
  check?: boolean;
  drawer?: boolean;
}) {
  const { sidebarVisible } = useWorkspace();
  const sidebar = !drawer || sidebarVisible;
  const [graph, setGraph] = useState(false);
  const [panel, setPanel] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [importing, setImporting] = useState(false);
  return (
    <>
      <div data-tour="editor" />
      {check && (
        <button type="button" data-tour="check-start">
          stage check
        </button>
      )}
      <div data-tour="properties" />
      {sidebar && (
        <button
          type="button"
          data-tour="import"
          onClick={() => setImporting(true)}
        >
          stage import
        </button>
      )}
      {importing && (
        <div data-tour="import-dialog">
          <button
            type="button"
            data-tour="import-cancel"
            onClick={() => setImporting(false)}
          >
            stage cancel
          </button>
        </div>
      )}
      {sidebar && (
        <button type="button" data-tour="graph" onClick={() => setGraph(true)}>
          stage graph
        </button>
      )}
      {graph && (
        <div data-tour="graph-canvas">
          <button type="button" onClick={() => setPanel(true)}>
            stage node
          </button>
        </div>
      )}
      {panel && <aside data-tour="node-panel" />}
      {sidebar && (
        <button
          type="button"
          data-tour="timeline"
          onClick={() => setTimeline(true)}
        >
          stage timeline
        </button>
      )}
      {timeline && <div data-tour="timeline-grid" />}
      {sidebar && check && (
        <button type="button" data-tour="setting-check">
          stage setting check
        </button>
      )}
      {/* 투어는 이 단추를 가리키기만 한다. 검토 화면은 투어가 띄우는 예시 창이 그린다. */}
      {sidebar && refresh && (
        <div data-tour="refresh">
          <button type="button" data-tour="refresh-start">
            stage refresh
          </button>
        </div>
      )}
    </>
  );
}
