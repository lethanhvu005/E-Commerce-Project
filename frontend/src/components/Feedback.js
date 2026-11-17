import { useEffect } from "react";
import { createPortal } from "react-dom";

export function Loading({ label = "Đang tải dữ liệu từ máy chủ..." }) {
  return (
    <div className="empty" style={{ margin: "30px 0" }} role="status">
      <div className="spinner" style={{ margin: "0 auto 12px" }} />
      <p style={{ margin: 0, color: "var(--muted)" }}>{label}</p>
    </div>
  );
}

export function ProductSkeleton() {
  return (
    <article className="gear-card" style={{ opacity: 0.6 }}>
      <div className="gear-product-photo" style={{ background: "var(--surface-2)" }} />
      <div className="gear-product-meta">
        <span className="gear-kicker">ĐANG TẢI...</span>
        <h3 style={{ height: "20px", background: "var(--line)", borderRadius: "4px" }}> </h3>
        <div className="gear-price" style={{ width: "80px", height: "18px", background: "var(--line)" }}> </div>
      </div>
    </article>
  );
}

export function Empty({
  title = "Chưa có dữ liệu",
  text = "Nội dung sẽ xuất hiện khi có dữ liệu từ hệ thống.",
  actionText,
  onAction,
}) {
  return (
    <div className="empty" style={{ margin: "25px 0 50px" }}>
      <div className="empty-illustration">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <path d="M8 12h8" />
        </svg>
      </div>
      <h2>{title}</h2>
      <p style={{ maxWidth: "420px", margin: "6px auto 18px", color: "#6e7f98" }}>{text}</p>
      {actionText && onAction && (
        <button className="btn btn-violet" onClick={onAction}>
          {actionText}
        </button>
      )}
    </div>
  );
}

/** Convert API errors (DRF payload / Error / string) into one readable Vietnamese sentence. */
export function formatErrorMessage(error) {
  if (!error) return "";
  if (typeof error === "string") return error;
  const payload = error?.payload;
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    if (typeof payload.detail === "string" && payload.detail.trim()) {
      return payload.detail.trim();
    }
    const parts = [];
    Object.entries(payload).forEach(([key, val]) => {
      if (["requires_reverification", "is_staff_account", "email"].includes(key) && typeof val !== "object") {
        return;
      }
      if (Array.isArray(val) && typeof val[0] === "string") parts.push(val[0]);
      else if (typeof val === "string" && val.trim()) parts.push(val.trim());
    });
    if (parts.length) return parts.join(" · ");
  }
  const msg = String(error?.message || "").trim();
  if (/^<(?:!doctype|html|head|body)\b/i.test(msg) || /<html[\s>]/i.test(msg)) {
    return "Máy chủ đang gặp sự cố tạm thời (HTTP 500). Vui lòng thử lại sau.";
  }
  if (/^failed to fetch$/i.test(msg)) {
    return "Không thể kết nối đến máy chủ hoặc dịch vụ tra cứu. Vui lòng thử lại.";
  }
  return msg || "Không thể kết nối đến máy chủ backend.";
}

/**
 * Compact inline error message displayed directly below the offending control/section.
 */
export function ErrorBox({ error, onRetry }) {
  if (!error) return null;
  const message = formatErrorMessage(error);
  return (
    <div className="nexa-error-banner" role="alert">
      <span className="nexa-error-icon" aria-hidden="true">
        ⚠
      </span>
      <span className="nexa-error-text">{message}</span>
      {onRetry && (
        <button type="button" className="nexa-error-retry" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

const ERROR_HINT = /(không thể|không được|không đúng|không hợp lệ|không tìm thấy|không đủ|lỗi|thất bại|hết hạn|sai |vui lòng|chưa (?:đăng nhập|chọn|nhập)|bị từ chối|quá )/i;

/**
 * Compact floating toast notification (top-right).
 */
export function Toast({ message, type, onClose }) {
  const isWarn = type === "error" || type === "warn" || (!type && ERROR_HINT.test(String(message || "")));

  useEffect(() => {
    if (!message || !onClose) return undefined;
    const timer = window.setTimeout(onClose, isWarn ? 4500 : 3400);
    return () => window.clearTimeout(timer);
  }, [message, onClose, isWarn]);

  if (!message) return null;

  const content = (
    <div className="toast-region" role={isWarn ? "alert" : "status"} aria-live="polite">
      <div className={`toast ${isWarn ? "warn" : ""}`}>
        <span>{message}</span>
        {onClose && (
          <button type="button" className="toast-action" onClick={onClose}>
            Đóng
          </button>
        )}
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(content, document.body) : content;
}
