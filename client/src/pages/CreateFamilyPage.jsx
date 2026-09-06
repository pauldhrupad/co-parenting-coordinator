import { useEffect, useState } from "react";
import { Check, Copy, Plus, Trash2, Users } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { ErrorNotice, Loading } from "../components/Notice";

export default function CreateFamilyPage() {
  const navigate = useNavigate();
  const [existing, setExisting] = useState(undefined);
  const [name, setName] = useState("");
  const [children, setChildren] = useState([{ name: "", dob: "" }]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    api("/family/me").then(({ family }) => {
      if (family?.parents?.length === 2) navigate("/dashboard", { replace: true });
      else setExisting(family || null);
    }).catch((err) => setError(err.message));
  }, [navigate]);

  const submit = async (event) => {
    event.preventDefault(); setBusy(true); setError("");
    try { const data = await api("/family/create", { method: "POST", body: JSON.stringify({ name, children }) }); setExisting(data.family); }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };

  if (existing === undefined && !error) return <Loading/>;
  if (existing) return <div className="onboarding-page"><section className="invite-card"><div className="invite-icon"><Users size={28}/></div><span className="eyebrow">FAMILY CREATED</span><h1>Invite your co-parent</h1><p>Share this code with the second parent. Once they join, both accounts will open the same family dashboard.</p><div className="invite-code" aria-label={`Invite code ${existing.inviteCode}`}><strong>{existing.inviteCode}</strong><button className="icon-button" onClick={async () => { await navigator.clipboard.writeText(existing.inviteCode); setCopied(true); }} aria-label="Copy invite code">{copied ? <Check size={19}/> : <Copy size={19}/>}</button></div><p className="security-note">Only share this code directly with your co-parent. A family can contain at most two parents.</p><button className="button secondary" onClick={() => window.location.reload()}>Check whether they joined</button></section></div>;

  return <div className="narrow-page"><header className="page-header"><div><span className="eyebrow">FAMILY ONBOARDING</span><h1>Create a family space</h1><p>Add your children now, then invite the second parent with a private six-character code.</p></div></header><form className="panel form-stack" onSubmit={submit}><ErrorNotice message={error}/><label>Family name<input required minLength="2" maxLength="100" value={name} onChange={(e) => setName(e.target.value)} placeholder="The Sharma Family"/></label><fieldset><legend>Children</legend>{children.map((child, index) => <div className="form-row child-row" key={index}><label>Child’s name<input required value={child.name} onChange={(e) => setChildren(children.map((item, i) => i === index ? { ...item, name: e.target.value } : item))}/></label><label>Date of birth<input type="date" required value={child.dob} onChange={(e) => setChildren(children.map((item, i) => i === index ? { ...item, dob: e.target.value } : item))}/></label>{children.length > 1 && <button type="button" className="icon-button danger" aria-label="Remove child" onClick={() => setChildren(children.filter((_, i) => i !== index))}><Trash2 size={18}/></button>}</div>)}</fieldset><button type="button" className="button secondary align-start" onClick={() => setChildren([...children, { name: "", dob: "" }])}><Plus size={17}/> Add another child</button><div className="onboarding-actions"><Link className="text-button" to="/join-family">I have an invite code</Link><button className="button primary" disabled={busy}>{busy ? "Creating…" : "Create family"}</button></div></form></div>;
}
