import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, FileClock, RefreshCw } from "lucide-react";
import { api } from "../../lib/api";
import { dateTime } from "../../lib/format";
import { Empty, ErrorNotice } from "../Notice";

function StateContext({ entry }) {
  const previous = entry.previousState;
  const next = entry.newState;
  const beforeStatus = previous?.status;
  const afterStatus = next?.status;
  if (!beforeStatus && !afterStatus) return null;
  return <div className="audit-context"><span>{beforeStatus || "not created"}</span><i>→</i><span>{afterStatus || "removed"}</span></div>;
}

export default function AuditTimeline({ familyId }) {
  const [entries, setEntries] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async ({ append = false, quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const query = new URLSearchParams({ limit: "30", ...(append && cursor && { cursor }) });
      const data = await api(`/audit/${familyId}?${query}`);
      if (quiet) {
        setEntries((current) => {
          const merged = new Map([...data.entries, ...current].map((entry) => [entry._id, entry]));
          return [...merged.values()].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        });
      } else {
        setEntries((current) => append ? [...current, ...data.entries] : data.entries);
        setCursor(data.nextCursor); setHasMore(data.hasMore);
      }
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError.message);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, [cursor, familyId]);

  useEffect(() => { load(); }, [familyId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const timer = window.setInterval(() => load({ quiet: true }), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  return <><ErrorNotice message={error}/><section className="audit-panel">
    <header><div><span className="eyebrow">VERIFIABLE HISTORY</span><h2>Family activity timeline</h2><p>Newest entries appear first. Every item was timestamped by the server.</p></div><button className="icon-button" aria-label="Refresh audit trail" onClick={() => load()}><RefreshCw size={17}/></button></header>
    {loading && !entries.length ? <div className="audit-loading">Loading permanent records…</div> : !entries.length ? <Empty title="No activity recorded yet">State-changing actions will appear here automatically.</Empty> : <div className="audit-timeline">{entries.map((entry) => <article key={entry._id} className="audit-entry"><div className="audit-marker"><CheckCircle2 size={16}/></div><div className="audit-entry-card"><div className="audit-entry-top"><span className="audit-action">{entry.action}</span><time><FileClock size={14}/>{dateTime(entry.timestamp)}</time></div><strong>{entry.description}</strong><StateContext entry={entry}/><small>{entry.entityType} · Record {entry.entityId.slice(-8)}</small></div></article>)}</div>}
    {hasMore && <button className="button secondary audit-more" disabled={loading} onClick={() => load({ append: true })}>{loading ? "Loading…" : "Load older activity"}</button>}
  </section></>;
}
