export function Loading({ label = "Đang tải dữ liệu từ máy chủ..." }) {
  return (
    <div className="empty" style={{ margin: "30px 0" }}>
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

export function ErrorBox({ error, onRetry }) {
  const message = error?.message || "Không thể kết nối đến máy chủ backend.";
  return (
    <div className="empty" style={{ margin: "25px 0", borderColor: "#f3a84d44", background: "var(--bg2)" }}>
      <div style={{ color: "#f3a84d", fontSize: "36px", marginBottom: "8px" }}>⚠️</div>
      <h2 style={{ color: "var(--ink)" }}>Không thể tải dữ liệu</h2>
      <p style={{ color: "var(--muted)", maxWidth: "480px", margin: "8px auto 16px" }}>{message}</p>
      {onRetry && (
        <button className="btn btn-primary" onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}

export function Toast({ message, type = "info", onClose }) {
  if (!message) return null;
  return (
    <div className="toast-region">
      <div className={`toast ${type === "warn" ? "warn" : ""}`}>
        <span>{message}</span>
        {onClose && (
          <button className="toast-action" onClick={onClose}>
            Đóng
          </button>
        )}
      </div>
    </div>
  );
}
