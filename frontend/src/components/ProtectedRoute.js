import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { Loading } from "./Feedback";

export default function ProtectedRoute({ children, requireStaff = false }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loading label="Đang kiểm tra tài khoản..." />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  if (requireStaff && !user.is_staff) return <Navigate to="/forbidden" replace />;
  return children;
}

