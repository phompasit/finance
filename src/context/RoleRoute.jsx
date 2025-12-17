import { Navigate } from "react-router-dom";
import { useAuth } from "./AuthContext";

export default function RoleRoute({ allow = [], children }) {
  const { user } = useAuth();

  if (!allow.includes(user?.role)) {
    return <Navigate to="/not-found" replace />;
  }

  return children;
}
