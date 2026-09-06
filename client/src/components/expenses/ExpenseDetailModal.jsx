import { ExternalLink, FileImage } from "lucide-react";
import Modal from "../Modal";
import StatusBadge from "../StatusBadge";
import { moneyAmount, shortDate } from "../../lib/format";
import { childName, entityId, latestDispute } from "./expenseUtils";

export default function ExpenseDetailModal({ expense, family, userId, busy, onClose, onApprove, onDispute, onSettle }) {
  const dispute = latestDispute(expense);
  const mayReview = expense.status === "proposed" && entityId(expense.proposedBy) !== entityId(userId);
  return <Modal title={expense.title} description={`${childName(family, expense.childId)} · proposed ${shortDate(expense.createdAt)}`} onClose={onClose}>
    {expense.receiptUrl && <a className="receipt-preview" href={expense.receiptUrl} target="_blank" rel="noreferrer"><img src={expense.receiptUrl} alt="Expense receipt"/><span><FileImage size={16}/> Open receipt <ExternalLink size={13}/></span></a>}
    <div className="detail-list"><div><span>Amount</span><strong>{moneyAmount(expense.amount)}</strong></div><div><span>Paid by</span><strong>{expense.paidBy.displayName}</strong></div><div><span>Proposed by</span><strong>{expense.proposedBy.displayName}</strong></div><div><span>Split</span><strong>{expense.splitRatio.parent1}% / {expense.splitRatio.parent2}%</strong></div><div><span>Status</span><StatusBadge status={expense.status}/></div>{dispute && <div><span>Dispute reason</span><strong>{dispute.note}</strong></div>}{expense.resolutionNote && <div><span>Resolution</span><strong>{expense.resolutionNote}</strong></div>}{expense.settledAt && <div><span>Settled</span><strong>{shortDate(expense.settledAt)} by {expense.settledBy?.displayName}</strong></div>}</div>
    <div className="modal-actions">{mayReview && <><button className="button danger" disabled={busy} onClick={() => onDispute(expense)}>Dispute</button><button className="button approve" disabled={busy} onClick={() => onApprove(expense)}>Approve</button></>}{expense.status === "approved" && <button className="button primary" disabled={busy} onClick={() => onSettle(expense)}>Mark settled</button>}{expense.status === "disputed" && <button className="button primary" disabled={busy} onClick={() => onSettle(expense)}>Resolve & settle</button>}</div>
  </Modal>;
}

