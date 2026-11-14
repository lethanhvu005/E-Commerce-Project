import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminService } from "../api/client";
import { dateTime, money, orderStatusLabel, productImage } from "../api/format";
import { AdminIcon } from "../components/admin/AdminIcons";

const MODERATION_LABELS = {
  published: "Đã duyệt",
  pending: "Chờ duyệt",
  rejected: "Từ chối",
};

const OUTBOX_STATUS_LABELS = {
  logged: "Đã ghi nhật ký",
  sent: "Đã gửi",
  pending: "Chờ xử lý",
  processing: "Đang xử lý",
  failed: "Lỗi gửi",
};

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

const configs = {
  orders: [
    "Quản lý đơn hàng",
    "Dữ liệu đơn hàng truy vấn trực tiếp từ bảng orders trong PostgreSQL.",
    ["Mã đơn", "Khách hàng", "Ngày tạo", "Số SP", "Tổng tiền", "Trạng thái", "Thanh toán", "Thao tác"],
  ],
  customers: [
    "Quản lý khách hàng",
    "Danh sách người dùng và tổng chi tiêu hợp lệ truy vấn trực tiếp từ bảng users & orders.",
    ["Khách hàng", "Vai trò", "Đơn hàng hợp lệ", "Tổng chi", "Trạng thái"],
  ],
  promotions: [
    "Mã giảm giá & chương trình",
    "Dữ liệu ưu đãi truy vấn trực tiếp từ bảng vouchers & voucher_redemptions.",
    ["Mã", "Loại ưu đãi", "Mức giảm", "Lượt dùng", "Trạng thái"],
  ],
  reviews: [
    "Kiểm duyệt đánh giá",
    "Dữ liệu đánh giá truy vấn trực tiếp từ bảng reviews trong PostgreSQL.",
    ["Khách hàng", "Sản phẩm", "Số sao", "Nội dung", "Trạng thái"],
  ],
  support: [
    "Hỏi đáp & Chăm sóc khách hàng",
    "Dữ liệu câu hỏi kỹ thuật truy vấn trực tiếp từ bảng product_questions & product_answers.",
    ["Mã", "Khách hàng", "Sản phẩm", "Nội dung câu hỏi", "Phản hồi", "Trạng thái"],
  ],
  settings: [
    "Nhật ký kiểm toán & Sự kiện Outbox",
    "Dữ liệu truy vấn trực tiếp từ bảng audit_logs và outbox_events trong PostgreSQL.",
    ["Thời gian", "Tác nhân / Topic", "Đối tượng", "Chi tiết", "Trạng thái"],
  ],
};

export function AdminUnavailablePage({ type }) {
  const [title, description, headers] = configs[type] || configs.orders;
  const [searchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState(urlQuery);
  const [debouncedSearch, setDebouncedSearch] = useState(urlQuery.trim());

  useEffect(() => {
    setPage(1);
    setSearch(urlQuery);
    setDebouncedSearch(urlQuery.trim());
  }, [type, urlQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = { q: debouncedSearch, page };
      let res;
      if (type === "orders") res = await adminService.getOrders(params);
      else if (type === "customers") res = await adminService.getCustomers(params);
      else if (type === "promotions") res = await adminService.getPromotions(params);
      else if (type === "reviews") res = await adminService.getReviews(params);
      else if (type === "support") res = await adminService.getQuestions(params);
      else if (type === "settings") {
        const safeFetch = (fn) =>
          fn(params).catch((err) => {
            if (err && err.status === 404 && page > 1) {
              return { count: 0, results: [] };
            }
            throw err;
          });
        const [audits, outbox] = await Promise.all([
          safeFetch(adminService.getAuditLogs),
          safeFetch(adminService.getOutboxEvents),
        ]);
        const auditList = (audits?.results || audits || []).map((a) => ({
          id: `audit-${a.id}`,
          time: a.created_at,
          actor: a.actor_email || "system",
          entity: `${a.entity_type} #${a.entity_id}`,
          detail: a.action,
          status: "logged",
        }));
        const outboxList = (outbox?.results || outbox || []).map((e) => ({
          id: `outbox-${e.id}`,
          time: e.created_at,
          actor: e.topic,
          entity: e.aggregate_id,
          detail: `Outbox (${e.attempts} lần thử)`,
          status: e.status,
        }));
        const merged = [...auditList, ...outboxList].sort(
          (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
        );
        const auditTotal = audits?.count ?? auditList.length;
        const outboxTotal = outbox?.count ?? outboxList.length;
        setRows(merged);
        setTotalCount(auditTotal + outboxTotal);
        setTotalPages(Math.max(1, Math.ceil(Math.max(auditTotal, outboxTotal) / 50)));
        setLoading(false);
        return;
      }
      const list = res?.results || res || [];
      const countVal = res?.count ?? list.length;
      setRows(list);
      setTotalCount(countVal);
      setTotalPages(Math.max(1, Math.ceil(countVal / 20)));
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu từ database.");
    } finally {
      setLoading(false);
    }
  }, [type, debouncedSearch, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOrderStatusTransition = async (order, nextStatus) => {
    if (!nextStatus) return;
    setError("");
    try {
      await adminService.updateOrderStatus(order.public_id, {
        status: nextStatus,
        reason: `Cập nhật từ cổng Admin sang ${nextStatus}`,
        confirm_cod_payment: nextStatus === "delivered",
      });
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể chuyển trạng thái đơn hàng.");
    }
  };

  const handleConfirmPayment = async (order) => {
    setError("");
    try {
      await adminService.confirmOrderPayment(order.public_id, {
        provider_reference: `COD-${order.order_number}`,
      });
      await loadData();
    } catch (err) {
      setError(err.message || "Không thể xác nhận thanh toán.");
    }
  };

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button className="admin-select admin-refresh-btn" onClick={loadData}>
          <AdminIcon name="refresh" size={14} />
          <span>Làm mới từ Database</span>
        </button>
      </div>
      {error && (
        <div className="admin-hero-note admin-error">
          ⚠ <strong>Lỗi tải dữ liệu:</strong> {error}
        </div>
      )}
      <div className="admin-panel">
        <div className="admin-toolbar">
          <input
            className="field"
            placeholder="⌕ Tìm kiếm trong bảng..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
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
                          <small style={{ display: "block", color: "var(--muted)" }}>{row.customer_email}</small>
                        </td>
                        <td>{dateTime(row.created_at)}</td>
                        <td>{row.items_count}</td>
                        <td><strong>{money(row.grand_total)}</strong></td>
                        <td><span className={`pill ${pillColor}`}>{orderStatusLabel(row.status)}</span></td>
                        <td>
                          <span className={`pill ${isPaid ? "green" : row.payment_status === "pending" ? "yellow" : "red"}`}>
                            {isPaid ? "Đã thu tiền" : row.payment_status === "pending" ? "Chờ thu COD" : row.payment_status || "—"}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
                            {nextActions.length > 0 ? (
                              <select
                                className="select"
                                defaultValue=""
                                onChange={(e) => {
                                  handleOrderStatusTransition(row, e.target.value);
                                  e.target.value = "";
                                }}
                              >
                                <option value="" disabled>
                                  Chuyển trạng thái...
                                </option>
                                {nextActions.map(([val, label]) => (
                                  <option key={val} value={val}>
                                    {label}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <span style={{ fontSize: "11.5px", color: "var(--muted)" }}>Hoàn tất</span>
                            )}
                            {row.payment_status === "pending" && row.status !== "cancelled" && row.status !== "expired" && (
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
                    return (
                      <tr key={row.id || row.email}>
                        <td>
                          <strong>{row.full_name}</strong>
                          <small style={{ display: "block", color: "var(--muted)" }}>{row.email}</small>
                        </td>
                        <td>{row.role}</td>
                        <td>{row.orders_count}</td>
                        <td><strong>{money(row.total_spent)}</strong></td>
                        <td>
                          <span className={`pill ${row.is_active ? "green" : "red"}`}>
                            {row.is_active ? "Hoạt động" : "Khóa"}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  if (type === "promotions") {
                    return (
                      <tr key={row.id || row.code}>
                        <td><strong>{row.code}</strong></td>
                        <td>{row.kind === "percent" ? "Phần trăm" : row.kind === "free_ship" ? "Freeship" : "Giảm cố định"}</td>
                        <td>{row.kind === "percent" ? `${row.value}%` : row.kind === "free_ship" ? "Miễn phí ship" : money(row.value)}</td>
                        <td>{row.used_count} / {row.usage_limit || "∞"}</td>
                        <td>
                          <span className={`pill ${row.is_active ? "green" : "red"}`}>
                            {row.is_active ? "Đang chạy" : "Tắt"}
                          </span>
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
                              <img
                                src={productImage(row)}
                                alt={row.product_name}
                                className="admin-mini-thumb"
                              />
                            </span>
                            <span>
                              <strong>{row.product_name}</strong>
                            </span>
                          </div>
                        </td>
                        <td style={{ color: "#f5b324" }}>{"★".repeat(row.stars)}</td>
                        <td>{row.body}</td>
                        <td>
                          <span className={`pill ${row.status === "published" ? "green" : row.status === "rejected" ? "red" : "yellow"}`}>
                            {moderationLabel(row.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  if (type === "support") {
                    return (
                      <tr key={row.id}>
                        <td><strong>#Q{row.id}</strong></td>
                        <td>{row.customer}</td>
                        <td>
                          <div className="mini-product">
                            <span className="mini-img">
                              <img
                                src={productImage(row)}
                                alt={row.product_name}
                                className="admin-mini-thumb"
                              />
                            </span>
                            <span>
                              <strong>{row.product_name}</strong>
                            </span>
                          </div>
                        </td>
                        <td>{row.body}</td>
                        <td>{row.answers_count} phản hồi</td>
                        <td>
                          <span className={`pill ${row.status === "published" ? "green" : row.status === "rejected" ? "red" : "yellow"}`}>
                            {moderationLabel(row.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={row.id}>
                      <td>{dateTime(row.time)}</td>
                      <td><strong>{row.actor}</strong></td>
                      <td>{row.entity}</td>
                      <td>{row.detail}</td>
                      <td>
                        <span className="pill blue">
                          {OUTBOX_STATUS_LABELS[row.status] || row.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingTop: "12px" }}>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Trang {page} / {totalPages}
            </span>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                type="button"
                className="admin-select"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trước
              </button>
              <button
                type="button"
                className="admin-select"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Sau →
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadAnalytics = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await adminService.getAnalytics();
      setData(res);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu báo cáo & phân tích.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const series = data?.daily_series || [];

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Báo cáo & phân tích</h1>
          <p>Số liệu tổng hợp truy vấn trực tiếp từ PostgreSQL (bảng orders & payments).</p>
        </div>
        <button className="admin-select admin-refresh-btn" onClick={loadAnalytics}>
          <AdminIcon name="refresh" size={14} />
          <span>Làm mới báo cáo</span>
        </button>
      </div>
      {error && (
        <div className="admin-hero-note admin-error">
          ⚠ <strong>Không thể tải dữ liệu:</strong> {error}
        </div>
      )}
      <div className="admin-kpis">
        <div className="kpi">
          <small>Doanh thu thực thu</small>
          <strong>{loading ? "—" : money(data?.revenue)}</strong>
          <span className="change green">Từ bảng payments (succeeded)</span>
          <span className="kpi-icon green">
            <AdminIcon name="revenue" size={18} />
          </span>
        </div>
        <div className="kpi">
          <small>Tổng đơn hàng hợp lệ</small>
          <strong>{loading ? "—" : data?.orders_count ?? 0}</strong>
          <span className="change">Không tính đơn đã hủy / hết hạn</span>
          <span className="kpi-icon">
            <AdminIcon name="orders" size={18} />
          </span>
        </div>
        <div className="kpi">
          <small>Khách hàng</small>
          <strong>{loading ? "—" : data?.customers_count ?? 0}</strong>
          <span className="change">Từ bảng users</span>
          <span className="kpi-icon">
            <AdminIcon name="customers" size={18} />
          </span>
        </div>
        <div className="kpi">
          <small>Giá trị đơn trung bình</small>
          <strong>{loading ? "—" : money(data?.avg_order_value)}</strong>
          <span className="change">Trung bình đơn hợp lệ</span>
          <span className="kpi-icon">
            <AdminIcon name="trend" size={18} />
          </span>
        </div>
      </div>
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>Thống kê doanh thu & đơn hàng hợp lệ theo ngày (từ PostgreSQL)</h3>
        </div>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Ngày</th>
                <th>Số lượng đơn hàng</th>
                <th>Tổng giá trị đơn hàng</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={3} className="admin-empty">
                    Đang tải dữ liệu phân tích...
                  </td>
                </tr>
              ) : series.length === 0 ? (
                <tr>
                  <td colSpan={3} className="admin-empty">
                    Chưa có dữ liệu đơn hàng.
                  </td>
                </tr>
              ) : (
                series.map((item) => (
                  <tr key={item.day}>
                    <td><strong>{item.day}</strong></td>
                    <td>{item.orders} đơn</td>
                    <td><strong>{money(item.revenue)}</strong></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
