import { useEffect, useState } from "react";
import type { ApplicationBridge, ApplicationClient, HostStatusEvent, WorkspaceOverview } from "@wurst/application";
import "./workspace.css";

export function App(props: { client: ApplicationClient }) {
  const { client } = props;
  const [overview, setOverview] = useState<WorkspaceOverview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<HostStatusEvent | null>(null);

  useEffect(() => {
    let active = true;
    client.getWorkspaceOverview().then(
      (value) => {
        if (active) {
          setOverview(value);
        }
      },
      (reason: unknown) => {
        if (active) {
          setError(reason instanceof Error ? reason.message : "The workspace query failed");
        }
      },
    );
    return () => {
      active = false;
    };
  }, [client]);

  useEffect(() => client.subscribeHostStatus(setStatus), [client]);

  return (
    <div className="shell">
      <header className="top">
        <div>
          <p className="mark">WÜRST</p>
          <h1>Fixture workspace</h1>
        </div>
        <p className="fixture-tag">Fixture</p>
      </header>
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      {overview ? (
        <>
          <p className="note" role="note">
            {overview.disclaimer}
          </p>
          <main className="workspace">
            {overview.areas.map((area) => (
              <section key={area.id} aria-labelledby={`area-${area.id}`}>
                <h2 id={`area-${area.id}`}>{area.title}</h2>
                <p>{area.detail}</p>
              </section>
            ))}
          </main>
          <footer className="meta">
            <p>Application bridge: {bridgeLabel(overview.bridge)}</p>
            <p>
              {status
                ? `Host status fixture: sequence ${status.sequence}`
                : "Host status fixture: waiting for the first event"}
            </p>
          </footer>
        </>
      ) : error ? null : (
        <p>Loading fixture workspace…</p>
      )}
    </div>
  );
}

function bridgeLabel(bridge: ApplicationBridge): string {
  return bridge === "memory" ? "in-memory client" : "Electron preload bridge";
}
