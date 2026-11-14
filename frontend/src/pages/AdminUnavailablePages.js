import { useCallback, useEffect, useState } from "react";
import { adminService } from "../api/client";
import { dateTime, money, orderStatusLabel } from "../api/format";

const configs = {
  orders: [
    "Quản lý đơn hàng",
    "Dữ liệu đơn hàng truy vấn trực tiếp từ bảng orders trong PostgreSQL.",
    ["Mã đơn", "Khách hàng", "Ngày tạo", "Số SP", "Tổng tiền", "Trạng thái", "Vận chuyển"],
  ],
  customers: [
    "Quản lý khách hàng",
    "Danh sách người dùng và tổng chi tiêu truy vấn trực tiếp từ bảng users & orders.",
    ["Khách hàng", "Vai trò", "Đơn hàng", "Tổng chi", "Trạng thái"],
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      let res;
      if (type === "orders") res = await adminService.getOrders();
      else if (type === "customers") res = await adminService.getCustomers();
      else if (type === "promotions") res = await adminService.getPromotions();
      else if (type === "reviews") res = await adminService.getReviews();
      else if (type === "support") res = await adminService.getQuestions();
      else if (type === "settings") {
        const [audits, outbox] = await Promise.all([
          adminService.getAuditLogs(),
          adminService.getOutboxEvents(),
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
        setRows([...auditList, ...outboxList]);
        setLoading(false);
        return;
      }
      setRows(res?.results || res || []);
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu từ database.");
    } finally {
      setLoading(false);
    }
  }, [type]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const q = search.trim().toLowerCase();
  const filteredRows = rows.filter((r) => JSON.stringify(r).toLowerCase().includes(q));

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        <button className="admin-select" onClick={loadData}>
          ↻ Làm mới từ Database
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
            onChange={(e) => setSearch(e.target.value)}
          />
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
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={headers.length} className="admin-empty">
                    Không có bản ghi phù hợp.
                  </td>
                </tr>
              ) : (
                filteredRows.map((row) => {
                  if (type === "orders") {
                    return (
                      <tr key={row.id || row.order_number}>
                        <td><strong>{row.order_number}</strong></td>
                        <td>{row.customer_name} <small style={{ display: "block", color: "var(--muted)" }}>{row.customer_email}</small></td>
                        <td>{dateTime(row.created_at)}</td>
                        <td>{row.items_count}</td>
                        <td><strong>{money(row.grand_total)}</strong></td>
                        <td><span className="pill blue">{orderStatusLabel(row.status)}</span></td>
                        <td>{row.shipping_method}</td>
                      </tr>
                    );
                  }
                  if (type === "customers") {
                    return (
                      <tr key={row.id || row.email}>
                        <td><strong>{row.full_name}</strong><small style={{ display: "block", color: "var(--muted)" }}>{row.email}</small></td>
                        <td>{row.role}</td>
                        <td>{row.orders_count}</td>
                        <td><strong>{money(row.total_spent)}</strong></td>
                        <td><span className={`pill ${row.is_active ? "green" : "red"}`}>{row.is_active ? "Hoạt động" : "Khóa"}</span></td>
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
                        <td><span className={`pill ${row.is_active ? "green" : "red"}`}>{row.is_active ? "Đang chạy" : "Tắt"}</span></td>
                      </tr>
                    );
                  }
                  if (type === "reviews") {
                    return (
                      <tr key={row.id}>
                        <td><strong>{row.author}</strong></td>
                        <td>{row.product_name}</td>
                        <td style={{ color: "#f5b324" }}>{"★".repeat(row.stars)}</td>
                        <td>{row.body}</td>
                        <td><span className={`pill ${row.status === "published" ? "green" : "yellow"}`}>{row.status}</span></td>
                      </tr>
                    );
                  }
                  if (type === "support") {
                    return (
                      <tr key={row.id}>
                        <td><strong>#Q{row.id}</strong></td>
                        <td>{row.customer}</td>
                        <td>{row.product_name}</td>
                        <td>{row.body}</td>
                        <td>{row.answers_count} phản hồi</td>
                        <td><span className="pill green">{row.status}</span></td>
                      </tr>
                    );
                  }
                  return (
                    <tr key={row.id}>
                      <td>{dateTime(row.time)}</td>
                      <td><strong>{row.actor}</strong></td>
                      <td>{row.entity}</td>
                      <td>{row.detail}</td>
                      <td><span className="pill blue">{row.status}</span></td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

export function AdminAnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminService
      .getAnalytics()
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const series = data?.daily_series || [];

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>Báo cáo & phân tích</h1>
          <p>Số liệu tổng hợp truy vấn trực tiếp từ PostgreSQL (bảng orders & payments).</p>
        </div>
      </div>
      <div className="admin-kpis">
        <div className="kpi">
          <small>Doanh thu thực thu</small>
          <strong>{loading ? "—" : money(data?.revenue)}</strong>
          <span className="change green">Từ bảng payments (succeeded)</span>
        </div>
        <div className="kpi">
          <small>Tổng đơn hàng</small>
          <strong>{loading ? "—" : data?.orders_count ?? 0}</strong>
          <span className="change">Từ bảng orders</span>
        </div>
        <div className="kpi">
          <small>Khách hàng</small>
          <strong>{loading ? "—" : data?.customers_count ?? 0}</strong>
          <span className="change">Từ bảng users</span>
        </div>
        <div className="kpi">
          <small>Giá trị đơn trung bình</small>
          <strong>{loading ? "—" : money(data?.avg_order_value)}</strong>
          <span className="change">Trung bình grand_total</span>
        </div>
      </div>
      <div className="admin-panel">
        <div className="admin-panel-head">
          <h3>Thống kê doanh thu & đơn hàng theo ngày (từ PostgreSQL)</h3>
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
              {series.length === 0 ? (
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
