import { useCallback, useEffect, useState } from "react";
import { Plus, RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";
import BalanceSummary from "../components/expenses/BalanceSummary";
import ExpenseDetailModal from "../components/expenses/ExpenseDetailModal";
import ExpenseFormModal from "../components/expenses/ExpenseFormModal";
import ExpenseList from "../components/expenses/ExpenseList";
import NoteModal from "../components/expenses/NoteModal";
import { entityId } from "../components/expenses/expenseUtils";
import { Empty, ErrorNotice, Loading, SuccessNotice } from "../components/Notice";
import { api, uploadReceipt } from "../lib/api";
import { useAuth } from "../lib/auth";

function friendlyError(error) {
  if (error.status === 401) return "Your session has expired. Please sign in again.";
  return error.message || "Expenses could not be loaded. Please try again.";
}

export default function ExpensesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [family, setFamily] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [summary, setSummary] = useState(null);
  const [filters, setFilters] = useState({ status: "", childId: "" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [busyId, setBusyId] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [noteState, setNoteState] = useState(null);

  const queryFor = useCallback(() => {
    const query = new URLSearchParams();
    if (filters.status) query.set("status", filters.status);
    if (filters.childId) query.set("childId", filters.childId);
    return query.toString();
  }, [filters]);

  const loadData = useCallback(async (familyId, quiet = false) => {
    if (!quiet) setRefreshing(true);
    const query = queryFor();
    try {
      const [expenseData, summaryData] = await Promise.all([
        api(`/expenses/${familyId}${query ? `?${query}` : ""}`),
        api(`/expenses/${familyId}/summary`),
      ]);
      setExpenses(expenseData.expenses);
      setSummary(summaryData.summary);
      setError("");
    } catch (loadError) {
      if (!quiet) setError(friendlyError(loadError));
    } finally {
      if (!quiet) setRefreshing(false);
    }
  }, [queryFor]);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const data = await api("/family/me");
        if (!data.family) return navigate("/create-family", { replace: true });
        if (!active) return;
        setFamily(data.family);
      } catch (loadError) {
        if (active) setError(friendlyError(loadError));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [navigate]);

  useEffect(() => {
    if (family) loadData(family._id);
  }, [family, loadData]);

  useEffect(() => {
    if (!family) return undefined;
    const interval = window.setInterval(() => loadData(family._id, true), 5000);
    const onFocus = () => loadData(family._id, true);
    window.addEventListener("focus", onFocus);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", onFocus); };
  }, [family, loadData]);

  const replaceExpense = (updated) => {
    setExpenses((current) => current.map((expense) => expense._id === updated._id ? updated : expense).filter((expense) => !filters.status || expense.status === filters.status));
    setSelected((current) => current?._id === updated._id ? updated : current);
  };

  const refreshSummary = async () => {
    const data = await api(`/expenses/${family._id}/summary`);
    setSummary(data.summary);
  };

  const createExpense = async (event) => {
    event.preventDefault(); setBusyId("create"); setError("");
    const values = new FormData(event.currentTarget);
    const parent1 = Number(values.get("parent1"));
    const parent2 = Number(values.get("parent2"));
    if (Math.abs(parent1 + parent2 - 100) > 0.000001) {
      setError("The two split percentages must add up to 100%."); setBusyId(""); return;
    }
    try {
      const receipt = values.get("receipt");
      const receiptUrl = receipt?.size ? (await uploadReceipt(receipt)).receiptUrl : null;
      await api("/expenses", { method: "POST", body: JSON.stringify({ familyId: family._id, childId: values.get("childId"), title: values.get("title"), amount: Number(values.get("amount")), paidBy: values.get("paidBy"), splitRatio: { parent1, parent2 }, receiptUrl }) });
      setFormOpen(false); setSuccess("Expense proposed. It will affect the balance only after review.");
      await loadData(family._id);
    } catch (saveError) { setError(friendlyError(saveError)); }
    finally { setBusyId(""); }
  };

  const approve = async (expense) => {
    setBusyId(expense._id); setError("");
    try {
      const data = await api(`/expenses/${expense._id}/approve`, { method: "PATCH" });
      replaceExpense(data.expense); await refreshSummary(); setSuccess("Expense approved and included in the family balance.");
    } catch (actionError) { setError(friendlyError(actionError)); }
    finally { setBusyId(""); }
  };

  const openDispute = (expense) => {
    setSelected(null);
    setNoteState({ mode: "dispute", expense });
  };

  const settle = async (expense) => {
    if (expense.status === "disputed") return setNoteState({ mode: "resolve", expense });
    setBusyId(expense._id); setError("");
    try {
      const data = await api(`/expenses/${expense._id}/settle`, { method: "PATCH" });
      replaceExpense(data.expense); await refreshSummary(); setSuccess("Expense marked as settled.");
    } catch (actionError) { setError(friendlyError(actionError)); }
    finally { setBusyId(""); }
  };

  const submitNote = async (event) => {
    event.preventDefault();
    const note = new FormData(event.currentTarget).get("note");
    const { expense, mode } = noteState;
    setBusyId(expense._id); setError("");
    try {
      const data = await api(`/expenses/${expense._id}/${mode === "dispute" ? "dispute" : "settle"}`, { method: "PATCH", body: JSON.stringify(mode === "dispute" ? { note } : { resolutionNote: note }) });
      replaceExpense(data.expense); await refreshSummary(); setNoteState(null);
      setSuccess(mode === "dispute" ? "Expense disputed. The reason is now part of its history." : "Resolution recorded and expense settled.");
    } catch (actionError) { setError(friendlyError(actionError)); }
    finally { setBusyId(""); }
  };

  if (loading || (family && !summary && refreshing)) return <Loading/>;
  if (!family) return <><ErrorNotice message={error}/><button className="button secondary" onClick={() => window.location.reload()}><RefreshCw size={16}/> Retry</button></>;

  return <>
    <header className="page-header"><div><span className="eyebrow">SHARED COSTS</span><h1>Family expenses</h1><p>Propose, review, resolve, and track every child-related cost in one clear record.</p></div><button className="button primary" onClick={() => setFormOpen(true)}><Plus size={17}/> Propose expense</button></header>
    <ErrorNotice message={error}/><SuccessNotice message={success}/>
    <BalanceSummary summary={summary} family={family}/>
    <section className="panel expense-panel">
      <div className="expense-toolbar"><div className="tabbar" role="tablist">{["", "proposed", "approved", "disputed", "settled"].map((status) => <button key={status} role="tab" aria-selected={filters.status === status} className={filters.status === status ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, status }))}>{status || "All"}</button>)}</div><label>Child<select value={filters.childId} onChange={(event) => setFilters((current) => ({ ...current, childId: event.target.value }))}><option value="">All children</option>{family.children.map((child) => <option key={child._id} value={child._id}>{child.fullName}</option>)}</select></label><button className="icon-button" aria-label="Refresh expenses" disabled={refreshing} onClick={() => loadData(family._id)}><RefreshCw size={17} className={refreshing ? "spin" : ""}/></button></div>
      {expenses.length ? <ExpenseList expenses={expenses} family={family} userId={user.id} onView={setSelected} onApprove={approve} onDispute={openDispute} busyId={busyId}/> : <Empty title="No expenses found">Propose the first family expense or choose a different filter.</Empty>}
    </section>
    {formOpen && <ExpenseFormModal family={family} userId={entityId(user)} busy={busyId === "create"} onClose={() => setFormOpen(false)} onSubmit={createExpense}/>} 
    {selected && <ExpenseDetailModal expense={selected} family={family} userId={user.id} busy={busyId === selected._id} onClose={() => setSelected(null)} onApprove={approve} onDispute={openDispute} onSettle={settle}/>} 
    {noteState && <NoteModal mode={noteState.mode} busy={busyId === noteState.expense._id} onClose={() => setNoteState(null)} onSubmit={submitNote}/>} 
  </>;
}
