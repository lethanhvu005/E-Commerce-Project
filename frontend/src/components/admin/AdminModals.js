import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../../api/client";
import { dateTime, money, orderStatusLabel } from "../../api/format";
import { ErrorBox } from "../Feedback";

export function formatApiFieldErrors(err) {
  const payload = err?.payload;
  if (!payload || typeof payload !== "object") {
    return { summary: err?.message || "Yêu cầu thất bại.", fields: {} };
  }
  const fields = {};
  const parts = [];
  Object.entries(payload).forEach(([key, val]) => {
    const msg = Array.isArray(val) ? val.join(" ") : String(val);
    if (key === "detail" || key === "non_field_errors") {
      parts.push(msg);
    } else {
      fields[key] = msg;
      parts.push(`${key}: ${msg}`);
    }
  });
  return {
    summary: parts[0] || err?.message || "Dữ liệu không hợp lệ.",
    fields,
  };
}

export function RejectReasonModal({ target, title, label = "Lý do từ chối", onClose, onConfirm }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!target) return undefined;
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [target, saving, onClose]);

  if (!target) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onConfirm(target, trimmed);
      onClose();
    } catch (err) {
      setError(formatApiFieldErrors(err).summary);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-back"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form className="modal admin-editor-modal" role="dialog" aria-modal="true" onSubmit={handleSubmit}>
        <h2>{title}</h2>
        <label className="field-label" htmlFor="reject-reason-input">
          {label}
        </label>
        <textarea
          id="reject-reason-input"
          className="field"
          rows="3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do rõ ràng để lưu nhật ký kiểm toán..."
        />
        {error && <div className="admin-hero-note admin-error" style={{ marginTop: 10 }}>⚠ {error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" disabled={saving} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang xử lý..." : "Xác nhận"}
          </button>
        </div>
      </form>
    </div>
  );
}

function toInputDate(value) {
  if (!value) return "";
  const s = String(value);
  return s.length >= 10 ? s.slice(0, 10) : s;
}

export function VoucherModal({ voucher, onClose, onSaved }) {
  const isEdit = Boolean(voucher?.id);
  const [form, setForm] = useState(() => ({
    code: voucher?.code || "",
    kind: voucher?.kind || "percent",
    value: voucher?.kind === "free_ship" ? "0" : voucher?.value ?? "10",
    max_discount: voucher?.max_discount ?? "",
    min_subtotal: voucher?.min_subtotal ?? "0",
    usage_limit: voucher?.usage_limit ?? "",
    per_user_limit: voucher?.per_user_limit ?? "1",
    starts_at: toInputDate(voucher?.starts_at) || new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10),
    ends_at: toInputDate(voucher?.ends_at) || "",
    is_active: voucher?.is_active ?? true,
  }));
  const [fieldErrors, setFieldErrors] = useState({});
  const [summaryError, setSummaryError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && !saving && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [saving, onClose]);

  const handleKindChange = (kind) => {
    setForm((prev) => ({
      ...prev,
      kind,
      value: kind === "free_ship" ? "0" : prev.kind === "free_ship" ? "10" : prev.value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setFieldErrors({});
    setSummaryError("");
    const payload = {
      code: form.code.trim().toUpperCase(),
      kind: form.kind,
      value: form.kind === "free_ship" ? 0 : form.value,
      max_discount: form.max_discount === "" ? null : form.max_discount,
      min_subtotal: form.min_subtotal === "" ? 0 : form.min_subtotal,
      usage_limit: form.usage_limit === "" ? null : form.usage_limit,
      per_user_limit: form.per_user_limit === "" ? 1 : form.per_user_limit,
      starts_at: form.starts_at,
      ends_at: form.ends_at,
      is_active: Boolean(form.is_active),
    };
    try {
      if (isEdit) {
        await adminService.updatePromotion(voucher.id, payload);
      } else {
        await adminService.createPromotion(payload);
      }
      await onSaved(isEdit ? `Đã cập nhật voucher ${payload.code}.` : `Đã tạo voucher ${payload.code}.`);
      onClose();
    } catch (err) {
      const parsed = formatApiFieldErrors(err);
      setFieldErrors(parsed.fields);
      setSummaryError(parsed.summary);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-back"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form
        className="modal admin-editor-modal"
        role="dialog"
        aria-modal="true"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
        onSubmit={handleSubmit}
      >
        <h2>{isEdit ? `Chỉnh sửa voucher ${voucher.code}` : "Tạo mã giảm giá mới"}</h2>

        {summaryError && (
          <div className="admin-hero-note admin-error" style={{ marginBottom: 10 }}>
            ⚠ {summaryError}
          </div>
        )}

        <div className="admin-form-grid-2">
          <div>
            <label className="field-label" htmlFor="voucher-code">
              Mã voucher
            </label>
            <input
              id="voucher-code"
              className="field"
              required
              value={form.code}
              onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
              placeholder="VD: NEXA20"
            />
            {fieldErrors.code && <small className="admin-field-err">{fieldErrors.code}</small>}
          </div>

          <div>
            <label className="field-label" htmlFor="voucher-kind">
              Loại ưu đãi
            </label>
            <select
              id="voucher-kind"
              className="select"
              value={form.kind}
              onChange={(e) => handleKindChange(e.target.value)}
            >
              <option value="percent">Giảm phần trăm (%)</option>
              <option value="fixed">Giảm cố định (VND)</option>
              <option value="free_ship">Miễn phí vận chuyển</option>
            </select>
            {fieldErrors.kind && <small className="admin-field-err">{fieldErrors.kind}</small>}
          </div>
        </div>

        <div className="admin-form-grid-2">
          <div>
            <label className="field-label" htmlFor="voucher-value">
              {form.kind === "percent" ? "Phần trăm giảm (%)" : "Giá trị giảm (VND)"}
            </label>
            <input
              id="voucher-value"
              className="field"
              type="number"
              required
              disabled={form.kind === "free_ship"}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
            {fieldErrors.value && <small className="admin-field-err">{fieldErrors.value}</small>}
          </div>

          <div>
            <label className="field-label" htmlFor="voucher-max-discount">
              Giảm tối đa (VND, tùy chọn)
            </label>
            <input
              id="voucher-max-discount"
              className="field"
              type="number"
              min="0"
              value={form.max_discount}
              onChange={(e) => setForm({ ...form, max_discount: e.target.value })}
              placeholder="Để trống nếu không giới hạn"
            />
            {fieldErrors.max_discount && <small className="admin-field-err">{fieldErrors.max_discount}</small>}
          </div>
        </div>

        <div className="admin-form-grid-3">
          <div>
            <label className="field-label" htmlFor="voucher-min-subtotal">
              Đơn tối thiểu (VND)
            </label>
            <input
              id="voucher-min-subtotal"
              className="field"
              type="number"
              min="0"
              value={form.min_subtotal}
              onChange={(e) => setForm({ ...form, min_subtotal: e.target.value })}
            />
            {fieldErrors.min_subtotal && <small className="admin-field-err">{fieldErrors.min_subtotal}</small>}
          </div>

          <div>
            <label className="field-label" htmlFor="voucher-usage-limit">
              Tổng lượt dùng
            </label>
            <input
              id="voucher-usage-limit"
              className="field"
              type="number"
              min="1"
              value={form.usage_limit}
              onChange={(e) => setForm({ ...form, usage_limit: e.target.value })}
              placeholder="Không giới hạn"
            />
            {fieldErrors.usage_limit && <small className="admin-field-err">{fieldErrors.usage_limit}</small>}
          </div>

          <div>
            <label className="field-label" htmlFor="voucher-per-user">
              Mỗi khách hàng
            </label>
            <input
              id="voucher-per-user"
              className="field"
              type="number"
              min="1"
              required
              value={form.per_user_limit}
              onChange={(e) => setForm({ ...form, per_user_limit: e.target.value })}
            />
            {fieldErrors.per_user_limit && <small className="admin-field-err">{fieldErrors.per_user_limit}</small>}
          </div>
        </div>

        <div className="admin-form-grid-2">
          <div>
            <label className="field-label" htmlFor="voucher-starts-at">
              Ngày bắt đầu
            </label>
            <input
              id="voucher-starts-at"
              className="field"
              type="date"
              required
              value={form.starts_at}
              onChange={(e) => setForm({ ...form, starts_at: e.target.value })}
            />
            {fieldErrors.starts_at && <small className="admin-field-err">{fieldErrors.starts_at}</small>}
          </div>

          <div>
            <label className="field-label" htmlFor="voucher-ends-at">
              Ngày kết thúc
            </label>
            <input
              id="voucher-ends-at"
              className="field"
              type="date"
              required
              value={form.ends_at}
              onChange={(e) => setForm({ ...form, ends_at: e.target.value })}
            />
            {fieldErrors.ends_at && <small className="admin-field-err">{fieldErrors.ends_at}</small>}
          </div>
        </div>

        <label className="admin-checkbox-row" style={{ marginTop: 14 }}>
          <input
            type="checkbox"
            checked={Boolean(form.is_active)}
            onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
          />
          <span>Kích hoạt ngay sau khi lưu</span>
        </label>

        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" disabled={saving} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang lưu..." : isEdit ? "Lưu cập nhật" : "Tạo voucher"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function CustomerDetailModal({ customerId, onClose }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!customerId) return undefined;
    let active = true;
    setLoading(true);
    setError(null);
    adminService
      .getCustomerDetail(customerId)
      .then((res) => {
        if (active) setDetail(res);
      })
      .catch((err) => {
        if (active) setError(err);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [customerId]);

  useEffect(() => {
    if (!customerId) return undefined;
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [customerId, onClose]);

  if (!customerId) return null;

  return (
    <div className="modal-back" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal admin-editor-modal" role="dialog" aria-modal="true" style={{ maxWidth: 680, maxHeight: "88vh", overflowY: "auto" }}>
        <h2>Chi tiết khách hàng</h2>
        {loading && <div className="admin-empty">Đang tải hồ sơ khách hàng...</div>}
        {error && <ErrorBox error={error} />}
        {!loading && detail && (
          <>
            <div className="admin-detail-summary">
              <div>
                <strong>{detail.full_name}</strong>
                <small>{detail.email}</small>
                <small>{detail.phone || "Chưa cập nhật SĐT"}</small>
              </div>
              <div>
                <span className={`pill ${detail.is_active ? "green" : "red"}`}>
                  {detail.is_active ? "Đang hoạt động" : "Đang khóa"}
                </span>
                <small>Tham gia: {dateTime(detail.date_joined)}</small>
                <small>Số địa chỉ: {detail.addresses_count ?? 0}</small>
              </div>
            </div>

            <div className="admin-detail-kpis">
              <div className="admin-detail-stat">
                <small>Đơn hàng</small>
                <strong>{detail.orders_count ?? 0}</strong>
              </div>
              <div className="admin-detail-stat">
                <small>Đã thanh toán</small>
                <strong>{money(detail.customer_paid_total)}</strong>
              </div>
              <div className="admin-detail-stat">
                <small>Đã hoàn tiền</small>
                <strong>{money(detail.refunded_total)}</strong>
              </div>
            </div>

            <h3 style={{ marginTop: 14, marginBottom: 8, fontSize: 13 }}>Đơn hàng gần đây</h3>
            {(detail.recent_orders || []).length ? (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã đơn</th>
                      <th>Trạng thái</th>
                      <th>Tổng tiền</th>
                      <th>Ngày đặt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.recent_orders.map((ord) => (
                      <tr key={ord.public_id}>
                        <td>
                          <Link
                            className="text-link"
                            to={`/admin/orders?q=${encodeURIComponent(ord.order_number)}`}
                            onClick={onClose}
                          >
                            #{ord.order_number}
                          </Link>
                        </td>
                        <td>{orderStatusLabel(ord.status)}</td>
                        <td><strong>{money(ord.grand_total)}</strong></td>
                        <td>{dateTime(ord.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="admin-empty">Khách hàng chưa có đơn hàng nào.</div>
            )}
          </>
        )}
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" onClick={onClose}>
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export function CustomerStatusModal({ target, onClose, onSaved }) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setReason("");
    setError("");
  }, [target]);

  if (!target) return null;

  const willLock = Boolean(target.is_active);
  const nextActive = !willLock;

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmed = reason.trim();
    if (willLock && !trimmed) {
      setError("Vui lòng nhập lý do khóa tài khoản.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await adminService.setCustomerStatus(target.id, {
        is_active: nextActive,
        reason: trimmed,
      });
      const note = willLock
        ? `Đã khóa tài khoản ${target.email} (thu hồi ${res.revoked_refresh_tokens ?? 0} phiên đăng nhập).`
        : `Đã mở khóa tài khoản ${target.email}.`;
      await onSaved(note);
      onClose();
    } catch (err) {
      setError(formatApiFieldErrors(err).summary);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="modal-back"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && !saving && onClose()}
    >
      <form className="modal admin-editor-modal" role="dialog" aria-modal="true" onSubmit={handleSubmit}>
        <h2>{willLock ? "Khóa tài khoản khách hàng" : "Mở khóa tài khoản khách hàng"}</h2>
        <p style={{ fontSize: 13, color: "var(--muted)", marginTop: 4 }}>
          Tài khoản: <strong>{target.email}</strong> ({target.full_name})
        </p>
        {willLock && (
          <p style={{ fontSize: 12, color: "#c63f58", marginTop: 6 }}>
            Hệ thống sẽ thu hồi ngay các token đăng nhập hiện tại của tài khoản này.
          </p>
        )}
        <label className="field-label" htmlFor="customer-status-reason">
          {willLock ? "Lý do khóa tài khoản (bắt buộc)" : "Ghi chú mở khóa (tùy chọn)"}
        </label>
        <textarea
          id="customer-status-reason"
          className="field"
          rows="3"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Nhập lý do để lưu Audit Log..."
        />
        {error && <div className="admin-hero-note admin-error" style={{ marginTop: 10 }}>⚠ {error}</div>}
        <div className="modal-actions">
          <button type="button" className="btn btn-quiet" disabled={saving} onClick={onClose}>
            Hủy
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? "Đang cập nhật..." : willLock ? "Xác nhận khóa" : "Xác nhận mở khóa"}
          </button>
        </div>
      </form>
    </div>
  );
}

export function QuestionModerationModal({
  question,
  canModerateQuestion,
  canModerateAnswer,
  canReplyQuestion,
  onClose,
  onChanged,
}) {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [replyBody, setReplyBody] = useState("");
  const [replyError, setReplyError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [rejectDraft, setRejectDraft] = useState(null);

  const loadAnswers = async () => {
    if (!question?.id) return;
    setLoading(true);
    setError("");
    try {
      const res = await adminService.getQuestionAnswers(question.id);
      setAnswers(res?.results || []);
    } catch (err) {
      setError(formatApiFieldErrors(err).summary);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setReplyBody("");
    setReplyError("");
    setRejectDraft(null);
    if (question?.id) loadAnswers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id]);

  if (!question) return null;

  const moderateTarget = async (kind, id, statusValue, explicitReason = "") => {
    setError("");
    try {
      await adminService.moderateItem(kind, id, { status: statusValue, reason: explicitReason });
      setRejectDraft(null);
      await loadAnswers();
      await onChanged();
    } catch (err) {
      setError(formatApiFieldErrors(err).summary);
    }
  };

  const confirmRejectDraft = async (e) => {
    e.preventDefault();
    if (!rejectDraft) return;
    const trimmed = rejectDraft.reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do từ chối.");
      return;
    }
    await moderateTarget(rejectDraft.kind, rejectDraft.id, "rejected", trimmed);
  };

  const handleReplySubmit = async (e) => {
    e.preventDefault();
    const trimmed = replyBody.trim();
    if (trimmed.length < 5) {
      setReplyError("Nội dung phản hồi phải có ít nhất 5 ký tự.");
      return;
    }
    setSubmitting(true);
    setReplyError("");
    try {
      await adminService.replyToQuestion(question.id, trimmed);
      setReplyBody("");
      await loadAnswers();
      await onChanged();
    } catch (err) {
      setReplyError(formatApiFieldErrors(err).summary);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-back" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal admin-editor-modal" role="dialog" aria-modal="true" style={{ maxWidth: 680, maxHeight: "90vh", overflowY: "auto" }}>
        <h2>Chi tiết câu hỏi #Q{question.id}</h2>
        <div className="admin-question-box">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong>{question.customer}</strong>
            <span className="pill blue">{question.product_name}</span>
          </div>
          <p style={{ margin: "8px 0" }}>{question.body}</p>
          {canModerateQuestion && (
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="admin-select"
                onClick={() => moderateTarget("questions", question.id, "published")}
              >
                ✓ Duyệt câu hỏi
              </button>
              <button
                type="button"
                className="admin-select"
                onClick={() => setRejectDraft({ kind: "questions", id: question.id, reason: "" })}
              >
                ✕ Từ chối câu hỏi
              </button>
            </div>
          )}
        </div>

        {error && <div className="admin-hero-note admin-error">⚠ {error}</div>}

        {rejectDraft && (
          <form onSubmit={confirmRejectDraft} className="admin-question-box" style={{ marginTop: 10 }}>
            <label className="field-label" htmlFor="inline-reject-reason">
              Lý do từ chối ({rejectDraft.kind === "questions" ? "câu hỏi" : "phản hồi"} #{rejectDraft.id})
            </label>
            <input
              id="inline-reject-reason"
              className="field"
              value={rejectDraft.reason}
              onChange={(e) => setRejectDraft({ ...rejectDraft, reason: e.target.value })}
              placeholder="Nhập lý do từ chối..."
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button type="submit" className="btn btn-primary">Xác nhận từ chối</button>
              <button type="button" className="btn btn-quiet" onClick={() => setRejectDraft(null)}>Hủy</button>
            </div>
          </form>
        )}

        <h3 style={{ marginTop: 14, marginBottom: 8, fontSize: 13 }}>
          Danh sách phản hồi ({answers.length})
        </h3>
        {loading ? (
          <div className="admin-empty">Đang tải phản hồi...</div>
        ) : answers.length === 0 ? (
          <div className="admin-empty">Chưa có phản hồi nào cho câu hỏi này.</div>
        ) : (
          <div className="admin-answer-list">
            {answers.map((ans) => (
              <div className="admin-answer-card" key={ans.id}>
                <div className="admin-answer-head">
                  <div>
                    <strong>{ans.author}</strong>{" "}
                    <span className={`pill ${ans.is_staff_answer ? "blue" : "yellow"}`}>
                      {ans.is_staff_answer ? "Nhân viên NEXA" : "Khách hàng"}
                    </span>
                  </div>
                  <span className={`pill ${ans.status === "published" ? "green" : ans.status === "rejected" ? "red" : "yellow"}`}>
                    {ans.status === "published" ? "Đã duyệt" : ans.status === "rejected" ? "Từ chối" : "Chờ duyệt"}
                  </span>
                </div>
                <p style={{ margin: "6px 0" }}>{ans.body}</p>
                {canModerateAnswer && (
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      type="button"
                      className="admin-select"
                      onClick={() => moderateTarget("answers", ans.id, "published")}
                    >
                      Duyệt phản hồi
                    </button>
                    <button
                      type="button"
                      className="admin-select"
                      onClick={() => setRejectDraft({ kind: "answers", id: ans.id, reason: "" })}
                    >
                      Từ chối phản hồi
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {canReplyQuestion && (
          <form onSubmit={handleReplySubmit} style={{ marginTop: 16 }}>
            <label className="field-label" htmlFor="staff-reply-body">
              Trả lời chính thức từ nhân viên NEXA
            </label>
            <textarea
              id="staff-reply-body"
              className="field"
              rows="3"
              value={replyBody}
              onChange={(e) => setReplyBody(e.target.value)}
              placeholder="Nhập câu trả lời chi tiết (5 - 2000 ký tự)..."
            />
            {replyError && <div className="admin-hero-note admin-error" style={{ marginTop: 8 }}>⚠ {replyError}</div>}
            <div className="modal-actions">
              <button type="button" className="btn btn-quiet" onClick={onClose}>
                Đóng
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "Đang gửi..." : "Gửi phản hồi"}
              </button>
            </div>
          </form>
        )}

        {!canReplyQuestion && (
          <div className="modal-actions">
            <button type="button" className="btn btn-quiet" onClick={onClose}>
              Đóng
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
