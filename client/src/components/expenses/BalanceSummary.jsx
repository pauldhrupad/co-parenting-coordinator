import { ArrowRight, Scale } from "lucide-react";
import { moneyAmount } from "../../lib/format";
import { monthLabel, parentName } from "./expenseUtils";

export default function BalanceSummary({ summary, family }) {
  if (!summary) return null;
  const { netBalance, perChild, perMonth } = summary;
  const settled = netBalance.amount === 0;
  return <section className="balance-layout">
    <article className="balance-hero">
      <div className="balance-icon"><Scale size={22}/></div>
      <span>Recognized family balance</span>
      {settled ? <><strong>All square</strong><p>No net amount is owed between parents.</p></> : <>
        <strong>{moneyAmount(netBalance.amount)}</strong>
        <p><b>{parentName(family, netBalance.debtorId)}</b> owes <b>{parentName(family, netBalance.creditorId)}</b></p>
        <div className="balance-direction"><span>{parentName(family, netBalance.debtorId)}</span><ArrowRight size={16}/><span>{parentName(family, netBalance.creditorId)}</span></div>
      </>}
      <small>Approved and settled expenses only</small>
    </article>
    <article className="breakdown-card">
      <header><div><span className="eyebrow">BREAKDOWN</span><h2>Spending by child</h2></div></header>
      <div className="breakdown-table"><div className="breakdown-head"><span>Child</span><span>Items</span><span>Total</span></div>{perChild.length ? perChild.map((row) => <div key={row.childId}><strong>{row.childName}</strong><span>{row.expenseCount}</span><strong>{moneyAmount(row.totalSpent)}</strong></div>) : <p className="compact-empty">No approved expenses yet.</p>}</div>
    </article>
    <article className="breakdown-card">
      <header><div><span className="eyebrow">MONTHLY VIEW</span><h2>Spending over time</h2></div></header>
      <div className="breakdown-table"><div className="breakdown-head"><span>Month</span><span>Items</span><span>Total</span></div>{perMonth.length ? perMonth.map((row) => <div key={row.month}><strong>{monthLabel(row.month)}</strong><span>{row.expenseCount}</span><strong>{moneyAmount(row.totalSpent)}</strong></div>) : <p className="compact-empty">Monthly totals will appear after approval.</p>}</div>
    </article>
  </section>;
}

