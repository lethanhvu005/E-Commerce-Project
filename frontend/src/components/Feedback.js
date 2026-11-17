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
  return error?.message || "Không thể kết nối đến máy chủ backend.";
}

/**
 * Large centered error card (same visual language as <Empty/>): icon circle + title + message.
 * `variant` is kept for backward compatibility; every variant now renders the large card.
 */
export function ErrorBox({ error, onRetry, title = "Đã xảy ra lỗi" }) {
  if (!error) return null;
  const message = formatErrorMessage(error);
  return (
    <div className="empty nexa-error-card" role="alert" style={{ margin: "18px 0 28px" }}>
      <div className="empty-illustration nexa-error-illustration" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 7v6M12 16.5h.01" />
        </svg>
      </div>
      <h2>{title}</h2>
      <p style={{ maxWidth: "520px", margin: "6px auto 18px", color: "var(--muted)" }}>{message}</p>
      {onRetry && (
        <button type="button" className="btn btn-primary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

const ERROR_HINT = /(không thể|không được|không đúng|không hợp lệ|không tìm thấy|không đủ|lỗi|thất bại|hết hạn|sai |vui lòng|chưa (?:đăng nhập|chọn|nhập)|bị từ chối|quá )/i;

/**
 * Toast: success/info stays a compact top-right toast; errors/warnings are shown as a
 * large centered dialog (icon circle + title + message + close) so they cannot be missed.
 */
export function Toast({ message, type, onClose }) {
  const isError = type === "error" || type === "warn" || (!type && ERROR_HINT.test(String(message || "")));

  useEffect(() => {
    if (!message || !onClose) return undefined;
    const timer = window.setTimeout(onClose, isError ? 8000 : 3600);
    return () => window.clearTimeout(timer);
  }, [message, onClose, isError]);

  useEffect(() => {
    if (!message || !isError || !onClose) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [message, isError, onClose]);

  if (!message) return null;

  const content = isError ? (
    <div className="nexa-alert-backdrop" onClick={onClose}>
      <div
        className="nexa-alert-dialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="nexa-alert-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="empty-illustration nexa-error-illustration" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="38" height="38" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 7v6M12 16.5h.01" />
          </svg>
        </div>
        <h2 id="nexa-alert-title">Không thực hiện được</h2>
        <p>{message}</p>
        {onClose && (
          <button type="button" className="btn btn-primary" autoFocus onClick={onClose}>
            Đã hiểu
          </button>
        )}
      </div>
    </div>
  ) : (
    <div className="toast-region" role="status" aria-live="polite">
      <div className="toast">
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
