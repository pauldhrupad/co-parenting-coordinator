import { Clock3, RefreshCcw, UserRound } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { dateTime } from "../../lib/format";
import { childName, entityId, eventTypeLabel } from "./calendarUtils";

export default function CustodyEventModal({ event, family, user, onClose, onProposeSwap, onRespond, busy, error }) {
  const isAssignedParent = entityId(event.assignedParent) === entityId(user.id);
  const isRequester = entityId(event.requestedBy) === entityId(user.id);
  const canRespond = event.status === "pending-swap" && !isRequester;

  return <Modal
    title={eventTypeLabel(event.type)}
    description={`${childName(family, event.childId)} · ${dateTime(event.startDate)} – ${dateTime(event.endDate)}`}
    onClose={onClose}
  >
    {error && <div className="notice error" role="alert">{error}</div>}
    <div className="event-detail-hero">
      <div><UserRound size={18}/><span>Assigned parent</span><strong>{event.assignedParent?.displayName}</strong></div>
      <div><Clock3 size={18}/><span>Event status</span><StatusBadge status={event.status}/></div>
    </div>

    {event.status === "pending-swap" && <div className="swap-box">
      <span className="eyebrow">PROPOSED CHANGE</span>
      <p><strong>{dateTime(event.startDate)}</strong> to <strong>{dateTime(event.endDate)}</strong></p>
      <p>Requested by {event.requestedBy?.displayName}</p>
    </div>}

    <div className="modal-actions">
      {event.status === "confirmed" && !isAssignedParent && <button className="button primary" onClick={onProposeSwap}><RefreshCcw size={17}/> Propose swap</button>}
      {event.status === "confirmed" && isAssignedParent && <span className="permission-note">This event is assigned to you. Only the other parent can propose a swap.</span>}
      {event.status === "pending-swap" && isRequester && <span className="permission-note">Waiting for the assigned parent to respond.</span>}
      {canRespond && <>
        <button className="button danger" disabled={busy} onClick={() => onRespond("reject")}>Reject</button>
        <button className="button approve" disabled={busy} onClick={() => onRespond("accept")}>{busy ? "Updating…" : "Accept swap"}</button>
      </>}
    </div>
  </Modal>;
}
