import { useEffect, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Feedback";

export default function AdminLoginPage() {
  const { user, loading, loginAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.is_staff) navigate("/admin/dashboard", { replace: true });
  }, [user, navigate]);

  if (!loading && user?.is_staff) return <Navigate to="/admin/dashboard" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const profile = await loginAdmin({
        email: form.email.trim(),
        password: form.password,
      });
      if (!profile?.is_staff) throw new Error("Tài khoản không có quyền Admin.");
      const requestedPath = location.state?.from?.pathname;
      navigate(requestedPath?.startsWith("/admin/") ? requestedPath : "/admin/dashboard", { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="admin-login-page">
      <section className="admin-login-card">
        <div className="admin-login-brand">
          <span className="admin-login-mark">N</span>
          <div><strong>NEXA</strong><small>COMMERCEOS ADMIN</small></div>
        </div>
        <span className="ux-kicker">SECURE ADMIN ACCESS</span>
        <h1>Đăng nhập quản trị</h1>
        <p>Chỉ tài khoản nhân viên được cấp quyền mới có thể truy cập.</p>
        {error && <ErrorBox error={error} variant="inline" />}
        <form onSubmit={handleSubmit}>
          <label htmlFor="admin-email">Email Admin</label>
          <input
            id="admin-email"
            className="field"
            type="email"
            autoComplete="username"
            required
            value={form.email}
            onChange={(event) => setForm({ ...form, email: event.target.value })}
          />
          <label htmlFor="admin-password">Mật khẩu</label>
          <input
            id="admin-password"
            className="field"
            type="password"
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(event) => setForm({ ...form, password: event.target.value })}
          />
          <button className="btn btn-primary full" type="submit" disabled={submitting}>
            {submitting ? "Đang xác thực..." : "Vào trang quản trị ↗"}
          </button>
        </form>
        <a className="admin-login-back" href="/">← Quay lại cửa hàng</a>
      </section>
    </main>
  );
}
