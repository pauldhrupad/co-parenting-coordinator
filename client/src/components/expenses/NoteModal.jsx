import Modal from "../Modal";

export default function NoteModal({ mode, busy, onClose, onSubmit }) {
  const resolving = mode === "resolve";
  return <Modal title={resolving ? "Record the resolution" : "Dispute this expense"} description={resolving ? "Explain how both parents resolved the disputed amount before closing it." : "Give a clear reason so the proposer knows what needs attention."} onClose={onClose}>
    <form className="form-stack" onSubmit={onSubmit}><label>{resolving ? "Resolution note" : "Reason for dispute"}<textarea name="note" rows="5" maxLength="1000" required autoFocus placeholder={resolving ? "We reviewed the receipt and agreed that…" : "I’m disputing this because…"}/></label><div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className={`button ${resolving ? "primary" : "danger"}`} disabled={busy}>{busy ? "Saving…" : resolving ? "Resolve & settle" : "Submit dispute"}</button></div></form>
  </Modal>;
}
