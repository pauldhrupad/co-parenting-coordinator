import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import AuditTimeline from "../components/audit/AuditTimeline";
import { ErrorNotice, Loading } from "../components/Notice";
import { api } from "../lib/api";

export default function AuditPage() {
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => { api("/family/me").then((data) => data.family ? setFamily(data.family) : navigate("/create-family", { replace: true })).catch((loadError) => setError(loadError.message)); }, [navigate]);
  if (!family && !error) return <Loading/>;
  if (error) return <ErrorNotice message={error}/>;
  return <><header className="page-header"><div><span className="eyebrow">AUDIT LOG</span><h1>The complete family record</h1><p>Messages, decisions, custody changes, and expense transitions are preserved with before-and-after context.</p></div></header><AuditTimeline familyId={family._id}/></>;
}
