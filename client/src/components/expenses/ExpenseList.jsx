import { ExternalLink, Image, ReceiptText } from "lucide-react";
import { moneyAmount, shortDate } from "../../lib/format";
import StatusBadge from "../StatusBadge";
import { childName, entityId } from "./expenseUtils";

const sections = [
  ["proposed", "Proposed", "Waiting for review"],
  ["approved", "Approved", "Accepted and included in the balance"],
  ["disputed", "Disputed", "Needs a manual resolution"],
  ["settled", "Settled", "Closed family records"],
];

export default function ExpenseList({ expenses, family, userId, onView, onApprove, onDispute, busyId }) {
  return <div className="expense-groups">{sections.map(([status, title, description]) => {
    const items = expenses.filter((expense) => expense.status === status);
    if (!items.length) return null;
    return <section className="expense-group" key={status}>
      <header><div><h2>{title}</h2><p>{description}</p></div><span className="group-count">{items.length}</span></header>
      <div className="expense-card-grid">{items.map((expense) => {
        const mayReview = status === "proposed" && entityId(expense.proposedBy) !== entityId(userId);
        return <article className="expense-card" key={expense._id}>
          <button className="expense-card-main" onClick={() => onView(expense)}>
            <div className={`receipt-visual ${expense.receiptUrl ? "has-image" : ""}`}>{expense.receiptUrl ? <img src={expense.receiptUrl} alt="Receipt"/> : <ReceiptText size={23}/>}</div>
            <div className="expense-copy"><div className="expense-card-top"><StatusBadge status={expense.status}/><time>{shortDate(expense.createdAt)}</time></div><h3>{expense.title}</h3><p>{childName(family, expense.childId)} · Paid by {expense.paidBy.displayName}</p><strong>{moneyAmount(expense.amount)}</strong></div>
          </button>
          <footer>{expense.receiptUrl ? <a href={expense.receiptUrl} target="_blank" rel="noreferrer"><Image size={15}/> Receipt <ExternalLink size={12}/></a> : <span>No receipt attached</span>}<div className="expense-actions">{mayReview && <><button className="button approve compact" disabled={busyId === expense._id} onClick={() => onApprove(expense)}>Approve</button><button className="button danger compact" disabled={busyId === expense._id} onClick={() => onDispute(expense)}>Dispute</button></>}<button className="text-button" onClick={() => onView(expense)}>Details</button></div></footer>
        </article>;
      })}</div>
    </section>;
  })}</div>;
}

