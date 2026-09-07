import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "./api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(Boolean(sessionStorage.getItem("coparent_token")));
  useEffect(() => {
    if (!sessionStorage.getItem("coparent_token")) return;
    api("/auth/me").then(({ user: value }) => setUser(value)).catch(() => sessionStorage.removeItem("coparent_token")).finally(() => setLoading(false));
  }, []);
  const value = useMemo(() => ({
    user, loading,
    async login(email, password) {
      const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
      sessionStorage.setItem("coparent_token", data.token); setUser(data.user);
    },
    async register(name, email, password) {
      const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
      sessionStorage.setItem("coparent_token", data.token); setUser(data.user);
    },
    async deleteAccount(password) {
      await api("/auth/me", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE", password }) });
      sessionStorage.removeItem("coparent_token"); setUser(null);
    },
    async updateProfile(name, email, password) {
      const data = await api("/auth/me", { method: "PATCH", body: JSON.stringify({ name, email, password }) });
      setUser(data.user);
      return data.user;
    },
    logout() { sessionStorage.removeItem("coparent_token"); setUser(null); },
  }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
