import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminService } from "../api/client";
import { dateTime, money, orderStatusLabel, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { AdminIcon } from "../components/admin/AdminIcons";
import {
  CustomerDetailModal,
  CustomerStatusModal,
  QuestionModerationModal,
  RejectReasonModal,
  VoucherModal,
} from "../components/admin/AdminModals";
import { ErrorBox } from "../components/Feedback";

const MODERATION_LABELS = {
  published: "Đã duyệt",
  pending: "Chờ duyệt",
  rejected: "Từ chối",
};

const OUTBOX_STATUS_LABELS = {
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  sent: "Đã gửi",
  failed: "Lỗi gửi",
};

function hasPerm(user, perm) {
  if (!user) return false;
  if (user.is_superuser) return true;
  if (!user.is_staff) return false;
  return Array.isArray(user.permissions) && user.permissions.includes(perm);
}

function moderationLabel(status) {
  return MODERATION_LABELS[status] || status;
}

const NEXT_ORDER_STATUS_OPTIONS = {
  pending: [
    ["confirmed", "Xác nhận đơn"],
    ["cancelled", "Hủy đơn"],
  ],
  confirmed: [
    ["packing", "Đóng gói"],
    ["cancelled", "Hủy đơn"],
  ],
  packing: [
    ["shipped", "Giao vận chuyển"],
    ["cancelled", "Hủy đơn"],
  ],
  shipped: [["delivered", "Đã giao & Thu COD"]],
  delivered: [],
  cancelled: [],
  expired: [],
};

const STATUS_FILTERS = {
  orders: [
    ["", "Tất cả"],
    ["pending", "Chờ xác nhận"],
    ["confirmed", "Đã xác nhận"],
    ["packing", "Đang đóng gói"],
    ["shipped", "Đang giao"],
    ["delivered", "Đã giao"],
    ["cancelled", "Đã hủy"],
  ],
  customers: [
    ["", "Tất cả"],
    ["active", "Đang hoạt động"],
    ["locked", "Đang khóa"],
  ],
  promotions: [
    ["", "Tất cả"],
    ["active", "Đang chạy"],
    ["inactive", "Đang tắt"],
  ],
  reviews: [
    ["", "Tất cả"],
    ["pending", "Chờ duyệt"],
    ["published", "Đã duyệt"],
    ["rejected", "Từ chối"],
  ],
  support: [
    ["", "Tất cả"],
    ["pending", "Chờ duyệt"],
    ["published", "Đã duyệt"],
    ["rejected", "Từ chối"],
  ],
};

const CONFIGS = {
  orders: [
    "Quản lý đơn hàng",
    "Dữ liệu đơn hàng truy vấn trực tiếp từ bảng orders trong PostgreSQL.",
    ["Mã đơn", "Khách hàng", "Ngày tạo", "Số SP", "Tổng tiền", "Trạng thái", "Thanh toán", "Thao tác"],
  ],
  customers: [
    "Quản lý khách hàng",
    "Danh sách người dùng, tổng thanh toán hợp lệ và điều khiển khóa/mở tài khoản.",
    ["Khách hàng", "Vai trò", "Đơn hợp lệ", "Đã thanh toán / GMV", "Trạng thái", "Thao tác"],
  ],
  promotions: [
    "Mã giảm giá & chương trình",
    "Quản lý vòng đời mã giảm giá từ bảng vouchers & voucher_redemptions.",
    ["Mã", "Loại ưu đãi", "Mức giảm", "Lượt dùng", "Hiệu lực", "Trạng thái", "Thao tác"],
  ],
  reviews: [
    "Kiểm duyệt đánh giá",
    "Duyệt hoặc từ chối đánh giá sản phẩm trước khi hiển thị công khai.",
    ["Khách hàng", "Sản phẩm", "Số sao", "Nội dung", "Trạng thái", "Thao tác"],
  ],
  support: [
    "Hỏi đáp & Chăm sóc khách hàng",
    "Kiểm duyệt câu hỏi kỹ thuật và gửi phản hồi chính thức từ nhân viên NEXA.",
    ["Mã", "Khách hàng", "Sản phẩm", "Nội dung câu hỏi", "Phản hồi", "Trạng thái", "Thao tác"],
  ],
};

function AdminSettingsLogsPanel() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get("tab") === "outbox" ? "outbox" : "audit";
  const urlQuery = searchParams.get("q") || "";
  const outboxStatus = searchParams.get("status") || "";
  const auditPage = Math.max(1, Number.parseInt(searchParams.get("audit_page") || "1", 10) || 1);
  const outboxPage = Math.max(1, Number.parseInt(searchParams.get("outbox_page") || "1", 10) || 1);
  const currentPage = activeTab === "outbox" ? outboxPage : auditPage;

  const [search, setSearch] = useState(urlQuery);
  const [rows, setRows] = useState([]);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState(null);
  const [notice, setNotice] = useState("");
  const [retryingId, setRetryingId] = useState(null);

  const canRetryOutbox = hasPerm(user, "operations.change_outboxevent");

  const updateParams = useCallback(
    (patch, replace = false) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, val]) => {
        if (
          val === undefined ||
          val === null ||
          val === "" ||
          (key === "tab" && val === "audit") ||
          ((key === "audit_page" || key === "outbox_page") && Number(val) <= 1)
        ) {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === urlQuery) return undefined;
    const timer = setTimeout(() => {
      updateParams(
        {
          q: normalized,
          ...(activeTab === "outbox" ? { outbox_page: 1 } : { audit_page: 1 }),
        },
        true
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [search, urlQuery, activeTab, updateParams]);

  const loadTab = useCallback(async () => {
    setLoading(true);
    setErrorObj(null);
    try {
      if (activeTab === "outbox") {
        const res = await adminService.getOutboxEvents({
          page: outboxPage,
          ...(urlQuery ? { q: urlQuery } : {}),
          ...(outboxStatus ? { status: outboxStatus } : {}),
        });
        const list = res?.results || [];
        setRows(list);
        setCount(typeof res?.count === "number" ? res.count : list.length);
        setHasNext(Boolean(res?.next));
        setSummary(res?.summary || null);
      } else {
        const res = await adminService.getAuditLogs({
          page: auditPage,
          ...(urlQuery ? { q: urlQuery } : {}),
        });
        const list = res?.results || [];
        setRows(list);
        setCount(typeof res?.count === "number" ? res.count : list.length);
        setHasNext(Boolean(res?.next));
      }
    } catch (err) {
      setRows([]);
      setErrorObj(err);
    } finally {
      setLoading(false);
    }
  }, [activeTab, auditPage, outboxPage, urlQuery, outboxStatus]);

  useEffect(() => {
    loadTab();
  }, [loadTab]);

  const handleRetryEvent = async (row) => {
    setRetryingId(row.id);
    setNotice("");
    setErrorObj(null);
    try {
      await adminService.retryOutboxEvent(row.id);
      setNotice(`Đã đưa sự kiện #${row.id} (${row.topic}) vào hàng đợi gửi lại.`);
      await loadTab();
    } catch (err) {
      setErrorObj(err);
    } finally {
      setRetryingId(null);
    }
  };

  const pageParamKey = activeTab === "outbox" ? "outbox_page" : "audit_page";
  const totalPages = Math.max(1, Math.ceil(count / 50));

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Nhật ký & Sự kiện hệ thống</h1>
          <p>Theo dõi độc lập nhật ký kiểm toán thao tác (Audit Logs) và hàng đợi Outbox Events trong PostgreSQL.</p>
        </div>
        <button className="admin-select admin-refresh-btn" onClick={loadTab}>
          <AdminIcon name="refresh" size={14} />
          <span>Làm mới từ Database</span>
        </button>
      </div>

      {notice && <div className="admin-hero-note">✓ {notice}</div>}

      {errorObj && (
        errorObj.status === 404 && currentPage > 1 ? (
          <div className="admin-hero-note admin-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>⚠ Trang {currentPage} vượt quá số trang hiện có.</span>
            <button type="button" className="btn btn-quiet" onClick={() => updateParams({ [pageParamKey]: 1 })}>
              Về trang 1
            </button>
          </div>
        ) : (
          <ErrorBox error={errorObj} onRetry={loadTab} variant="inline" />
        )
      )}

      <div className="admin-panel">
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab${activeTab === "audit" ? " active" : ""}`}
            onClick={() => updateParams({ tab: "audit" })}
          >
            Nhật ký Audit Logs
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "outbox" ? " active" : ""}`}
            onClick={() => updateParams({ tab: "outbox" })}
          >
            Hàng đợi Outbox Events
          </button>
        </div>

        {activeTab === "outbox" && summary && (
          <div className="admin-summary-pills">
            {["pending", "processing", "sent", "failed"].map((st) => (
              <span key={st} className={`pill ${st === "failed" ? "red" : st === "sent" ? "green" : st === "processing" ? "yellow" : "blue"}`}>
                {OUTBOX_STATUS_LABELS[st] || st}: {summary[st] ?? 0}
              </span>
            ))}
          </div>
        )}

        <div className="admin-toolbar">
          <input
            className="field"
            placeholder={
              activeTab === "outbox"
                ? "Tìm theo topic, aggregate_id hoặc trạng thái..."
                : "Tìm theo hành động, đối tượng hoặc email tác nhân..."
            }
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          {activeTab === "outbox" && (
            <select
              className="select"
              aria-label="Lọc trạng thái Outbox"
              value={outboxStatus}
              onChange={(e) => updateParams({ status: e.target.value, outbox_page: 1 })}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ xử lý</option>
              <option value="processing">Đang xử lý</option>
              <option value="sent">Đã gửi</option>
              <option value="failed">Lỗi gửi (failed)</option>
            </select>
          )}
          <span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
            Tổng: {count} bản ghi
          </span>
        </div>

        <div className="admin-table-wrap">
          {activeTab === "audit" ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Tác nhân</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>Chi tiết thay đổi</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={5} className="admin-empty">Đang truy vấn Audit Logs...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={5} className="admin-empty">Không có nhật ký phù hợp.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{dateTime(row.created_at)}</td>
                      <td><strong>{row.actor_email || "system"}</strong></td>
                      <td><span className="pill blue">{row.action}</span></td>
                      <td>{row.entity_type} #{row.entity_id}</td>
                      <td><small>{JSON.stringify(row.changes || {})}</small></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Topic</th>
                  <th>Aggregate</th>
                  <th>Lần thử / Lỗi</th>
                  <th>Trạng thái</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={6} className="admin-empty">Đang truy vấn Outbox Events...</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={6} className="admin-empty">Không có sự kiện Outbox phù hợp.</td></tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id}>
                      <td>{dateTime(row.created_at)}</td>
                      <td><strong>{row.topic}</strong></td>
                      <td>{row.aggregate_id}</td>
                      <td>
                        {row.attempts} lần
                        {row.last_error_code && (
                          <small style={{ display: "block", color: "#c63f58" }}>{row.last_error_code}</small>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${row.status === "sent" ? "green" : row.status === "failed" ? "red" : row.status === "processing" ? "yellow" : "blue"}`}>
                          {OUTBOX_STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                      <td>
                        {row.status === "failed" ? (
                          canRetryOutbox ? (
                            <button
                              type="button"
                              className="admin-select"
                              disabled={retryingId === row.id}
                              onClick={() => handleRetryEvent(row)}
                            >
                              {retryingId === row.id ? "Đang gửi lại..." : "Thử gửi lại"}
                            </button>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Không đủ quyền</span>
                          )
                        ) : (
                          <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>

        {(currentPage > 1 || hasNext) && (
          <div className="admin-pagination">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => updateParams({ [pageParamKey]: currentPage - 1 })}
            >
              ← Trước
            </button>
            <span>Trang {currentPage} / {totalPages}</span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => updateParams({ [pageParamKey]: currentPage + 1 })}
            >
              Sau →
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export function AdminUnavailablePage({ type }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  if (type === "settings") {
    return <AdminSettingsLogsPanel />;
  }

  return <AdminEntityModule type={type} user={user} searchParams={searchParams} setSearchParams={setSearchParams} />;
}

function AdminEntityModule({ type, user, searchParams, setSearchParams }) {
  const [title, description, headers] = CONFIGS[type] || CONFIGS.orders;
  const urlQuery = searchParams.get("q") || "";
  const urlStatus = searchParams.get("status") || "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState(null);
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState(urlQuery);

  // Module modal states
  const [voucherModalTarget, setVoucherModalTarget] = useState(null);
  const [showVoucherCreate, setShowVoucherCreate] = useState(false);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [customerDetailId, setCustomerDetailId] = useState(null);
  const [customerStatusTarget, setCustomerStatusTarget] = useState(null);
  const [questionDetailTarget, setQuestionDetailTarget] = useState(null);

  const updateParams = useCallback(
    (patch, replace = false) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([key, val]) => {
        if (val === undefined || val === null || val === "" || (key === "page" && Number(val) <= 1)) {
          next.delete(key);
        } else {
          next.set(key, String(val));
        }
      });
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearch(urlQuery);
  }, [type, urlQuery]);

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === urlQuery) return undefined;
    const timer = setTimeout(() => {
      updateParams({ q: normalized, page: 1 }, true);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, urlQuery, updateParams]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setErrorObj(null);
    try {
      const params = {
        page,
        ...(urlQuery ? { q: urlQuery } : {}),
        ...(urlStatus ? { status: urlStatus } : {}),
      };
      let res;
      if (type === "orders") res = await adminService.getOrders(params);
      else if (type === "customers") res = await adminService.getCustomers(params);
      else if (type === "promotions") res = await adminService.getPromotions(params);
      else if (type === "reviews") res = await adminService.getReviews(params);
      else if (type === "support") res = await adminService.getQuestions(params);

      const list = res?.results || res || [];
      const countVal = typeof res?.count === "number" ? res.count : list.length;
      setRows(list);
      setTotalCount(countVal);
      setHasNext(Boolean(res?.next));
    } catch (err) {
      setRows([]);
      setErrorObj(err);
    } finally {
      setLoading(false);
    }
  }, [type, urlQuery, urlStatus, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOrderStatusTransition = async (order, nextStatus) => {
    if (!nextStatus) return;
    setErrorObj(null);
    setNotice("");
    try {
      await adminService.updateOrderStatus(order.public_id, {
        status: nextStatus,
        reason: `Cập nhật từ cổng Admin sang ${nextStatus}`,
        confirm_cod_payment: nextStatus === "delivered",
      });
      setNotice(`Đã chuyển đơn #${order.order_number} sang ${orderStatusLabel(nextStatus)}.`);
      await loadData();
    } catch (err) {
      setErrorObj(err);
    }
  };

  const handleConfirmPayment = async (order) => {
    setErrorObj(null);
    setNotice("");
    try {
      await adminService.confirmOrderPayment(order.public_id, {
        provider_reference: `COD-${order.order_number}`,
      });
      setNotice(`Đã xác nhận thu COD cho đơn #${order.order_number}.`);
      await loadData();
    } catch (err) {
      setErrorObj(err);
    }
  };

  const handleReleaseExpired = async () => {
    setErrorObj(null);
    setNotice("");
    try {
      const res = await adminService.releaseExpiredReservations();
      setNotice(`Đã giải phóng ${res?.released_count ?? 0} giữ chỗ đơn hàng hết hạn.`);
      await loadData();
    } catch (err) {
      setErrorObj(err);
    }
  };

  const handleToggleVoucher = async (row) => {
    setErrorObj(null);
    setNotice("");
    try {
      await adminService.setPromotionStatus(row.id, !row.is_active);
      setNotice(`Đã ${row.is_active ? "tắt" : "kích hoạt"} mã ${row.code}.`);
      await loadData();
    } catch (err) {
      setErrorObj(err);
    }
  };

  const handleQuickApprove = async (kind, row) => {
    setErrorObj(null);
    setNotice("");
    try {
      await adminService.moderateItem(kind, row.id, { status: "published", reason: "" });
      setNotice(`Đã duyệt ${kind === "reviews" ? "đánh giá" : "câu hỏi"} #${row.id}.`);
      await loadData();
    } catch (err) {
      setErrorObj(err);
    }
  };

  const handleConfirmReject = async (target, reason) => {
    await adminService.moderateItem(target.kind, target.row.id, { status: "rejected", reason });
    setNotice(`Đã từ chối ${target.kind === "reviews" ? "đánh giá" : "câu hỏi"} #${target.row.id}.`);
    await loadData();
  };

  const statusFilterOptions = STATUS_FILTERS[type] || [];
  const canChangeOrder = hasPerm(user, "orders.change_order");
  const canConfirmPay = hasPerm(user, "payments.change_payment");
  const canReleaseExpired = hasPerm(user, "inventory.change_inventorybalance");
  const canAddVoucher = hasPerm(user, "promotions.add_voucher");
  const canChangeVoucher = hasPerm(user, "promotions.change_voucher");
  const canViewCustomerOrders = hasPerm(user, "orders.view_order");
  const canChangeCustomer = hasPerm(user, "accounts.change_user");
  const canModerateReview = hasPerm(user, "community.change_review");
  const canModerateQuestion = hasPerm(user, "community.change_productquestion");
  const canModerateAnswer = hasPerm(user, "community.change_productanswer");
  const canReplyQuestion = hasPerm(user, "community.add_productanswer");
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <div className="admin-intro-actions">
          {type === "promotions" && canAddVoucher && (
            <button
              type="button"
              className="btn btn-primary"
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              onClick={() => setShowVoucherCreate(true)}
            >
              <AdminIcon name="plus" size={15} />
              <span>Tạo voucher</span>
            </button>
          )}
          {type === "orders" && canReleaseExpired && (
            <button type="button" className="admin-select" onClick={handleReleaseExpired}>
              Giải phóng giữ chỗ hết hạn
            </button>
          )}
          <button className="admin-select admin-refresh-btn" onClick={loadData}>
            <AdminIcon name="refresh" size={14} />
            <span>Làm mới từ Database</span>
          </button>
        </div>
      </div>

      {notice && <div className="admin-hero-note">✓ {notice}</div>}

      {errorObj && (
        errorObj.status === 404 && page > 1 ? (
          <div className="admin-hero-note admin-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span>⚠ Trang {page} không tồn tại.</span>
            <button type="button" className="btn btn-quiet" onClick={() => updateParams({ page: 1 })}>
              Về trang 1
            </button>
          </div>
        ) : (
          <ErrorBox error={errorObj} onRetry={loadData} variant="inline" />
        )
      )}

      <div className="admin-panel">
        {statusFilterOptions.length > 0 && (
          <div className="admin-tabs">
            {statusFilterOptions.map(([val, label]) => (
              <button
                key={label}
                type="button"
                className={`admin-tab${urlStatus === val ? " active" : ""}`}
                onClick={() => updateParams({ status: val, page: 1 })}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="admin-toolbar">
          <input
            className="field"
            placeholder="⌕ Tìm kiếm trong bảng..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span style={{ fontSize: "12px", color: "var(--muted)", whiteSpace: "nowrap" }}>
            Tổng: {totalCount} bản ghi
          </span>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                {headers.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={headers.length} className="admin-empty">
                    Đang truy vấn dữ liệu từ PostgreSQL...
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="admin-empty">
                    Không có bản ghi phù hợp.
                  </td>
                </tr>
              ) : (
                rows.map((row) => {
                  if (type === "orders") {
                    const pillColor =
                      row.status === "delivered"
                        ? "green"
                        : row.status === "cancelled" || row.status === "expired"
                        ? "red"
                        : row.status === "pending" || row.status === "packing"
                        ? "yellow"
                        : "blue";
                    const nextActions = NEXT_ORDER_STATUS_OPTIONS[row.status] || [];
                    const isPaid = row.payment_status === "succeeded";
                    return (
                      <tr key={row.id || row.order_number}>
                        <td>
                          <strong>#{row.order_number}</strong>
                          <small style={{ display: "block", color: "var(--muted)" }}>{row.shipping_method}</small>
                        </td>
                        <td>
                          <strong>{row.customer_name}</strong>
                          {row.customer_email && (
                            <Link
                              className="text-link"
                              to={`/admin/customers?q=${encodeURIComponent(row.customer_email)}`}
                              style={{ display: "block", fontSize: 12 }}
                            >
                              {row.customer_email}
                            </Link>
                          )}
                        </td>
                        <td>{dateTime(row.created_at)}</td>
                        <td>{row.items_count}</td>
                        <td><strong>{money(row.grand_total)}</strong></td>
                        <td><span className={`pill ${pillColor}`}>{orderStatusLabel(row.status)}</span></td>
                        <td>
                          {(() => {
                            const isCod = !row.payment_provider || row.payment_provider === "cod";
                            const providerTag = String(row.payment_provider || "online").toUpperCase();
                            const payLabel = isPaid
                              ? "Đã thu tiền"
                              : row.payment_status === "pending"
                              ? isCod
                                ? "Chờ thu COD"
                                : `Chờ ${providerTag}`
                              : row.payment_status || "—";
                            return (
                              <span className={`pill ${isPaid ? "green" : row.payment_status === "pending" ? "yellow" : "red"}`}>
                                {payLabel}
                              </span>
                            );
                          })()}
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            {canChangeOrder && nextActions.length > 0 ? (
                              <select
                                className="select"
                                defaultValue=""
                                onChange={(e) => {
                                  const nextVal = e.target.value;
                                  e.target.value = "";
                                  if (nextVal === "cancelled" && !window.confirm(`Xác nhận hủy đơn hàng ${row.order_number}?`)) {
                                    return;
                                  }
                                  handleOrderStatusTransition(row, nextVal);
                                }}
                              >
                                <option value="" disabled>Chuyển trạng thái...</option>
                                {nextActions.map(([val, label]) => (
                                  <option key={val} value={val}>{label}</option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>
                                {nextActions.length ? "Chỉ xem" : "Hoàn tất"}
                              </span>
                            )}
                            {canConfirmPay &&
                              (!row.payment_provider || row.payment_provider === "cod") &&
                              row.payment_status === "pending" &&
                              row.status !== "cancelled" &&
                              row.status !== "expired" && (
                                <button
                                  type="button"
                                  className="admin-select"
                                  style={{ cursor: "pointer", fontWeight: 700, fontSize: "11px" }}
                                  onClick={() => handleConfirmPayment(row)}
                                >
                                  ✓ Thu COD
                                </button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (type === "customers") {
                    const isSelf = row.id === user?.id;
                    const needsSuper = (row.is_staff || row.is_superuser) && !user?.is_superuser;
                    const cannotLockSuper = Boolean(row.is_superuser && row.is_active);
                    const toggleDisabled = !canChangeCustomer || isSelf || needsSuper || cannotLockSuper;
                    let disabledReason = "";
                    if (isSelf) disabledReason = "Không thể tự khóa tài khoản của chính bạn";
                    else if (needsSuper) disabledReason = "Chỉ superuser được thao tác nhân viên/quản trị";
                    else if (cannotLockSuper) disabledReason = "Không được khóa tài khoản superuser";
                    else if (!canChangeCustomer) disabledReason = "Không có quyền chỉnh sửa tài khoản";

                    return (
                      <tr key={row.id || row.email}>
                        <td>
                          <strong>{row.full_name}</strong>
                          <small style={{ display: "block", color: "var(--muted)" }}>{row.email}</small>
                        </td>
                        <td>{row.role}</td>
                        <td>
                          {canViewCustomerOrders ? (
                            <Link
                              className="text-link"
                              to={`/admin/orders?q=${encodeURIComponent(row.email)}`}
                            >
                              {row.orders_count} đơn ↗
                            </Link>
                          ) : (
                            row.orders_count
                          )}
                        </td>
                        <td>
                          <strong>{money(row.customer_paid_total ?? row.total_spent)}</strong>
                          <small style={{ display: "block", color: "var(--muted)" }}>
                            GMV: {money(row.gross_order_value ?? row.customer_paid_total ?? 0)}
                          </small>
                        </td>
                        <td>
                          <span className={`pill ${row.is_active ? "green" : "red"}`}>
                            {row.is_active ? "Hoạt động" : "Khóa"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                            {canViewCustomerOrders && (
                              <button
                                type="button"
                                className="admin-select"
                                onClick={() => setCustomerDetailId(row.id)}
                              >
                                Chi tiết
                              </button>
                            )}
                            <button
                              type="button"
                              className="admin-select"
                              disabled={toggleDisabled}
                              title={disabledReason || (row.is_active ? "Khóa tài khoản" : "Mở khóa tài khoản")}
                              onClick={() => setCustomerStatusTarget(row)}
                            >
                              {row.is_active ? "Khóa" : "Mở khóa"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  if (type === "promotions") {
                    const nowMs = Date.now();
                    const startsMs = row.starts_at ? new Date(row.starts_at).getTime() : null;
                    const endsMs = row.ends_at ? new Date(row.ends_at).getTime() : null;
                    const isExhausted = row.usage_limit != null && Number(row.used_count || 0) >= Number(row.usage_limit);
                    let statusText = "Đang chạy";
                    let statusPill = "green";
                    if (!row.is_active) {
                      statusText = "Tắt";
                      statusPill = "red";
                    } else if (endsMs && endsMs < nowMs) {
                      statusText = "Hết hạn";
                      statusPill = "red";
                    } else if (isExhausted) {
                      statusText = "Hết lượt";
                      statusPill = "yellow";
                    } else if (startsMs && startsMs > nowMs) {
                      statusText = "Chưa đến hạn";
                      statusPill = "blue";
                    }
                    return (
                      <tr key={row.id || row.code}>
                        <td><strong>{row.code}</strong></td>
                        <td>{row.kind === "percent" ? "Phần trăm" : row.kind === "free_ship" ? "Freeship" : "Giảm cố định"}</td>
                        <td>{row.kind === "percent" ? `${row.value}%` : row.kind === "free_ship" ? "Miễn phí ship" : money(row.value)}</td>
                        <td>{row.used_count} / {row.usage_limit || "∞"}</td>
                        <td>
                          <small>
                            {row.starts_at ? String(row.starts_at).slice(0, 10) : "—"} → {row.ends_at ? String(row.ends_at).slice(0, 10) : "—"}
                          </small>
                        </td>
                        <td>
                          <span className={`pill ${statusPill}`}>
                            {statusText}
                          </span>
                        </td>
                        <td>
                          {canChangeVoucher ? (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              <button
                                type="button"
                                className="admin-select"
                                onClick={() => setVoucherModalTarget(row)}
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                className="admin-select"
                                onClick={() => handleToggleVoucher(row)}
                              >
                                {row.is_active ? "Tắt" : "Kích hoạt"}
                              </button>
                            </div>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  if (type === "reviews") {
                    return (
                      <tr key={row.id}>
                        <td>
                          <strong>{row.author}</strong>
                          {row.is_verified_buyer && (
                            <small style={{ display: "block", color: "#10b981", fontWeight: 600 }}>
                              ✓ Đã mua hàng
                            </small>
                          )}
                        </td>
                        <td>
                          <div className="mini-product">
                            <span className="mini-img">
                              <img src={productImage(row)} alt={row.product_name} className="admin-mini-thumb" />
                            </span>
                            <span><strong>{row.product_name}</strong></span>
                          </div>
                        </td>
                        <td style={{ color: "#f5b324" }}>{"★".repeat(row.stars)}</td>
                        <td>{row.body}</td>
                        <td>
                          <span className={`pill ${row.status === "published" ? "green" : row.status === "rejected" ? "red" : "yellow"}`}>
                            {moderationLabel(row.status)}
                          </span>
                        </td>
                        <td>
                          {canModerateReview ? (
                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                              {row.status !== "published" && (
                                <button
                                  type="button"
                                  className="admin-select"
                                  onClick={() => handleQuickApprove("reviews", row)}
                                >
                                  Duyệt
                                </button>
                              )}
                              {row.status !== "rejected" && (
                                <button
                                  type="button"
                                  className="admin-select"
                                  onClick={() => setRejectTarget({ kind: "reviews", row })}
                                >
                                  Từ chối
                                </button>
                              )}
                            </div>
                          ) : (
                            <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Chỉ xem</span>
                          )}
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={row.id}>
                      <td><strong>#Q{row.id}</strong></td>
                      <td>{row.customer}</td>
                      <td>
                        <div className="mini-product">
                          <span className="mini-img">
                            <img src={productImage(row)} alt={row.product_name} className="admin-mini-thumb" />
                          </span>
                          <span><strong>{row.product_name}</strong></span>
                        </div>
                      </td>
                      <td>{row.body}</td>
                      <td>
                        {row.answers_count} phản hồi
                        {row.pending_answers_count > 0 && (
                          <small style={{ display: "block", color: "#d97706" }}>
                            ({row.pending_answers_count} chờ duyệt)
                          </small>
                        )}
                      </td>
                      <td>
                        <span className={`pill ${row.status === "published" ? "green" : row.status === "rejected" ? "red" : "yellow"}`}>
                          {moderationLabel(row.status)}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            className="admin-select"
                            onClick={() => setQuestionDetailTarget(row)}
                          >
                            Chi tiết / Trả lời
                          </button>
                          {canModerateQuestion && row.status !== "published" && (
                            <button
                              type="button"
                              className="admin-select"
                              onClick={() => handleQuickApprove("questions", row)}
                            >
                              Duyệt
                            </button>
                          )}
                          {canModerateQuestion && row.status !== "rejected" && (
                            <button
                              type="button"
                              className="admin-select"
                              onClick={() => setRejectTarget({ kind: "questions", row })}
                            >
                              Từ chối
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {(page > 1 || hasNext) && (
          <div className="admin-pagination">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => updateParams({ page: page - 1 })}
            >
              ← Trước
            </button>
            <span>Trang {page} / {totalPages}</span>
            <button
              type="button"
              disabled={!hasNext}
              onClick={() => updateParams({ page: page + 1 })}
            >
              Sau →
            </button>
          </div>
        )}
      </div>

      {(showVoucherCreate || voucherModalTarget) && (
        <VoucherModal
          voucher={voucherModalTarget}
          onClose={() => {
            setShowVoucherCreate(false);
            setVoucherModalTarget(null);
          }}
          onSaved={async (msg) => {
            setNotice(msg);
            await loadData();
          }}
        />
      )}

      <RejectReasonModal
        target={rejectTarget}
        title={rejectTarget?.kind === "reviews" ? "Từ chối đánh giá" : "Từ chối câu hỏi"}
        onClose={() => setRejectTarget(null)}
        onConfirm={handleConfirmReject}
      />

      <CustomerDetailModal customerId={customerDetailId} onClose={() => setCustomerDetailId(null)} />

      <CustomerStatusModal
        target={customerStatusTarget}
        onClose={() => setCustomerStatusTarget(null)}
        onSaved={async (msg) => {
          setNotice(msg);
          await loadData();
        }}
      />

      <QuestionModerationModal
        question={questionDetailTarget}
        canModerateQuestion={canModerateQuestion}
        canModerateAnswer={canModerateAnswer}
        canReplyQuestion={canReplyQuestion}
        onClose={() => setQuestionDetailTarget(null)}
        onChanged={loadData}
      />
    </>
  );
}

function isoDateDaysAgo(daysAgo) {
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000 - daysAgo * 86400 * 1000);
  return vnNow.toISOString().slice(0, 10);
}

export function AdminAnalyticsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlStart = searchParams.get("start_date") || "";
  const urlEnd = searchParams.get("end_date") || "";

  const [startInput, setStartInput] = useState(urlStart);
  const [endInput, setEndInput] = useState(urlEnd);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorObj, setErrorObj] = useState(null);
  const reqIdRef = useRef(0);

  useEffect(() => {
    setStartInput(urlStart);
    setEndInput(urlEnd);
  }, [urlStart, urlEnd]);

  const loadAnalytics = useCallback(async () => {
    const reqId = ++reqIdRef.current;
    setLoading(true);
    setErrorObj(null);
    if (urlStart && urlEnd && urlStart > urlEnd) {
      setData(null);
      setLoading(false);
      setErrorObj(new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc."));
      return;
    }
    try {
      const res = await adminService.getAnalytics({
        ...(urlStart ? { start_date: urlStart } : {}),
        ...(urlEnd ? { end_date: urlEnd } : {}),
      });
      if (reqId !== reqIdRef.current) return;
      setData(res);
    } catch (err) {
      if (reqId !== reqIdRef.current) return;
      setData(null);
      setErrorObj(err);
    } finally {
      if (reqId === reqIdRef.current) setLoading(false);
    }
  }, [urlStart, urlEnd]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const applyRange = (start, end) => {
    const next = new URLSearchParams(searchParams);
    if (start) next.set("start_date", start);
    else next.delete("start_date");
    if (end) next.set("end_date", end);
    else next.delete("end_date");
    setSearchParams(next);
  };

  const handleFilterSubmit = (e) => {
    e.preventDefault();
    if (startInput && endInput && startInput > endInput) {
      setErrorObj(new Error("Ngày bắt đầu không được lớn hơn ngày kết thúc."));
      return;
    }
    applyRange(startInput, endInput);
  };

  const series = data?.daily_series || [];
  const maxPaid = Math.max(1, ...series.map((d) => Number(d.paid_revenue ?? d.revenue ?? 0)));

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>
            Báo cáo & phân tích{" "}
            <span className="demo-pill">{data?.timezone || "Asia/Ho_Chi_Minh"}</span>
          </h1>
          <p>Số liệu doanh thu đối soát giữa bảng orders (GMV hợp lệ) và payments (đã thu / hoàn tiền).</p>
        </div>
        <button className="admin-select admin-refresh-btn" onClick={loadAnalytics}>
          <AdminIcon name="refresh" size={14} />
          <span>Làm mới báo cáo</span>
        </button>
      </div>

      <div className="admin-panel" style={{ marginBottom: 16 }}>
        <form className="admin-analytics-filters" onSubmit={handleFilterSubmit}>
          <div>
            <label className="field-label" htmlFor="analytics-start">Từ ngày</label>
            <input
              id="analytics-start"
              type="date"
              className="field"
              value={startInput}
              onChange={(e) => setStartInput(e.target.value)}
            />
          </div>
          <div>
            <label className="field-label" htmlFor="analytics-end">Đến ngày</label>
            <input
              id="analytics-end"
              type="date"
              className="field"
              value={endInput}
              onChange={(e) => setEndInput(e.target.value)}
            />
          </div>
          <div className="admin-analytics-filter-actions">
            <button type="submit" className="btn btn-primary">Áp dụng</button>
            <button
              type="button"
              className="btn btn-quiet"
              onClick={() => applyRange("", "")}
            >
              Toàn thời gian
            </button>
            <button
              type="button"
              className="admin-select"
              onClick={() => applyRange(isoDateDaysAgo(6), isoDateDaysAgo(0))}
            >
              7 ngày
            </button>
            <button
              type="button"
              className="admin-select"
              onClick={() => applyRange(isoDateDaysAgo(29), isoDateDaysAgo(0))}
            >
              30 ngày
            </button>
          </div>
        </form>
      </div>

      {errorObj && <ErrorBox error={errorObj} onRetry={loadAnalytics} variant="inline" />}

      <div className="admin-kpis">
        <div className="kpi">
          <small>Doanh thu đã thanh toán</small>
          <strong>{loading ? "—" : money(data?.paid_revenue ?? data?.revenue)}</strong>
          <span className="change green">Từ payments succeeded</span>
          <span className="kpi-icon green">
            <AdminIcon name="revenue" size={18} />
          </span>
        </div>
        <div className="kpi">
          <small>Tổng giá trị đơn (GMV)</small>
          <strong>{loading ? "—" : money(data?.gross_order_value)}</strong>
          <span className="change">Gồm cả COD chờ thu</span>
          <span className="kpi-icon">
            <AdminIcon name="orders" size={18} />
          </span>
        </div>
        <div className="kpi">
          <small>Hoàn tiền (Refunded)</small>
          <strong>{loading ? "—" : money(data?.refund_amount)}</strong>
          <span className="change down">Giao dịch refunded</span>
          <span className="kpi-icon red">
            <AdminIcon name="alert" size={18} />
          </span>
        </div>
        <div className="kpi">
          <small>Doanh thu ròng (Net)</small>
          <strong>{loading ? "—" : money(data?.net_revenue)}</strong>
          <span className="change">Đơn hợp lệ: {loading ? "—" : data?.orders_count ?? 0} · AOV: {loading ? "—" : money(data?.avg_order_value)}</span>
          <span className="kpi-icon">
            <AdminIcon name="trend" size={18} />
          </span>
        </div>
      </div>

      {series.length > 0 && (
        <div className="admin-panel" style={{ marginBottom: 16 }}>
          <div className="admin-panel-head">
            <h3>Biểu đồ doanh thu đã thanh toán theo ngày ({data?.timezone || "Asia/Ho_Chi_Minh"})</h3>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Khách hàng: {data?.customers_count ?? 0}
            </span>
          </div>
          <div className="admin-status-bars">
            {series.map((item) => {
              const paid = Number(item.paid_revenue ?? item.revenue ?? 0);
              const pct = Math.max(2, Math.round((paid / maxPaid) * 100));
              return (
                <div className="admin-status-row" key={`bar-${item.day}`}>
                  <strong>{item.day}</strong>
                  <div className="admin-status-track">
                    <div className="admin-status-fill" style={{ width: `${paid > 0 ? pct : 0}%` }} />
                  </div>
                  <span style={{ textAlign: "right" }}>
                    {money(paid)} ({item.orders} đơn)
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>Chi tiết đối soát theo ngày ({data?.timezone || "Asia/Ho_Chi_Minh"})</h3>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ngày (VN)</th>
                <th>Số đơn</th>
                <th>Tổng đơn (GMV)</th>
                <th>Đã thanh toán</th>
                <th>Hoàn tiền</th>
                <th>Doanh thu ròng</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="admin-empty">
                    Đang tải dữ liệu phân tích...
                  </td>
                </tr>
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={6} className="admin-empty">
                    Chưa có dữ liệu đơn hàng trong khoảng thời gian đã chọn.
                  </td>
                </tr>
              ) : (
                series.map((item) => (
                  <tr key={item.day}>
                    <td><strong>{item.day}</strong></td>
                    <td>{item.orders} đơn</td>
                    <td>{money(item.gross_order_value ?? item.revenue)}</td>
                    <td><strong>{money(item.paid_revenue ?? item.revenue)}</strong></td>
                    <td>{money(item.refund_amount ?? 0)}</td>
                    <td><strong>{money(item.net_revenue ?? item.paid_revenue ?? item.revenue)}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {data?.metric_definitions && (
          <div className="admin-metric-notes">
            {Object.entries(data.metric_definitions).map(([k, desc]) => (
              <small key={k}>
                <strong>{k}:</strong> {desc}
              </small>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
