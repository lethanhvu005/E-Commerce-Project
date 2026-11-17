import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { GoogleOAuthProvider, useGoogleLogin } from "@react-oauth/google";
import { useAuth } from "../auth/AuthContext";
import { authService } from "../api/client";
import { ErrorBox } from "../components/Feedback";
import { validateEmailAddress } from "../utils/validationAndLocation";

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
  const isForgot = mode === "forgot";
  const { login, loginWithGoogle, loginWithFacebook, register, reloadUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const googleClientId = (process.env.REACT_APP_GOOGLE_CLIENT_ID || "").trim();
  const [facebookAppId, setFacebookAppId] = useState("");
  const [emailVerificationStep, setEmailVerificationStep] = useState(null);
  const [googleLinkStep, setGoogleLinkStep] = useState(null);
  const [newEmailLoginOtpStep, setNewEmailLoginOtpStep] = useState(null);
  const [forgotStep, setForgotStep] = useState({
    stage: "request", // "request" | "confirm" | "done"
    email: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
    infoMessage: "",
    devOtp: "",
  });

  useEffect(() => {
    setError(null);
    setNewEmailLoginOtpStep(null);
    setGoogleLinkStep(null);
    setEmailVerificationStep(null);
    setForgotStep({
      stage: "request",
      email: "",
      otp: "",
      newPassword: "",
      confirmPassword: "",
      infoMessage: "",
      devOtp: "",
    });
  }, [mode]);

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
      if (err?.payload?.requires_reverification) {
        setGoogleLinkStep({
          accessToken,
          email: err.payload.email || "",
          isStaff: Boolean(err.payload.is_staff_account),
          mode: "password", // "password" | "otp"
          password: "",
          otp: "",
          infoMessage: "",
        });
        setError(null);
      } else {
        setError(err);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendGoogleLinkOtp = async () => {
    if (!googleLinkStep) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.loginWithGoogle({
        access_token: googleLinkStep.accessToken,
        send_link_otp: true,
      });
      setGoogleLinkStep((prev) => ({
        ...prev,
        mode: "otp",
        otp: "",
        infoMessage: res?.detail || `Đã gửi mã OTP 6 chữ số đến ${prev.email}.`,
      }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmGoogleLink = async (e) => {
    e.preventDefault();
    if (!googleLinkStep) return;
    setSubmitting(true);
    setError(null);
    try {
      const payload = { access_token: googleLinkStep.accessToken };
      if (googleLinkStep.mode === "otp") {
        payload.otp = googleLinkStep.otp.trim();
      } else {
        payload.password = googleLinkStep.password;
      }
      const profile = await loginWithGoogle(payload);
      setGoogleLinkStep(null);
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
      if (!profile?.email) {
        setEmailVerificationStep({
          stage: "request",
          email: "",
          otp: "",
          infoMessage: "",
          devOtp: "",
          profile,
        });
        return;
      }
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestEmailOtp = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    if (!emailVerificationStep) return;
    const trimmedEmail = emailVerificationStep.email.trim().toLowerCase();
    if (!trimmedEmail) return;
    const emailCheck = validateEmailAddress(trimmedEmail);
    if (!emailCheck.valid) {
      setError(new Error(emailCheck.error));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.requestEmailOtp(trimmedEmail);
      setEmailVerificationStep((prev) => ({
        ...prev,
        stage: "verify",
        email: trimmedEmail,
        otp: "",
        infoMessage: res?.detail || `Đã gửi mã xác thực 6 chữ số đến ${trimmedEmail}.`,
        devOtp: res?.dev_otp || "",
      }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyEmailOtp = async (e) => {
    e.preventDefault();
    if (!emailVerificationStep) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.verifyEmailOtp({
        email: emailVerificationStep.email.trim().toLowerCase(),
        otp: emailVerificationStep.otp.trim(),
      });
      const updatedProfile = (await reloadUser()) || res?.user || emailVerificationStep.profile;
      redirectAfterAuth(updatedProfile);
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
        const result = await login({
          email: form.email.trim(),
          password: form.password,
        });
        if (result?.requires_email_verification) {
          setNewEmailLoginOtpStep({
            email: result.email || form.email.trim().toLowerCase(),
            password: form.password,
            otp: "",
            infoMessage:
              result.detail ||
              `Đã gửi mã xác nhận 6 chữ số đến ${result.email || form.email.trim()}.`,
            devOtp: result.dev_otp || "",
          });
          return;
        }
        profile = result;
      }

      redirectAfterAuth(profile);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmNewEmailLoginOtp = async (e) => {
    e.preventDefault();
    if (!newEmailLoginOtpStep) return;
    setSubmitting(true);
    setError(null);
    try {
      const profile = await login({
        email: newEmailLoginOtpStep.email,
        password: newEmailLoginOtpStep.password,
        otp: newEmailLoginOtpStep.otp.trim(),
      });
      if (profile?.requires_email_verification) {
        setNewEmailLoginOtpStep((prev) => ({
          ...prev,
          infoMessage: profile.detail || prev.infoMessage,
          devOtp: profile.dev_otp || prev.devOtp,
        }));
        return;
      }
      setNewEmailLoginOtpStep(null);
      redirectAfterAuth(profile);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendNewEmailLoginOtp = async () => {
    if (!newEmailLoginOtpStep) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.login({
        email: newEmailLoginOtpStep.email,
        password: newEmailLoginOtpStep.password,
        resend_otp: true,
      });
      setNewEmailLoginOtpStep((prev) => ({
        ...prev,
        otp: "",
        infoMessage: res?.detail || `Đã gửi lại mã xác nhận 6 chữ số đến ${prev.email}.`,
        devOtp: res?.dev_otp || "",
      }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestPasswordReset = async (e) => {
    if (e?.preventDefault) e.preventDefault();
    const trimmedEmail = forgotStep.email.trim().toLowerCase();
    const emailCheck = validateEmailAddress(trimmedEmail);
    if (!emailCheck.valid) {
      setError(new Error(emailCheck.error));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.requestPasswordReset(trimmedEmail);
      setForgotStep((prev) => ({
        ...prev,
        stage: "confirm",
        email: trimmedEmail,
        otp: "",
        infoMessage:
          res?.detail ||
          `Nếu ${trimmedEmail} đã đăng ký trong hệ thống, mã OTP 6 chữ số đã được gửi tới hộp thư của bạn.`,
        devOtp: res?.dev_otp || "",
      }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmPasswordReset = async (e) => {
    e.preventDefault();
    if (forgotStep.newPassword.length < 8) {
      setError(new Error("Mật khẩu mới phải có tối thiểu 8 ký tự."));
      return;
    }
    if (forgotStep.newPassword !== forgotStep.confirmPassword) {
      setError(new Error("Mật khẩu xác nhận không khớp."));
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await authService.confirmPasswordReset({
        email: forgotStep.email.trim().toLowerCase(),
        otp: forgotStep.otp.trim(),
        newPassword: forgotStep.newPassword,
        confirmPassword: forgotStep.confirmPassword,
      });
      setForm((prev) => ({ ...prev, email: forgotStep.email.trim().toLowerCase(), password: "" }));
      setForgotStep((prev) => ({
        ...prev,
        stage: "done",
        otp: "",
        newPassword: "",
        confirmPassword: "",
        infoMessage: res?.detail || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập ngay.",
        devOtp: "",
      }));
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container ux-page nexa-auth-page">
      {/* Compact Hero header */}
      <section className="ux-hero nexa-auth-hero">
        <div>
          <span className="ux-kicker">
            {isForgot
              ? "Tài khoản thành viên · Khôi phục mật khẩu"
              : isRegister
              ? "Tài khoản thành viên · Đăng ký"
              : "Tài khoản thành viên · Đăng nhập"}
          </span>
          <h1>{isForgot ? "Quên mật khẩu" : isRegister ? "Tạo tài khoản NEXA Gear" : "Đăng nhập hệ thống"}</h1>
          <p>
            {isForgot
              ? "Nhận mã xác nhận 6 chữ số qua Gmail đã đăng ký để đặt lại mật khẩu mới an toàn."
              : isRegister
              ? "Lưu địa chỉ nhận hàng mặc định, áp dụng mã giảm giá và kích hoạt bảo hành điện tử 24 tháng."
              : "Theo dõi tiến độ đơn hàng, tra cứu lịch sử bảo hành và quản lý danh sách sản phẩm đã lưu."}
          </p>
        </div>
      </section>

      {/* Main Auth Container matching ux-auth layout */}
      <div className="ux-auth">
        {/* Left Form Card */}
        <div className="ux-card">
          {newEmailLoginOtpStep ? (
            <div>
              <h2>Xác nhận email mới</h2>
              <p className="nexa-auth-helper">
                {newEmailLoginOtpStep.infoMessage}
              </p>

              {newEmailLoginOtpStep.devOtp && (
                <div className="nexa-auth-dev-otp">
                  Mã xác nhận (chế độ dev): <strong>{newEmailLoginOtpStep.devOtp}</strong>
                </div>
              )}

              <form onSubmit={handleConfirmNewEmailLoginOtp}>
                <label htmlFor="login-new-email-otp">Mã xác nhận gửi về {newEmailLoginOtpStep.email} (6 chữ số)</label>
                <input
                  id="login-new-email-otp"
                  className="field"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  required
                  autoComplete="one-time-code"
                  value={newEmailLoginOtpStep.otp}
                  onChange={(e) =>
                    setNewEmailLoginOtpStep((prev) => ({
                      ...prev,
                      otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                    }))
                  }
                  placeholder="Nhập 6 chữ số (VD: 123456)"
                />

                {error && <ErrorBox error={error} variant="inline" />}

                <button
                  type="submit"
                  className="btn btn-violet full nexa-auth-submit"
                  disabled={submitting || newEmailLoginOtpStep.otp.trim().length !== 6}
                >
                  {submitting ? "Đang xác minh..." : "Xác nhận & Đăng nhập ↗"}
                </button>

                <div className="nexa-auth-actions">
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={submitting}
                    onClick={handleResendNewEmailLoginOtp}
                  >
                    Gửi lại mã
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={submitting}
                    onClick={() => {
                      setError(null);
                      setNewEmailLoginOtpStep(null);
                    }}
                  >
                    Quay lại đăng nhập
                  </button>
                </div>
              </form>
            </div>
          ) : isForgot ? (
            <div>
              <h2>Khôi phục mật khẩu</h2>
              {forgotStep.stage === "done" ? (
                <div>
                  <div className="nexa-auth-success">
                    {forgotStep.infoMessage}
                  </div>
                  <button
                    type="button"
                    className="btn btn-violet full nexa-auth-submit"
                    onClick={() => navigate("/login")}
                  >
                    Đăng nhập bằng mật khẩu mới ↗
                  </button>
                </div>
              ) : forgotStep.stage === "request" ? (
                <form onSubmit={handleRequestPasswordReset}>
                  <p className="nexa-auth-helper">
                    Nhập địa chỉ email bạn đã đăng ký với NEXA. Hệ thống sẽ gửi mã OTP 6 chữ số để bạn đặt lại mật khẩu.
                  </p>
                  <label htmlFor="forgot-email">Địa chỉ Email</label>
                  <input
                    id="forgot-email"
                    className="field"
                    type="email"
                    required
                    autoComplete="email"
                    value={forgotStep.email}
                    onChange={(e) => setForgotStep((prev) => ({ ...prev, email: e.target.value }))}
                    placeholder="yourname@gmail.com"
                  />

                  {error && <ErrorBox error={error} variant="inline" />}

                  <button
                    type="submit"
                    className="btn btn-violet full nexa-auth-submit"
                    disabled={submitting}
                  >
                    {submitting ? "Đang gửi mã..." : "Gửi mã xác nhận ↗"}
                  </button>

                  <p className="nexa-auth-switch">
                    Đã nhớ mật khẩu?{" "}
                    <Link className="ux-link" to="/login">
                      Quay lại đăng nhập
                    </Link>
                  </p>
                </form>
              ) : (
                <form onSubmit={handleConfirmPasswordReset}>
                  <p className="nexa-auth-helper">
                    {forgotStep.infoMessage}
                  </p>

                  {forgotStep.devOtp && (
                    <div className="nexa-auth-dev-otp">
                      Mã khôi phục (chế độ dev): <strong>{forgotStep.devOtp}</strong>
                    </div>
                  )}

                  <label htmlFor="forgot-otp">Mã xác nhận OTP (6 chữ số)</label>
                  <input
                    id="forgot-otp"
                    className="field"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    value={forgotStep.otp}
                    onChange={(e) =>
                      setForgotStep((prev) => ({
                        ...prev,
                        otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    placeholder="Nhập 6 chữ số (VD: 123456)"
                  />

                  <label htmlFor="forgot-new-password">Mật khẩu mới</label>
                  <input
                    id="forgot-new-password"
                    className="field"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={forgotStep.newPassword}
                    onChange={(e) => setForgotStep((prev) => ({ ...prev, newPassword: e.target.value }))}
                    placeholder="Tối thiểu 8 ký tự..."
                  />

                  <label htmlFor="forgot-confirm-password">Xác nhận mật khẩu mới</label>
                  <input
                    id="forgot-confirm-password"
                    className="field"
                    type="password"
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={forgotStep.confirmPassword}
                    onChange={(e) => setForgotStep((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="Nhập lại mật khẩu mới..."
                  />

                  {error && <ErrorBox error={error} variant="inline" />}

                  <button
                    type="submit"
                    className="btn btn-violet full nexa-auth-submit"
                    disabled={submitting || forgotStep.otp.trim().length !== 6}
                  >
                    {submitting ? "Đang cập nhật..." : "Đặt lại mật khẩu ↗"}
                  </button>

                  <div className="nexa-auth-actions">
                    <button
                      type="button"
                      className="btn btn-quiet"
                      disabled={submitting}
                      onClick={() => handleRequestPasswordReset()}
                    >
                      Gửi lại mã
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      disabled={submitting}
                      onClick={() => {
                        setError(null);
                        setForgotStep((prev) => ({ ...prev, stage: "request", otp: "" }));
                      }}
                    >
                      Đổi email khác
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : googleLinkStep ? (
            <div>
              <h2>Xác minh liên kết Google</h2>
              <p style={{ color: "var(--muted)", fontSize: "14px", marginBottom: "16px", lineHeight: 1.5 }}>
                Tài khoản <strong>{googleLinkStep.email}</strong>{" "}
                {googleLinkStep.isStaff ? "(Quản trị / Nhân viên)" : "đã tồn tại"} cần xác minh chủ sở hữu
                lần đầu để liên kết đăng nhập Google (theo chuẩn bảo mật S11).
              </p>

              <form onSubmit={handleConfirmGoogleLink}>
                {googleLinkStep.mode === "otp" ? (
                  <>
                    {googleLinkStep.infoMessage && (
                      <p style={{ color: "var(--accent)", fontSize: "13px", marginBottom: "12px", fontWeight: 600 }}>
                        {googleLinkStep.infoMessage}
                      </p>
                    )}
                    <label htmlFor="google-link-otp">Mã OTP xác minh (6 chữ số từ Gmail)</label>
                    <input
                      id="google-link-otp"
                      className="field"
                      type="text"
                      inputMode="numeric"
                      maxLength={6}
                      required
                      value={googleLinkStep.otp}
                      onChange={(e) =>
                        setGoogleLinkStep((prev) => ({
                          ...prev,
                          otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                        }))
                      }
                      placeholder="Nhập 6 chữ số (VD: 123456)"
                    />
                  </>
                ) : (
                  <>
                    <label htmlFor="google-link-password">Mật khẩu hiện tại của tài khoản NEXA</label>
                    <input
                      id="google-link-password"
                      className="field"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={googleLinkStep.password}
                      onChange={(e) =>
                        setGoogleLinkStep((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                      placeholder="Nhập mật khẩu hiện tại..."
                    />
                  </>
                )}

                {error && <ErrorBox error={error} variant="inline" />}

                <button
                  type="submit"
                  className="btn btn-violet full nexa-auth-submit"
                  disabled={
                    submitting ||
                    (googleLinkStep.mode === "otp"
                      ? googleLinkStep.otp.trim().length !== 6
                      : !googleLinkStep.password)
                  }
                >
                  {submitting ? "Đang xác minh..." : "Xác minh & Liên kết Google ↗"}
                </button>

                <div className="nexa-auth-actions">
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={submitting}
                    onClick={handleSendGoogleLinkOtp}
                  >
                    {googleLinkStep.mode === "otp" ? "Gửi lại mã OTP qua Gmail" : "Xác minh bằng mã OTP qua Gmail"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-quiet"
                    disabled={submitting}
                    onClick={() => {
                      setError(null);
                      setGoogleLinkStep(null);
                    }}
                  >
                    Quay lại
                  </button>
                </div>
              </form>
            </div>
          ) : emailVerificationStep ? (
            <div>
              <h2>
                {emailVerificationStep.stage === "request"
                  ? "Bổ sung địa chỉ Gmail"
                  : "Xác thực mã OTP"}
              </h2>
              <p className="nexa-auth-helper">
                {emailVerificationStep.stage === "request"
                  ? "Đăng nhập Facebook thành công! Tài khoản Facebook của bạn chưa cung cấp địa chỉ email. Vui lòng nhập Gmail để nhận mã xác thực 6 chữ số."
                  : emailVerificationStep.infoMessage || `Mã xác thực 6 chữ số đã được gửi đến ${emailVerificationStep.email}.`}
              </p>

              {emailVerificationStep.stage === "verify" && emailVerificationStep.devOtp && (
                <div className="nexa-auth-dev-otp">
                  Mã xác thực (chế độ dev): <strong>{emailVerificationStep.devOtp}</strong>
                </div>
              )}

              {emailVerificationStep.stage === "request" ? (
                <form onSubmit={handleRequestEmailOtp}>
                  <label htmlFor="fb-verify-email">Địa chỉ Gmail</label>
                  <input
                    id="fb-verify-email"
                    className="field"
                    name="email"
                    type="email"
                    required
                    autoComplete="email"
                    value={emailVerificationStep.email}
                    onChange={(e) =>
                      setEmailVerificationStep((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="yourname@gmail.com"
                  />

                  {error && <ErrorBox error={error} variant="inline" />}

                  <button
                    type="submit"
                    className="btn btn-violet full nexa-auth-submit"
                    disabled={submitting}
                  >
                    {submitting ? "Đang gửi mã..." : "Gửi mã xác thực ↗"}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleVerifyEmailOtp}>
                  <label htmlFor="fb-verify-otp">Mã xác thực (6 chữ số)</label>
                  <input
                    id="fb-verify-otp"
                    className="field"
                    name="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    required
                    autoComplete="one-time-code"
                    value={emailVerificationStep.otp}
                    onChange={(e) =>
                      setEmailVerificationStep((prev) => ({
                        ...prev,
                        otp: e.target.value.replace(/\D/g, "").slice(0, 6),
                      }))
                    }
                    placeholder="Nhập 6 chữ số (VD: 123456)"
                  />

                  {error && <ErrorBox error={error} variant="inline" />}

                  <button
                    type="submit"
                    className="btn btn-violet full nexa-auth-submit"
                    disabled={submitting || emailVerificationStep.otp.trim().length !== 6}
                  >
                    {submitting ? "Đang xác minh..." : "Xác nhận & Hoàn tất ↗"}
                  </button>

                  <div className="nexa-auth-actions">
                    <button
                      type="button"
                      className="btn btn-quiet"
                      disabled={submitting}
                      onClick={() => handleRequestEmailOtp()}
                    >
                      Gửi lại mã
                    </button>
                    <button
                      type="button"
                      className="btn btn-quiet"
                      disabled={submitting}
                      onClick={() => {
                        setError(null);
                        setEmailVerificationStep((prev) => ({
                          ...prev,
                          stage: "request",
                          otp: "",
                        }));
                      }}
                    >
                      Đổi Gmail khác
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <>
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
                      }, { scope: "public_profile", return_scopes: true });
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
                {!isRegister && (
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "8px" }}>
                    <Link className="ux-link" to="/forgot-password" style={{ fontSize: "12.5px" }}>
                      Quên mật khẩu?
                    </Link>
                  </div>
                )}

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
            </>
          )}
        </div>

        {/* Right Specification Summary Card */}
        <div className="ux-card ux-auth-promo">
          <span className="ux-kicker" style={{ marginBottom: "8px" }}>
            QUYỀN LỢI THÀNH VIÊN &amp; BẢO HÀNH
          </span>
          <h2>Quản lý đơn hàng &amp; Bảo hành điện tử 24 tháng</h2>
          <p>
            Mọi đơn hàng đặt qua tài khoản NEXA đều được gắn mã định danh UUID và lưu trữ lịch sử bảo hành phần cứng chính hãng.
          </p>
          <ul className="ux-benefits">
            <li>Tra cứu trạng thái vận đơn và lịch sử bàn giao theo thời gian thực</li>
            <li>Đổi mới 1-1 trong 30 ngày đầu nếu phát sinh lỗi switch hoặc cảm biến</li>
            <li>Lưu sổ địa chỉ nhận hàng và áp dụng trực tiếp mã ưu đãi tại giỏ hàng</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
