import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, LockKeyhole, Send, ShieldCheck } from "lucide-react";
import { api, uploadAsset } from "../../lib/api";
import { dateTime, initials } from "../../lib/format";
import { Empty, ErrorNotice } from "../Notice";

export default function MessageThread({ family, user }) {
  const [messages, setMessages] = useState([]);
  const [filter, setFilter] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [content, setContent] = useState("");
  const [type, setType] = useState("message");
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef(null);

  const endpoint = useCallback((cursorValue) => {
    const query = new URLSearchParams({ ...(filter && { type: filter }), ...(cursorValue && { cursor: cursorValue }) });
    return `/messages/${family._id}?${query}`;
  }, [family._id, filter]);

  const load = useCallback(async ({ quiet = false } = {}) => {
    try {
      const data = await api(endpoint());
      if (quiet) {
        setMessages((current) => {
          const merged = new Map([...current, ...data.messages].map((message) => [message._id, message]));
          return [...merged.values()].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        });
      } else {
        setMessages(data.messages); setHasMore(data.hasMore); setCursor(data.nextCursor);
      }
      if (!quiet) window.setTimeout(() => bottomRef.current?.scrollIntoView(), 30);
      setError("");
    } catch (loadError) {
      if (!quiet) setError(loadError.message);
    }
  }, [endpoint]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    const timer = window.setInterval(() => load({ quiet: true }), 5000);
    return () => window.clearInterval(timer);
  }, [load]);

  useEffect(() => {
    if (!document.modelContext?.registerTool) return undefined;
    const lifecycle = new AbortController();
    Promise.resolve(document.modelContext.registerTool({ name: "send_family_message", title: "Send family message", description: "Append a permanent message or decision to the signed-in parent's family record.", inputSchema: { type: "object", properties: { content: { type: "string", minLength: 1, maxLength: 5000 }, messageType: { type: "string", enum: ["message", "decision"] } }, required: ["content", "messageType"], additionalProperties: false }, annotations: { readOnlyHint: false, untrustedContentHint: false }, async execute(input) { const result = await api("/messages", { method: "POST", body: JSON.stringify({ ...input, familyId: family._id }) }); setMessages((items) => [...items, result.message]); return { id: result.message._id, timestamp: result.message.timestamp }; } }, { signal: lifecycle.signal })).catch(() => {});
    return () => lifecycle.abort();
  }, [family._id]);

  const loadOlder = async () => {
    try {
      const data = await api(endpoint(cursor));
      setMessages((items) => [...data.messages, ...items]); setHasMore(data.hasMore); setCursor(data.nextCursor);
    } catch (loadError) { setError(loadError.message); }
  };

  const send = async (event) => {
    event.preventDefault();
    if (!content.trim()) return;
    setBusy(true); setError("");
    try {
      const attachments = file ? [(await uploadAsset(file)).asset] : [];
      const data = await api("/messages", { method: "POST", body: JSON.stringify({ familyId: family._id, content, messageType: type, attachments }) });
      setMessages((items) => [...items, data.message]); setContent(""); setFile(null);
      window.setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
    } catch (sendError) { setError(sendError.message); }
    finally { setBusy(false); }
  };

  return <div className="messages-page"><header className="message-header"><div><span className="eyebrow">PERMANENT FAMILY RECORD</span><h1>Messages & decisions</h1><p>{family.parents.map((parent) => parent.displayName).join(" and ")}</p></div><select aria-label="Filter messages" value={filter} onChange={(event) => setFilter(event.target.value)}><option value="">All entries</option><option value="message">Messages</option><option value="decision">Decisions</option></select></header>
    <div className="immutable-banner"><LockKeyhole size={18}/><div><strong>This thread is append-only</strong><span>Sent entries cannot be edited or deleted through this application or its API.</span></div><ShieldCheck size={22}/></div><ErrorNotice message={error}/>
    <section className="thread" aria-live="polite">{hasMore && <button className="button secondary load-more" onClick={loadOlder}>Load older entries</button>}{!messages.length && <Empty title="Start the family record">The first message or decision will receive a permanent server timestamp.</Empty>}{messages.map((message, index) => { const own = message.sender._id === user.id; const showDay = !messages[index - 1] || new Date(messages[index - 1].timestamp).toDateString() !== new Date(message.timestamp).toDateString(); return <div key={message._id}>{showDay && <div className="day-separator"><span>{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date(message.timestamp))}</span></div>}<article className={`message ${own ? "own" : "other"} ${message.messageType}`}><div className="avatar small">{initials(message.sender.displayName)}</div><div className="bubble"><div className="message-meta"><strong>{message.sender.displayName}</strong>{message.messageType === "decision" && <span>DECISION</span>}<time>{dateTime(message.timestamp)}</time></div><p>{message.content}</p>{message.attachments?.map((asset) => <a key={asset.publicId} href={asset.url} target="_blank" rel="noreferrer">{asset.originalName}</a>)}</div></article></div>; })}<div ref={bottomRef}/></section>
    <form className="composer" onSubmit={send}><div className="type-toggle"><button type="button" className={type === "message" ? "active" : ""} onClick={() => setType("message")}>Message</button><button type="button" className={type === "decision" ? "active decision" : ""} onClick={() => setType("decision")}>Record decision</button></div><textarea rows="3" maxLength="5000" required value={content} onChange={(event) => setContent(event.target.value)} placeholder={type === "decision" ? "Describe the decision clearly…" : "Write a message…"}/><div className="composer-actions"><label className="button secondary file-button"><FileUp size={17}/>{file ? file.name : "Attach file"}<input type="file" accept="image/*,.pdf" onChange={(event) => setFile(event.target.files[0])}/></label><span>{content.length}/5000</span><button className="button primary" disabled={busy || !content.trim()}>{busy ? "Sending…" : <><Send size={17}/> Send</>}</button></div></form>
  </div>;
}
