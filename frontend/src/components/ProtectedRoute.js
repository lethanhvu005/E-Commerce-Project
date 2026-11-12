import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Loading } from "./Feedback";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Đang kiểm tra tài khoản..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

