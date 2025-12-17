"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import api from "../api/api"; // axios instance (withCredentials: true)

const AuthContext = createContext(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // =========================
  // Fetch current user
  // =========================
  const fetchUser = useCallback(async () => {
    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Run once on app start
  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // =========================
  // Login
  // =========================
  const login = async (email, password) => {
    await api.post("/api/auth/login", { email, password });
    await fetchUser(); // ✅ user มาจาก cookie
  };

  // =========================
  // Logout
  // =========================
  const logout = async () => {
    try {
      await api.post("/api/auth/logout"); // แนะนำให้ backend clear cookie
    } catch {}
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
