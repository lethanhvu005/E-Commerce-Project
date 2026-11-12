export function Loading({ label = "Đang tải dữ liệu..." }) {
  return (
    <div className="state-box">
      <span className="spinner" role="status" aria-label={label} />
      <span>{label}</span>
    </div>
  );
}

export function Empty({ title = "Chưa có dữ liệu", text = "Nội dung sẽ xuất hiện tại đây." }) {
  return (
    <div className="state-box state-empty">
      <strong>{title}</strong>
      <span>{text}</span>
    </div>
  );
}

export function ErrorBox({ error }) {
  return (
    <div className="state-box state-error" role="alert">
      <strong>Không thể tải dữ liệu</strong>
      <span>{error?.message || "Vui lòng thử lại."}</span>
    </div>
  );
}

export function FieldError({ value }) {
  if (!value) return null;
  return (
    <p className="field-error">
      {Array.isArray(value) ? value.join(" ") : String(value)}
    </p>
  );
}
