import { useEffect, useState } from "react";
import { CalendarDays, IndianRupee, MessageSquareText, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../lib/api";
import { useAuth } from "../lib/auth";
import { dateTime, money } from "../lib/format";
import StatusBadge from "../components/StatusBadge";
import { Empty, ErrorNotice, Loading } from "../components/Notice";

export default function DashboardPage() {
  const { user } = useAuth(); const navigate = useNavigate();
  const [data, setData] = useState(null); const [error, setError] = useState("");
  useEffect(() => { api("/dashboard").then(setData).catch((err) => { if (err.status === 404) navigate("/create-family"); else setError(err.message); }); }, [navigate]);
  if (error) return <ErrorNotice message={error}/>;
  if (!data) return <Loading/>;
  const current = data.currentEvents[0]; const next = data.upcomingEvents[0];
  const childNames = (ids) => ids.map((id) => data.family.children.find((child) => child._id === id)?.fullName).filter(Boolean).join(", ");
  const cards = [
    { label: "Current custody", value: current ? `${childNames(current.childIds)} with ${current.custodialParent.displayName}` : "No active event", note: current ? `Until ${dateTime(current.endsAt)}` : "Check the calendar", tone: "blue" },
    { label: "Next event", value: next ? dateTime(next.startsAt) : "Nothing scheduled", note: next?.title || "Add a custody event", tone: "amber" },
    { label: "Needs your review", value: `${data.summary.needsReviewCount} expense${data.summary.needsReviewCount === 1 ? "" : "s"}`, note: `${money(data.summary.needsReviewMinor)} your share`, tone: "rose" },
    { label: "Approved & unsettled", value: money(data.summary.owedToMe + data.summary.owedByMe), note: `${data.summary.approvedCount} open expense${data.summary.approvedCount === 1 ? "" : "s"}`, tone: "teal" },
  ];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 18 ? "Good afternoon" : "Good evening";
  return <><header className="topbar"><div><span className="eyebrow">{new Intl.DateTimeFormat("en-IN", { weekday: "long", day: "numeric", month: "long" }).format(new Date()).toUpperCase()}</span><h1>{greeting}, {user.displayName.split(" ")[0]}</h1><p>Your family’s schedule, costs, and shared record—all in one calm view.</p></div><div className="header-actions"><Link className="button secondary" to="/calendar"><CalendarDays size={17}/> Add event</Link><Link className="button primary" to="/expenses"><Plus size={17}/> Add expense</Link></div></header>
    <section className="summary-grid" aria-label="Family overview">{cards.map((card) => <article className={`summary-card ${card.tone}`} key={card.label}><span>{card.label}</span><strong>{card.value}</strong><small>{card.note}</small></article>)}</section>
    <div className="dashboard-grid"><section className="panel"><div className="section-heading"><div><span className="eyebrow">SCHEDULE</span><h2>Coming up</h2></div><Link className="text-button" to="/calendar">View calendar →</Link></div>{data.upcomingEvents.length ? data.upcomingEvents.map((event) => <div className="timeline-item" key={event._id}><div className="date-block"><b>{new Date(event.startsAt).getDate()}</b><span>{new Intl.DateTimeFormat("en", { month: "short" }).format(new Date(event.startsAt)).toUpperCase()}</span></div><div><strong>{event.title}</strong><p>{childNames(event.childIds)} · {dateTime(event.startsAt)}</p><StatusBadge status={event.status}/></div></div>) : <Empty title="No upcoming custody events">Add the agreed schedule to keep handoffs visible.</Empty>}</section>
      <section className="panel attention"><div className="section-heading"><div><span className="eyebrow">EXPENSES</span><h2>Needs your review</h2></div><span className="count">{data.pendingExpenses.length}</span></div>{data.pendingExpenses.length ? data.pendingExpenses.map((expense) => <div className="expense-item" key={expense._id}><div className="expense-icon"><IndianRupee size={18}/></div><div><strong>{expense.title}</strong><p>{childNames(expense.childIds)} · {expense.category} · Paid by {expense.paidBy.displayName}</p></div><div className="amount"><strong>{money(expense.amountMinor)}</strong><small>Your share {money(expense.owedAmountMinor)}</small></div></div>) : <Empty title="You’re all caught up">No expense proposals need your response.</Empty>}<Link className="button secondary compact" to="/expenses">Review expenses</Link></section></div>
    <section className="panel activity"><div className="section-heading"><div><span className="eyebrow">RECORD</span><h2>Recent family activity</h2></div><Link className="text-button" to="/messages">Open messages →</Link></div>{data.activity.length ? data.activity.map((item) => <div className="activity-row" key={item.id}><div className={`dot ${item.type}`}/><p><strong>{item.actor}</strong> {item.text}</p><time>{dateTime(item.at)}</time></div>) : <Empty title="No activity yet">New messages and workflow decisions will appear here.</Empty>}</section>
  </>;
}
