import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CustodyCalendar from "../components/calendar/CustodyCalendar";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { Loading } from "../components/Notice";
import { friendlyCustodyError } from "../components/calendar/calendarUtils";

export default function CalendarPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadFamily = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await api("/family/me");
      if (!data.family) return navigate("/create-family", { replace: true });
      setFamily(data.family);
    } catch (loadError) {
      setError(friendlyCustodyError(loadError));
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => { loadFamily(); }, [loadFamily]);

  if (loading) return <Loading/>;
  if (error) return <div className="calendar-state page-load-error" role="alert">
    <AlertTriangle size={32}/>
    <strong>The family calendar is unavailable</strong>
    <p>{error}</p>
    <button className="button secondary" onClick={loadFamily}><RefreshCw size={16}/> Try again</button>
  </div>;
  if (!family) return null;

  return <CustodyCalendar family={family} user={user}/>;
}
