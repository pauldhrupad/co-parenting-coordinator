import { AlertTriangle, CalendarDays, Download, Ellipsis, FileClock, IndianRupee, LayoutDashboard, LogOut, MessageSquareText, Moon, Pencil, Scale, Sun, Trash2, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { initials } from "../lib/format";
import Modal from "./Modal";
import { ErrorNotice } from "./Notice";
import { useTheme } from "../lib/theme";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, badgeKey: "pendingSwaps" },
  { to: "/expenses", label: "Expenses", icon: IndianRupee, badgeKey: "proposedExpenses" },
  { to: "/messages", label: "Messages", icon: MessageSquareText },
  { to: "/audit", label: "Audit trail", icon: FileClock },
  { to: "/export", label: "Export", icon: Download },
];

export default function Shell() {
  const { user, logout, deleteAccount, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const location = useLocation();
  const navigate = useNavigate();
  const [pending, setPending] = useState({ pendingSwaps: 0, proposedExpenses: 0 });
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileEmail, setProfileEmail] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [profileError, setProfileError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  useEffect(() => {
    let active = true;
    const refresh = () => api("/notifications/pending-count").then((data) => { if (active) setPending(data.counts); }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 45000);
    return () => { active = false; window.clearInterval(timer); };
  }, [location.pathname]);
  useEffect(() => {
    if (!accountMenuOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!event.target.closest(".account-menu") && !event.target.closest("[data-account-trigger]")) setAccountMenuOpen(false);
    };
    const closeOnEscape = (event) => { if (event.key === "Escape") setAccountMenuOpen(false); };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [accountMenuOpen]);
  const closeDelete = () => { if (!deleting) { setDeleteOpen(false); setDeletePassword(""); setDeleteConfirmation(""); setDeleteError(""); } };
  const openProfile = () => { setAccountMenuOpen(false); setProfileName(user?.displayName || ""); setProfileEmail(user?.email || ""); setProfilePassword(""); setProfileError(""); setProfileOpen(true); };
  const closeProfile = () => { if (!savingProfile) { setProfileOpen(false); setProfilePassword(""); setProfileError(""); } };
  const submitProfile = async (event) => {
    event.preventDefault(); setProfileError(""); setSavingProfile(true);
    try { await updateProfile(profileName, profileEmail, profilePassword); closeProfile(); }
    catch (error) { setProfileError(error.message); }
    finally { setSavingProfile(false); }
  };
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
      <button data-account-trigger className="mobile-account-trigger icon-button dark" onClick={() => setAccountMenuOpen((value) => !value)} aria-label="Open account menu" aria-expanded={accountMenuOpen}><UserRound size={17}/></button>
      <div className="family-switcher"><small>YOUR FAMILY SPACE</small><strong><i className="online-dot"/> Shared family record</strong><span>One place. One clear history.</span></div>
      <nav aria-label="Primary navigation">{nav.map(({ to, label, icon: Icon, end, badgeKey }) => <NavLink key={to} to={to} end={end}><Icon size={18}/>{label}{badgeKey && pending[badgeKey] > 0 && <span className="nav-badge" aria-label={`${pending[badgeKey]} pending`}>{pending[badgeKey] > 99 ? "99+" : pending[badgeKey]}</span>}</NavLink>)}</nav>
      <div className="profile"><div className="avatar">{initials(user?.displayName)}</div><div className="profile-copy"><strong title={user?.displayName}>{user?.displayName}</strong><small>Parent account</small></div><button data-account-trigger onClick={() => setAccountMenuOpen((value) => !value)} className="icon-button dark account-trigger" aria-label="Open account menu" aria-expanded={accountMenuOpen} title="Account settings"><Ellipsis size={19}/></button></div>
      {accountMenuOpen && <div className="account-menu" role="group" aria-label="Account settings">
        <header><div className="account-menu-avatar">{initials(user?.displayName)}</div><div><strong>{user?.displayName}</strong><span>{user?.email}</span></div></header>
        <button onClick={openProfile}><Pencil size={17}/><span><strong>Edit profile</strong><small>Update your name and email</small></span></button>
        <button onClick={() => { toggleTheme(); setAccountMenuOpen(false); }}>{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}<span><strong>Appearance</strong><small>Switch to {theme === "dark" ? "light" : "dark"} theme</small></span></button>
        <div className="account-menu-divider"/>
        <button onClick={() => { setAccountMenuOpen(false); logout(); }}><LogOut size={17}/><span><strong>Sign out</strong><small>End this session safely</small></span></button>
        <button className="danger" onClick={() => { setAccountMenuOpen(false); setDeleteOpen(true); }}><Trash2 size={17}/><span><strong>Delete account</strong><small>Permanently end account access</small></span></button>
      </div>}
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
    {profileOpen && <Modal title="Edit profile" description="Update how your name and email appear in your family space." onClose={closeProfile}>
      <form className="form-stack" onSubmit={submitProfile}>
        <ErrorNotice message={profileError}/>
        <label>Display name<input value={profileName} onChange={(event) => setProfileName(event.target.value)} maxLength="80" required disabled={savingProfile}/></label>
        <label>Email address<input type="email" value={profileEmail} onChange={(event) => setProfileEmail(event.target.value)} maxLength="254" required disabled={savingProfile}/></label>
        <label>Current password <small>Required only when changing your email address.</small><input type="password" value={profilePassword} onChange={(event) => setProfilePassword(event.target.value)} autoComplete="current-password" disabled={savingProfile}/></label>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={closeProfile} disabled={savingProfile}>Cancel</button><button className="button primary" disabled={savingProfile}>{savingProfile ? "Saving…" : "Save profile"}</button></div>
      </form>
    </Modal>}
  </div>;
}
