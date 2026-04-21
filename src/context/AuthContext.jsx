"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import api from "../api/api";

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
  
  // ✅ ย้าย useRef ขึ้นมาก่อน fetchUser
  const lastFetch = useRef(0);

  const fetchUser = useCallback(async () => {
    const now = Date.now();
    if (now - lastFetch.current < 30_000) return;
    lastFetch.current = now;

    try {
      const { data } = await api.get("/api/auth/me");
      setUser(data);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // ✅ useEffect เดียว ครอบคลุม mount + window focus
  useEffect(() => {
    fetchUser();
    const handleFocus = () => fetchUser();
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchUser]);

  const login = async (email, password) => {
    const { data } = await api.post("/api/auth/login", { email, password });
    if (data.requiresTwoFactor) {
      return { requiresTwoFactor: true };
    }
    // ✅ reset lastFetch ก่อน fetchUser เพื่อให้ดึงได้ทันที
    lastFetch.current = 0;
    await fetchUser();
    return { success: true };
  };

  const verifyTwoFactor = async (code) => {
    await api.post("/api/auth/user/verify-2fa", { code });
    lastFetch.current = 0; // ✅ reset ก่อนดึงใหม่
    await fetchUser();
  };

  const logout = async () => {
    try {
      await api.post("/api/auth/logout");
    } catch {}
    setUser(null);
    window.location.href = "/login";
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        fetchUser,
        verifyTwoFactor,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};