import { CalendarDays, Download, FileClock, IndianRupee, LayoutDashboard, LogOut, MessageSquareText, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../lib/auth";
import { api } from "../lib/api";
import { initials } from "../lib/format";

const nav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/calendar", label: "Calendar", icon: CalendarDays, badgeKey: "pendingSwaps" },
  { to: "/expenses", label: "Expenses", icon: IndianRupee, badgeKey: "proposedExpenses" },
  { to: "/messages", label: "Messages", icon: MessageSquareText },
  { to: "/audit", label: "Audit trail", icon: FileClock },
  { to: "/export", label: "Export", icon: Download },
];

export default function Shell() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [pending, setPending] = useState({ pendingSwaps: 0, proposedExpenses: 0 });
  useEffect(() => {
    let active = true;
    const refresh = () => api("/notifications/pending-count").then((data) => { if (active) setPending(data.counts); }).catch(() => {});
    refresh();
    const timer = window.setInterval(refresh, 45000);
    return () => { active = false; window.clearInterval(timer); };
  }, [location.pathname]);
  return <div className="app-shell">
    <aside className="sidebar">
      <div className="brand"><Scale size={22}/><span>CoParent</span></div>
      <div className="family-switcher"><small>YOUR FAMILY SPACE</small><strong><i className="online-dot"/> Shared family record</strong><span>One place. One clear history.</span></div>
      <nav aria-label="Primary navigation">{nav.map(({ to, label, icon: Icon, end, badgeKey }) => <NavLink key={to} to={to} end={end}><Icon size={18}/>{label}{badgeKey && pending[badgeKey] > 0 && <span className="nav-badge" aria-label={`${pending[badgeKey]} pending`}>{pending[badgeKey] > 99 ? "99+" : pending[badgeKey]}</span>}</NavLink>)}</nav>
      <div className="profile"><div className="avatar">{initials(user?.displayName)}</div><div><strong>{user?.displayName}</strong><small>Parent account</small></div><button onClick={logout} className="icon-button dark" aria-label="Log out" title="Log out"><LogOut size={17}/></button></div>
    </aside>
    <main><Outlet /></main>
  </div>;
}
