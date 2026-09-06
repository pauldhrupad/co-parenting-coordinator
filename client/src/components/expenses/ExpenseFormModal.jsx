import { ImagePlus } from "lucide-react";
import Modal from "../Modal";

export default function ExpenseFormModal({ family, userId, busy, onClose, onSubmit }) {
  return <Modal title="Propose an expense" description="Your co-parent must approve it before it affects the family balance." onClose={onClose}>
    <form className="form-stack" onSubmit={onSubmit}>
      <label>Expense title<input name="title" required minLength="2" maxLength="150" placeholder="School activity fee"/></label>
      <div className="form-row"><label>Amount (₹)<input name="amount" type="number" required min="0.01" step="0.01" placeholder="0.00"/></label><label>Child<select name="childId" required defaultValue=""><option value="" disabled>Select a child</option>{family.children.map((child) => <option key={child._id} value={child._id}>{child.fullName}</option>)}</select></label></div>
      <label>Paid by<select name="paidBy" defaultValue={userId} required>{family.parents.map((parent) => <option key={parent._id} value={parent._id}>{parent.displayName}</option>)}</select></label>
      <fieldset><legend>Split percentage</legend><div className="form-row"><label>{family.parents[0]?.displayName || "Parent 1"}<input name="parent1" type="number" min="0" max="100" step="0.01" defaultValue="50" required/></label><label>{family.parents[1]?.displayName || "Parent 2"}<input name="parent2" type="number" min="0" max="100" step="0.01" defaultValue="50" required/></label></div><small>The two percentages must total 100%.</small></fieldset>
      <label className="receipt-input"><span><ImagePlus size={18}/> Receipt image <small>(optional, max 8 MB)</small></span><input name="receipt" type="file" accept="image/*"/></label>
      <div className="split-preview"><span>Balance rule</span><strong>Only approved or settled amounts are counted.</strong></div>
      <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary" disabled={busy}>{busy ? "Uploading & saving…" : "Send for review"}</button></div>
    </form>
  </Modal>;
}
