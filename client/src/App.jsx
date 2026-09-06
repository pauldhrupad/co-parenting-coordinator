import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import Shell from "./components/Shell";
import ProtectedRoute from "./components/ProtectedRoute";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import CalendarPage from "./pages/CalendarPage";
import ExpensesPage from "./pages/ExpensesPage";
import MessagesPage from "./pages/MessagesPage";
import CreateFamilyPage from "./pages/CreateFamilyPage";
import JoinFamilyPage from "./pages/JoinFamilyPage";
import AuditPage from "./pages/AuditPage";
import ExportPage from "./pages/ExportPage";

function AppRoutes() {
  const { user } = useAuth();
  return <Routes>
    <Route path="/login" element={user ? <Navigate to="/dashboard" replace /> : <LoginPage mode="login" />} />
    <Route path="/register" element={user ? <Navigate to="/create-family" replace /> : <LoginPage mode="register" />} />
    <Route element={<ProtectedRoute />}>
      <Route element={<Shell />}>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/expenses" element={<ExpensesPage />} />
        <Route path="/messages" element={<MessagesPage />} />
        <Route path="/audit" element={<AuditPage />} />
        <Route path="/export" element={<ExportPage />} />
        <Route path="/create-family" element={<CreateFamilyPage />} />
        <Route path="/join-family" element={<JoinFamilyPage />} />
      </Route>
    </Route>
    <Route path="*" element={<Navigate to="/dashboard" replace />} />
  </Routes>;
}

export default function App() {
  return <AuthProvider><AppRoutes /></AuthProvider>;
}
