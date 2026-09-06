import { useEffect, useState } from "react";
import { Download, FileSpreadsheet, FileText, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ErrorNotice, Loading, SuccessNotice } from "../components/Notice";
import { api, downloadApi } from "../lib/api";

const toDateInput = (date) => new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default function ExportPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [format, setFormat] = useState("pdf");
  const [startDate, setStartDate] = useState(() => { const date = new Date(); date.setDate(date.getDate() - 30); return toDateInput(date); });
  const [endDate, setEndDate] = useState(() => toDateInput(new Date()));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => { api("/family/me").then((data) => data.family ? setFamily(data.family) : navigate("/create-family", { replace: true })).catch((loadError) => setError(loadError.message)); }, [navigate]);

  const download = async (event) => {
    event.preventDefault(); setBusy(true); setError(""); setSuccess("");
    if (endDate < startDate) { setError("End date must be on or after the start date."); setBusy(false); return; }
    try {
      const query = new URLSearchParams({ startDate, endDate, format });
      const { blob, filename } = await downloadApi(`/export/${family._id}?${query}`);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
      setSuccess(`${format.toUpperCase()} history downloaded successfully.`);
    } catch (downloadError) { setError(downloadError.message); }
    finally { setBusy(false); }
  };

  if (!family && !error) return <Loading/>;
  return <><header className="page-header"><div><span className="eyebrow">PORTABLE FAMILY RECORD</span><h1>Export history</h1><p>Download messages and audited actions for a selected period.</p></div></header><ErrorNotice message={error}/><SuccessNotice message={success}/>{family && <section className="export-layout"><form className="export-card" onSubmit={download}><div className="export-icon"><Download size={23}/></div><h2>Create an export</h2><p>All matching entries are ordered from oldest to newest.</p><div className="form-row"><label>Start date<input type="date" required value={startDate} max={endDate} onChange={(event) => setStartDate(event.target.value)}/></label><label>End date<input type="date" required value={endDate} min={startDate} onChange={(event) => setEndDate(event.target.value)}/></label></div><fieldset><legend>File format</legend><div className="format-toggle"><label className={format === "pdf" ? "selected" : ""}><input type="radio" name="format" value="pdf" checked={format === "pdf"} onChange={() => setFormat("pdf")}/><FileText size={20}/><span><strong>PDF document</strong><small>Polished and ready to print</small></span></label><label className={format === "csv" ? "selected" : ""}><input type="radio" name="format" value="csv" checked={format === "csv"} onChange={() => setFormat("csv")}/><FileSpreadsheet size={20}/><span><strong>CSV spreadsheet</strong><small>Easy to filter and analyze</small></span></label></div></fieldset><button className="button primary export-button" disabled={busy}>{busy ? "Preparing download…" : <><Download size={17}/> Download {format.toUpperCase()}</>}</button></form><aside className="export-note"><ShieldCheck size={25}/><h2>What is included?</h2><ul><li>Messages and recorded decisions</li><li>Expense proposals, approvals, disputes, and settlements</li><li>Custody events and swap outcomes</li><li>Actor names and exact server timestamps</li></ul><p>Only members of <strong>{family.name}</strong> can generate this export.</p></aside></section>}</>;
}
