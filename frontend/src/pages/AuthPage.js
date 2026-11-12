import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Feedback";

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "", first_name: "", last_name: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const update = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (isRegister) await register(form);
      else await login({ email: form.email, password: form.password });
      const target = location.state?.from;
      navigate(target ? `${target.pathname || "/"}${target.search || ""}` : "/", { replace: true });
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  };

  return (
    <div className="auth-page">
      {/* Left art panel */}
      <div className="auth-art">
        <span className="eyebrow">NEXA MEMBER</span>
        <h1>Gear tốt hơn.<br />Trải nghiệm liền mạch hơn.</h1>
        <p>Đăng nhập để đồng bộ giỏ hàng, yêu thích và theo dõi đơn hàng.</p>
      </div>

      {/* Right form card */}
      <form className="auth-card" onSubmit={submit}>
        <span className="eyebrow">{isRegister ? "TẠO TÀI KHOẢN" : "CHÀO MỪNG TRỞ LẠI"}</span>
        <h2>{isRegister ? "Gia nhập NEXA" : "Đăng nhập"}</h2>

        {isRegister && (
          <div className="form-row">
            <label>
              Họ
              <input name="last_name" value={form.last_name} onChange={update} required />
            </label>
            <label>
              Tên
              <input name="first_name" value={form.first_name} onChange={update} required />
            </label>
          </div>
        )}

        <label>
          Email
          <input name="email" type="email" value={form.email} onChange={update} required autoComplete="email" />
        </label>

        <label>
          Mật khẩu
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={update}
            required
            minLength={8}
            autoComplete={isRegister ? "new-password" : "current-password"}
          />
        </label>

        {error && <ErrorBox error={error} />}

        <button className="btn btn-primary full-button" disabled={busy}>
          {busy ? "Đang xử lý..." : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
        </button>

        <p>
          {isRegister ? "Đã có tài khoản?" : "Chưa có tài khoản?"}{" "}
          <Link to={isRegister ? "/login" : "/register"}>
            {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
          </Link>
        </p>
      </form>
    </div>
  );
}
