import { Clock3, RefreshCcw } from "lucide-react";
import Modal from "../Modal";

export function CreateEventModal({ family, form, setForm, onSubmit, onClose, busy, error }) {
  return <Modal title="Add custody event" description="Confirmed events are checked for conflicts before saving." onClose={onClose}>
    <form className="form-stack" onSubmit={onSubmit}>
      {error && <div className="notice error" role="alert">{error}</div>}
      <div className="form-row">
        <label>Child
          <select required value={form.childId} onChange={(event) => setForm({ ...form, childId: event.target.value })}>
            {family.children.map((child) => <option key={child._id} value={child._id}>{child.fullName}</option>)}
          </select>
        </label>
        <label>Event type
          <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>
            <option value="regular">Regular custody</option>
            <option value="holiday">Holiday custody</option>
          </select>
        </label>
      </div>
      <label>Assigned parent
        <select required value={form.assignedParent} onChange={(event) => setForm({ ...form, assignedParent: event.target.value })}>
          {family.parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.displayName}</option>)}
        </select>
      </label>
      <DateRangeFields form={form} setForm={setForm}/>
      <div className="form-hint"><Clock3 size={17}/><span>Events may meet at their boundaries, but confirmed time cannot overlap for the same child.</span></div>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button className="button primary" disabled={busy}>{busy ? "Checking schedule…" : "Add confirmed event"}</button>
      </div>
    </form>
  </Modal>;
}

export function SwapRequestModal({ family, form, setForm, onSubmit, onClose, busy, error }) {
  return <Modal title="Propose a schedule swap" description="The original event remains confirmed until the assigned parent accepts." onClose={onClose}>
    <form className="form-stack" onSubmit={onSubmit}>
      {error && <div className="notice error" role="alert">{error}</div>}
      <DateRangeFields form={form} setForm={setForm}/>
      <label>Proposed assigned parent
        <select required value={form.assignedParent} onChange={(event) => setForm({ ...form, assignedParent: event.target.value })}>
          {family.parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.displayName}</option>)}
        </select>
      </label>
      <div className="modal-actions">
        <button type="button" className="button secondary" onClick={onClose}>Cancel</button>
        <button className="button primary" disabled={busy}>{busy ? "Sending…" : <><RefreshCcw size={17}/> Send proposal</>}</button>
      </div>
    </form>
  </Modal>;
}

function DateRangeFields({ form, setForm }) {
  return <div className="form-row">
    <label>Start<input type="datetime-local" required value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })}/></label>
    <label>End<input type="datetime-local" required value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })}/></label>
  </div>;
}
