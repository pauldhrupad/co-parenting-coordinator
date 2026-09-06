import { useState } from "react";
import { KeyRound } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorNotice } from "../components/Notice";

export default function JoinFamilyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { await api(`/family/join/${code.trim().toUpperCase()}`, { method: "POST" }); navigate("/dashboard", { replace: true }); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="onboarding-page"><form className="invite-card" onSubmit={submit}><div className="invite-icon"><KeyRound size={28}/></div><span className="eyebrow">JOIN A FAMILY</span><h1>Enter your invite code</h1><p>Ask the parent who created the family for their six-character code.</p><ErrorNotice message={error}/><label className="code-label">Invite code<input autoFocus required minLength="6" maxLength="6" pattern="[A-Za-z0-9]{6}" value={code} onChange={(e) => setCode(e.target.value.replace(/[^a-z0-9]/gi, "").toUpperCase())} placeholder="ABC123" aria-describedby="code-help"/></label><small id="code-help">Codes are not case-sensitive.</small><button className="button primary full" disabled={busy || code.length !== 6}>{busy ? "Joining…" : "Join family"}</button><Link className="text-button" to="/create-family">Create a new family instead</Link></form></div>;
}
