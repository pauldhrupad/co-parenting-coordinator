import { useState } from "react";
import { CalendarDays, CheckCircle2, IndianRupee, MessageSquareText, Scale } from "lucide-react";
import { useAuth } from "../lib/auth";
import { ErrorNotice } from "../components/Notice";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";

export default function LoginPage({ mode = "login" }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: mode === "login" ? "dhruv@example.com" : "", password: mode === "login" ? "Demo1234!" : "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (event) => {
    event.preventDefault(); setError(""); setBusy(true);
    try {
      if (mode === "login") {
        await login(form.email, form.password);
        const { family } = await api("/family/me");
        navigate(family?.parents?.length === 2 ? "/dashboard" : family ? "/create-family" : "/create-family", { replace: true });
      } else {
        await register(form.name, form.email, form.password);
        navigate("/create-family", { replace: true });
      }
    }
    catch (err) { setError(err.message); } finally { setBusy(false); }
  };
  return <div className="auth-page">
    <section className="auth-intro">
      <div className="brand large"><Scale size={28}/><span>CoParent</span></div>
      <div className="auth-copy"><span className="eyebrow light">A CALMER WAY TO CO-PARENT</span><h1>Less friction.<br/>More clarity for your family.</h1><p>Keep schedules, shared costs, and important decisions in one dependable family space.</p>
        <ul><li><CalendarDays/> Shared custody calendar</li><li><IndianRupee/> Transparent expense approval</li><li><MessageSquareText/> Permanent communication log</li><li><CheckCircle2/> Timestamped activity history</li></ul>
      </div>
      <small>Built for two parents · Designed around one shared record</small>
    </section>
    <section className="auth-panel"><form className="auth-card" onSubmit={submit}>
      <span className="eyebrow">{mode === "login" ? "WELCOME BACK" : "GET STARTED"}</span><h2>{mode === "login" ? "Sign in to your family space" : "Create your parent account"}</h2><p>{mode === "login" ? "Everything your family has shared is waiting for you." : "Create your space first, then invite your co-parent with a private code."}</p>
      <ErrorNotice message={error}/>
      {mode === "register" && <label>Full name<input required minLength="2" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}/></label>}
      <label>Email address<input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/></label>
      <label>Password<input type="password" required minLength="8" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}/></label>
      <button className="button primary full" disabled={busy}>{busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}</button>
      {mode === "login" && <div className="demo-note"><strong>Demo account</strong><span>dhruv@example.com</span><span>Password: Demo1234!</span></div>}
      <Link className="text-button switch" to={mode === "login" ? "/register" : "/login"}>{mode === "login" ? "Need an account? Register" : "Already registered? Sign in"}</Link>
    </form></section>
  </div>;
}
