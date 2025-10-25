import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import IncomeExpense from "./pages/IncomeExpense";
import OPO from "./pages/OPO";
import Debt from "./pages/Debt";
import Reports from "./pages/Reports";
import Users from "./pages/Users";
import Layout from "./components/Layout";
import axios from "axios";
import { useEffect } from "react";
import Detail from "./pages/Detail";

function App() {
  const refreshToken = async () => {
    const storedRefreshToken = localStorage.getItem("refreshToken");
    if (!storedRefreshToken) return null;

    try {
      const res = await axios.post("/api/refresh-token", {
        refreshToken: storedRefreshToken,
      });

      const { token, expiresIn } = res.data;
      localStorage.setItem("token", token); // เก็บ JWT ใหม่
      return token;
    } catch (err) {
      console.error("Refresh token failed:", err);
      return null;
    }
  };
  useEffect(() => {
    const interval = setInterval(async () => {
      await refreshToken();
    }, 10 * 60 * 1000); // ทุก 10 นาที

    return () => clearInterval(interval);
  }, []);
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <Layout />
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="income-expense" element={<IncomeExpense />} />
          <Route path="opo" element={<OPO />} />
          <Route path="debt" element={<Debt />} />
          <Route path="reports" element={<Reports />} />
          <Route path="users" element={<Users />} />
          <Route path="details" element={<Detail />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

export default App;
