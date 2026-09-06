import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calendar as BigCalendar, dateFnsLocalizer } from "react-big-calendar";
import { format, getDay, parse, startOfWeek } from "date-fns";
import { enIN } from "date-fns/locale";
import { AlertTriangle, CalendarPlus, RefreshCw } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { api } from "../../lib/api";
import { toInputDateTime } from "../../lib/format";
import { SuccessNotice } from "../Notice";
import CustodyEventModal from "./CustodyEventModal";
import { CreateEventModal, SwapRequestModal } from "./CustodyEventForms";
import { applyAcceptedSwap, childName, entityId, eventTypeLabel, eventVisualStyle, friendlyCustodyError, toCalendarEvent } from "./calendarUtils";

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: (date) => startOfWeek(date, { weekStartsOn: 1 }),
  getDay,
  locales: { "en-IN": enIN },
});

function emptyForm() {
  return {
    childId: "",
    assignedParent: "",
    type: "regular",
    startDate: toInputDateTime(),
    endDate: toInputDateTime(new Date(Date.now() + 3600000)),
  };
}

export default function CustodyCalendar({ family, user }) {
  const [events, setEvents] = useState([]);
  const [filter, setFilter] = useState({ childId: "", status: "" });
  const [selected, setSelected] = useState(null);
  const [modal, setModal] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [actionError, setActionError] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const requestVersion = useRef(0);

  const fetchEvents = useCallback(async ({ silent = false } = {}) => {
    const version = ++requestVersion.current;
    if (!silent) setLoading(true);
    try {
      const query = new URLSearchParams(Object.entries(filter).filter(([, value]) => value));
      const data = await api(`/custody/${family._id}?${query}`);
      if (version !== requestVersion.current) return;
      setEvents(data.events);
      setLoadError("");
    } catch (error) {
      if (!silent && version === requestVersion.current) setLoadError(friendlyCustodyError(error));
    } finally {
      if (!silent && version === requestVersion.current) setLoading(false);
    }
  }, [family._id, filter]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  // Lightweight polling plus focus/visibility refresh keeps a second parent session current.
  useEffect(() => {
    const refreshInBackground = () => fetchEvents({ silent: true });
    const onVisibility = () => { if (document.visibilityState === "visible") refreshInBackground(); };
    const intervalId = window.setInterval(refreshInBackground, 5000);
    window.addEventListener("focus", refreshInBackground);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshInBackground);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [fetchEvents]);

  const calendarEvents = useMemo(() => events.map((event) => toCalendarEvent(event, family)), [events, family]);
  const closeModal = () => { setModal(null); setSelected(null); setActionError(""); };

  const openCreate = () => {
    setActionError("");
    setForm({ ...emptyForm(), childId: family.children[0]?._id || "", assignedParent: user.id });
    setModal("create");
  };

  const openSwap = () => {
    setActionError("");
    setForm({
      childId: selected.childId,
      assignedParent: user.id,
      type: "swap-request",
      startDate: toInputDateTime(new Date(selected.startDate)),
      endDate: toInputDateTime(new Date(selected.endDate)),
    });
    setModal("swap");
  };

  const createEvent = async (event) => {
    event.preventDefault();
    setBusy(true); setActionError("");
    try {
      const data = await api("/custody", { method: "POST", body: JSON.stringify({
        familyId: family._id,
        childId: form.childId,
        assignedParent: form.assignedParent,
        type: form.type,
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
      }) });
      setEvents((current) => [...current, data.event].sort((left, right) => new Date(left.startDate) - new Date(right.startDate)));
      closeModal();
      setSuccess("Custody event added without schedule conflicts.");
      fetchEvents({ silent: true });
    } catch (error) {
      setActionError(friendlyCustodyError(error));
    } finally { setBusy(false); }
  };

  const proposeSwap = async (event) => {
    event.preventDefault();
    setBusy(true); setActionError("");
    try {
      const data = await api(`/custody/${selected._id}/swap-request`, { method: "POST", body: JSON.stringify({
        startDate: new Date(form.startDate),
        endDate: new Date(form.endDate),
        assignedParent: form.assignedParent,
      }) });
      setEvents((current) => [...current, data.event].sort((left, right) => new Date(left.startDate) - new Date(right.startDate)));
      closeModal();
      setSuccess("Swap proposal sent. The original event remains confirmed until it is accepted.");
      fetchEvents({ silent: true });
    } catch (error) {
      setActionError(friendlyCustodyError(error));
    } finally { setBusy(false); }
  };

  const respondToSwap = async (action) => {
    setBusy(true); setActionError("");
    try {
      const pendingId = selected._id;
      const data = await api(`/custody/${pendingId}/respond`, { method: "PATCH", body: JSON.stringify({ action }) });
      setEvents((current) => action === "accept" ? applyAcceptedSwap(current, data.event) : current.filter((event) => entityId(event) !== entityId(pendingId)));
      closeModal();
      setSuccess(action === "accept" ? "Swap accepted. The confirmed event has moved to the proposed time." : "Swap rejected. The original event remains confirmed.");
      fetchEvents({ silent: true });
    } catch (error) {
      setActionError(friendlyCustodyError(error));
    } finally { setBusy(false); }
  };

  return <>
    <header className="page-header">
      <div>
        <span className="eyebrow">SHARED SCHEDULE</span>
        <h1>Custody calendar</h1>
        <p>One clear view of handoffs, holidays, and proposed changes—with overlap protection built in.</p>
      </div>
      <button className="button primary" onClick={openCreate}><CalendarPlus size={17}/> Add custody event</button>
    </header>

    <SuccessNotice message={success}/>

    <section className="panel calendar-panel">
      <div className="filterbar">
        <label>Child
          <select value={filter.childId} onChange={(event) => setFilter({ ...filter, childId: event.target.value })}>
            <option value="">All children</option>
            {family.children.map((child) => <option key={child._id} value={child._id}>{child.fullName}</option>)}
          </select>
        </label>
        <label>Status
          <select value={filter.status} onChange={(event) => setFilter({ ...filter, status: event.target.value })}>
            <option value="">All statuses</option>
            <option value="confirmed">Confirmed</option>
            <option value="pending-swap">Pending swap</option>
            <option value="disputed">Disputed</option>
          </select>
        </label>
        <div className="parent-legend" aria-label="Calendar color legend">
          {family.parents.map((parent, index) => <span key={parent._id}><i style={{ backgroundColor: ["#3f78b5", "#397863"][index] }}/>{parent.displayName}</span>)}
          <span><i className="dashed"/>Pending swap</span>
        </div>
      </div>

      {loading ? <CalendarSkeleton/> : loadError ? <CalendarError message={loadError} onRetry={() => fetchEvents()}/> : !events.length ? <CalendarEmpty onAdd={openCreate}/> : <BigCalendar
        localizer={localizer}
        events={calendarEvents}
        defaultView="month"
        views={["month", "week", "day", "agenda"]}
        culture="en-IN"
        startAccessor="start"
        endAccessor="end"
        onSelectEvent={(event) => { setSelected(event); setActionError(""); setModal("detail"); }}
        style={{ height: 650 }}
        eventPropGetter={(event) => ({ className: `calendar-event ${event.status}`, style: eventVisualStyle(event, family) })}
        components={{ event: ({ event }) => <span><strong>{eventTypeLabel(event.type)}</strong><small>{childName(family, event.childId)}</small></span> }}
      />}
    </section>

    {modal === "detail" && selected && <CustodyEventModal event={selected} family={family} user={user} onClose={closeModal} onProposeSwap={openSwap} onRespond={respondToSwap} busy={busy} error={actionError}/>} 
    {modal === "create" && <CreateEventModal family={family} form={form} setForm={setForm} onSubmit={createEvent} onClose={closeModal} busy={busy} error={actionError}/>} 
    {modal === "swap" && <SwapRequestModal family={family} form={form} setForm={setForm} onSubmit={proposeSwap} onClose={closeModal} busy={busy} error={actionError}/>} 
  </>;
}

function CalendarSkeleton() {
  return <div className="calendar-skeleton" aria-label="Loading custody events">
    <div className="skeleton-toolbar"/>
    <div className="skeleton-grid">{Array.from({ length: 28 }, (_, index) => <i key={index}/>)}</div>
  </div>;
}

function CalendarError({ message, onRetry }) {
  return <div className="calendar-state error-state" role="alert">
    <AlertTriangle size={30}/><strong>We couldn’t load the calendar</strong><p>{message}</p>
    <button className="button secondary" onClick={onRetry}><RefreshCw size={16}/> Try again</button>
  </div>;
}

function CalendarEmpty({ onAdd }) {
  return <div className="calendar-state">
    <CalendarPlus size={34}/><strong>Your shared calendar is ready</strong><p>Add the first confirmed custody event to begin the family schedule.</p>
    <button className="button primary" onClick={onAdd}>Add your first event</button>
  </div>;
}
