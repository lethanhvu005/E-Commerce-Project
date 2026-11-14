import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../auth/AuthContext";
import { authService } from "../api/client";
import { ErrorBox } from "../components/Feedback";

function GoogleIcon() {
  return (
    <svg className="google-g" viewBox="0 0 24 24" width="18" height="18">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
    </svg>
  );
}

function ActiveGoogleButton({ onAccessToken, onError, disabled }) {
  const triggerGoogleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      if (tokenResponse?.access_token) {
        onAccessToken(tokenResponse.access_token);
      } else {
        onError(new Error("Không nhận được access token từ Google."));
      }
    },
    onError: () => {
      onError(new Error("Đăng nhập Google bị hủy hoặc không thành công."));
    },
    scope: "openid email profile",
  });

  return (
    <button
      type="button"
      className="ux-social-button"
      disabled={disabled}
      title="Đăng nhập bằng tài khoản Google"
      onClick={() => triggerGoogleLogin()}
    >
      <GoogleIcon />
      <span>Google</span>
    </button>
  );
}

let facebookSdkPromise;

function loadFacebookSdk(appId) {
  if (window.FB) {
    window.FB.init({ appId, cookie: true, xfbml: false, version: "v27.0" });
    return Promise.resolve(window.FB);
  }
  if (facebookSdkPromise) return facebookSdkPromise;

  facebookSdkPromise = new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB.init({ appId, cookie: true, xfbml: false, version: "v27.0" });
      resolve(window.FB);
    };
    if (document.getElementById("facebook-jssdk")) return;
    const script = document.createElement("script");
    script.id = "facebook-jssdk";
    script.async = true;
    script.defer = true;
    script.crossOrigin = "anonymous";
    script.src = "https://connect.facebook.net/vi_VN/sdk.js";
    script.onerror = () => reject(new Error("Không tải được Facebook SDK."));
    document.body.appendChild(script);
  });
  return facebookSdkPromise;
}

export default function AuthPage({ mode = "login" }) {
  const isRegister = mode === "register";
  const { login, loginWithGoogle, loginWithFacebook, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || "").trim();
  const [facebookAppId, setFacebookAppId] = useState("");

  useEffect(() => {
    let active = true;
    authService.getFacebookConfig()
      .then((config) => {
        if (active && config?.enabled) setFacebookAppId(config.app_id || "");
      })
      .catch(() => {
        if (active) setFacebookAppId("");
      });
    return () => { active = false; };
  }, []);

  const [form, setForm] = useState({
    email: "",
    password: "",
    first_name: "",
    last_name: "",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const redirectAfterAuth = (profile) => {
    const target = location.state?.from;
    if (profile?.is_staff || profile?.is_superuser) {
      sessionStorage.removeItem("nexa_admin_view_storefront");
      const adminTarget =
        target?.pathname && target.pathname.startsWith("/admin")
          ? `${target.pathname}${target.search || ""}`
          : "/admin/dashboard";
      navigate(adminTarget, { replace: true });
    } else {
      navigate(target ? `${target.pathname || "/"}${target.search || ""}` : "/", { replace: true });
    }
  };

  const handleGoogleAccessToken = async (accessToken) => {
    setSubmitting(true);
    setError(null);
    try {
      const profile = await loginWithGoogle({ access_token: accessToken });
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleFacebookAccessToken = async (accessToken) => {
    setSubmitting(true);
    setError(null);
    try {
      const profile = await loginWithFacebook({ access_token: accessToken });
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let profile;
      if (isRegister) {
        profile = await register({
          email: form.email.trim(),
          password: form.password,
          first_name: form.first_name.trim(),
          last_name: form.last_name.trim(),
        });
      } else {
        profile = await login({
          email: form.email.trim(),
          password: form.password,
        });
      }

      redirectAfterAuth(profile);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container ux-page nexa-auth-page">
      {/* Compact Hero header matching login.html / register.html */}
      <section className="ux-hero nexa-auth-hero">
        <div>
          <span className="ux-kicker">
            {isRegister ? "TÀI KHOẢN / ĐĂNG KÝ" : "TÀI KHOẢN / ĐĂNG NHẬP"}
          </span>
          <h1>
            {isRegister ? (
              <>Gia nhập <em>NEXA.</em></>
            ) : (
              <>Chào mừng <em>trở lại.</em></>
            )}
          </h1>
          <p>
            {isRegister
              ? "Một tài khoản, toàn bộ trải nghiệm công nghệ yêu thích."
              : "Quản lý đơn hàng, wishlist và trải nghiệm NEXA theo cách của bạn."}
          </p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">N</span>
      </section>

      {/* Main Auth Container matching ux-auth layout */}
      <div className="ux-auth">
        {/* Left Form Card */}
        <div className="ux-card">
          <h2>{isRegister ? "Tạo tài khoản" : "Đăng nhập"}</h2>

          {/* Social login buttons visual */}
          <div className="ux-social">
            {googleClientId ? (
              <GoogleOAuthProvider clientId={googleClientId}>
                <ActiveGoogleButton
                  disabled={submitting}
                  onAccessToken={handleGoogleAccessToken}
                  onError={(err) => setError(err)}
                />
              </GoogleOAuthProvider>
            ) : (
              <button
                type="button"
                className="ux-social-button"
                disabled
                title="Đang cấu hình OAuth"
                style={{ opacity: 0.6, cursor: "not-allowed" }}
              >
                <GoogleIcon />
                <span>Google (Sắp mở)</span>
              </button>
            )}
            <button
              type="button"
              className="ux-social-button"
              disabled={!facebookAppId || submitting}
              title={!facebookAppId ? "Đang cấu hình OAuth" : "Đăng nhập bằng Facebook"}
              style={!facebookAppId ? { opacity: 0.6, cursor: "not-allowed" } : undefined}
              onClick={async () => {
                try {
                  const facebook = await loadFacebookSdk(facebookAppId);
                  facebook.login((response) => {
                    const accessToken = response?.authResponse?.accessToken;
                    if (accessToken) handleFacebookAccessToken(accessToken);
                    else setError(new Error("Đăng nhập Facebook bị hủy hoặc không thành công."));
                  }, { scope: "public_profile,email", return_scopes: true });
                } catch (err) {
                  setError(err);
                }
              }}
            >
              <svg className="facebook-f" viewBox="0 0 24 24" width="18" height="18" fill="#1877F2">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
              <span>{facebookAppId ? "Facebook" : "Facebook (Sắp mở)"}</span>
            </button>
          </div>

          <div className="ux-separator">
            <span>hoặc tiếp tục với email</span>
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div className="form-grid">
                <div>
                  <label htmlFor="reg-last">Họ</label>
                  <input
                    id="reg-last"
                    className="field"
                    name="last_name"
                    required
                    value={form.last_name}
                    onChange={handleChange}
                    placeholder="Nguyễn"
                  />
                </div>
                <div>
                  <label htmlFor="reg-first">Tên</label>
                  <input
                    id="reg-first"
                    className="field"
                    name="first_name"
                    required
                    value={form.first_name}
                    onChange={handleChange}
                    placeholder="Văn An"
                  />
                </div>
              </div>
            )}

            <label htmlFor="auth-email">Địa chỉ Email</label>
            <input
              id="auth-email"
              className="field"
              name="email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={handleChange}
              placeholder="example@domain.com"
            />

            <label htmlFor="auth-password">Mật khẩu</label>
            <input
              id="auth-password"
              className="field"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete={isRegister ? "new-password" : "current-password"}
              value={form.password}
              onChange={handleChange}
              placeholder="Tối thiểu 8 ký tự..."
            />

            {error && <ErrorBox error={error} variant="inline" />}

            <button
              type="submit"
              className="btn btn-violet full nexa-auth-submit"
              disabled={submitting}
            >
              {submitting ? "Đang xử lý..." : isRegister ? "Tạo tài khoản ↗" : "Đăng nhập ↗"}
            </button>

            <p className="nexa-auth-switch">
              {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <Link className="ux-link" to={isRegister ? "/login" : "/register"}>
                {isRegister ? "Đăng nhập" : "Đăng ký ngay"}
              </Link>
            </p>
          </form>
        </div>

        {/* Right Promo Card matching ux-auth-promo */}
        <div className="ux-card ux-auth-promo">
          <div className="ux-icon">✦</div>
          <h2>MỘT TÀI KHOẢN.<br />TRỌN HỆ SINH THÁI.</h2>
          <p>
            Xem lịch sử mua sắm, lưu sản phẩm yêu thích, quản lý địa chỉ và nhận mã giảm giá trong một không gian.
          </p>
          <ul className="ux-benefits">
            <li>Trải nghiệm mượt mà trên mọi thiết bị</li>
            <li>Thông báo trạng thái đơn hàng theo thời gian thực</li>
            <li>Đổi trả và bảo hành chính hãng dễ dàng</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
