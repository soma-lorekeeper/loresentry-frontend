import { useState } from "react";

export function TourStage({
  refreshDelay = 300,
  refresh = true,
}: {
  refreshDelay?: number;
  refresh?: boolean;
}) {
  const [graph, setGraph] = useState(false);
  const [panel, setPanel] = useState(false);
  const [timeline, setTimeline] = useState(false);
  const [run, setRun] = useState<"idle" | "running" | "ready">("idle");
  const [diff, setDiff] = useState(false);
  const [picked, setPicked] = useState(false);
  return (
    <>
      <div data-tour="editor" />
      <div data-tour="properties" />
      <button type="button" data-tour="graph" onClick={() => setGraph(true)}>
        stage graph
      </button>
      {graph && (
        <div data-tour="graph-canvas">
          <button type="button" onClick={() => setPanel(true)}>
            stage node
          </button>
        </div>
      )}
      {panel && <aside data-tour="node-panel" />}
      <button
        type="button"
        data-tour="timeline"
        onClick={() => setTimeline(true)}
      >
        stage timeline
      </button>
      {timeline && <div data-tour="timeline-grid" />}
      {refresh && run === "idle" && (
        <button
          type="button"
          data-tour="refresh-start"
          onClick={() => {
            setRun("running");
            window.setTimeout(() => setRun("ready"), refreshDelay);
          }}
        >
          stage refresh
        </button>
      )}
      {run === "running" && (
        <button type="button" data-tour="refresh-running" disabled>
          stage running
        </button>
      )}
      {run === "ready" && (
        <button
          type="button"
          data-tour="refresh-review"
          onClick={() => setDiff(true)}
        >
          stage review
        </button>
      )}
      {diff && (
        <nav data-tour="diff-list">
          <button type="button" onClick={() => setPicked(true)}>
            stage document
          </button>
        </nav>
      )}
      {picked && <div data-tour="diff-compare" />}
      {diff && (
        <button type="button" data-tour="diff-confirm">
          stage confirm
        </button>
      )}
    </>
  );
}
