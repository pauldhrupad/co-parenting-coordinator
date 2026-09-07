import { AlertTriangle, CalendarDays, Download, FileClock, IndianRupee, LayoutDashboard, LogOut, MessageSquareText, Scale, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { initials } from "../lib/format";
import Modal from "./Modal";
import { ErrorNotice } from "./Notice";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, badgeKey: "pendingSwaps" },
  { to: "/expenses", label: "Expenses", icon: IndianRupee, badgeKey: "proposedExpenses" },
  { to: "/messages", label: "Messages", icon: MessageSquareText },
  { to: "/audit", label: "Audit trail", icon: FileClock },
  { to: "/export", label: "Export", icon: Download },
];

export default function Shell() {
  const { user, logout, deleteAccount } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState({ pendingSwaps: 0, proposedExpenses: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => api("/notifications/pending-count").then((data) => { if (active) setPending(data.counts); }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 45000);
    return () => { active = false; window.clearInterval(timer); };
  }, [location.pathname]);
  const closeDelete = () => { if (!deleting) { setDeleteOpen(false); setDeletePassword(""); setDeleteConfirmation(""); setDeleteError(""); } };
  const submitDeletion = async (event) => {
    event.preventDefault(); setDeleteError("");
    if (deleteConfirmation !== "DELETE") return setDeleteError('Type DELETE exactly to continue.');
    setDeleting(true);
    try {
      await deleteAccount(deletePassword);
      navigate("/login", { replace: true });
    } catch (error) {
      setDeleteError(error.message);
    } finally {
      setDeleting(false);
    }
  };
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Scale size={22}/><span>CoParent</span></div>
      <div className="family-switcher"><small>YOUR FAMILY SPACE</small><strong><i className="online-dot"/> Shared family record</strong><span>One place. One clear history.</span></div>
      <nav aria-label="Primary navigation">{nav.map(({ to, label, icon: Icon, end, badgeKey }) => <NavLink key={to} to={to} end={end}><Icon size={18}/>{label}{badgeKey && pending[badgeKey] > 0 && <span className="nav-badge" aria-label={`${pending[badgeKey]} pending`}>{pending[badgeKey] > 99 ? "99+" : pending[badgeKey]}</span>}</NavLink>)}</nav>
      <div className="profile"><div className="avatar">{initials(user?.displayName)}</div><div><strong>{user?.displayName}</strong><small>Parent account</small></div><div className="profile-actions"><button onClick={() => setDeleteOpen(true)} className="icon-button dark danger" aria-label="Delete account" title="Delete account"><Trash2 size={16}/></button><button onClick={logout} className="icon-button dark" aria-label="Log out" title="Log out"><LogOut size={17}/></button></div></div>
    </aside>
    <main><Outlet /></main>
    {deleteOpen && <Modal title="Delete your account" description="This action permanently ends your access to CoParent." onClose={closeDelete}>
      <form className="form-stack" onSubmit={submitDeletion}>
        <div className="account-delete-note"><AlertTriangle size={19}/><p>Your family records, messages, approvals, and audit history will remain preserved. Only your account access is deactivated.</p></div>
        <ErrorNotice message={deleteError}/>
        <label>Current password<input type="password" value={deletePassword} onChange={(event) => setDeletePassword(event.target.value)} autoComplete="current-password" required disabled={deleting}/></label>
        <label>Type <strong>DELETE</strong> to confirm<input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} autoComplete="off" required disabled={deleting}/></label>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={closeDelete} disabled={deleting}>Cancel</button><button className="button danger" disabled={deleting}>{deleting ? "Deleting account…" : "Delete my account"}</button></div>
      </form>
    </Modal>}
  </div>;
}
