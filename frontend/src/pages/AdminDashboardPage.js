import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../api/client";
import { dateTime, money, orderStatusLabel, productImage } from "../api/format";
import { AdminIcon } from "../components/admin/AdminIcons";

const statusColors = {
  delivered: { pill: "green", hex: "#2aa975" },
  confirmed: { pill: "blue", hex: "#2b76eb" },
  shipped: { pill: "blue", hex: "#33bac3" },
  packing: { pill: "yellow", hex: "#f59e0b" },
  pending: { pill: "yellow", hex: "#fbbf69" },
  cancelled: { pill: "red", hex: "#e3496d" },
  expired: { pill: "red", hex: "#94a3b8" },
};

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [dailySeries, setDailySeries] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [dashboard, inventory, analytics] = await Promise.all([
        adminService.getDashboard(),
        adminService.getInventoryBalances(),
        adminService.getAnalytics().catch(() => null),
      ]);
      const balances = inventory?.results || inventory || [];
      setData(dashboard);
      const sortedSeries = [...(analytics?.daily_series || [])].reverse();
      setDailySeries(sortedSeries);
      if (Array.isArray(dashboard?.low_stock_items)) {
        setLowStock(dashboard.low_stock_items);
      } else {
        setLowStock(
          balances
            .filter((x) => Number(x.available) <= Number(x.low_stock_threshold))
            .slice(0, 6)
        );
      }
    } catch (err) {
      setError(err.message || "Không thể tải dữ liệu quản trị.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const maxDayRev = useMemo(
    () => Math.max(1, ...dailySeries.map((d) => Number(d.revenue || 0))),
    [dailySeries]
  );

  // Build dynamic conic-gradient for Donut chart from orders_by_status
  const statusSummary = useMemo(() => {
    const list = data?.orders_by_status || [];
    const total = list.reduce((acc, item) => acc + Number(item.count || 0), 0) || 1;
    let cursor = 0;
    const stops = [];
    const items = list.map((item) => {
      const pct = Math.round((Number(item.count || 0) / total) * 100);
      const hex = statusColors[item.status]?.hex || "#6954f5";
      const start = cursor;
      const end = Math.min(100, cursor + pct);
      cursor = end;
      stops.push(`${hex} ${start}% ${end}%`);
      return {
        ...item,
        pct,
        hex,
        label: orderStatusLabel(item.status),
      };
    });
    if (cursor < 100 && stops.length > 0) {
      stops.push(`#e3e9f3 ${cursor}% 100%`);
    }
    return {
      total: data?.orders_count ?? list.reduce((a, b) => a + b.count, 0),
      gradient: stops.length ? `conic-gradient(${stops.join(", ")})` : undefined,
      items,
    };
  }, [data]);

  // SVG Chart polyline points
  const chartPoints = useMemo(() => {
    if (!dailySeries.length) return { line: "", area: "", dots: [] };
    const w = 560;
    const h = 150;
    const padX = 24;
    const padY = 18;
    const usableW = w - padX * 2;
    const usableH = h - padY * 2;
    const stepX = dailySeries.length > 1 ? usableW / (dailySeries.length - 1) : 0;

    const dots = dailySeries.map((d, i) => {
      const x = padX + i * stepX;
      const ratio = Number(d.revenue || 0) / maxDayRev;
      const y = padY + usableH - ratio * usableH;
      return { x, y, day: String(d.day).slice(5), revenue: d.revenue, orders: d.orders };
    });

    const line = dots.map((p) => `${p.x},${p.y}`).join(" ");
    const area = `${dots[0].x},${padY + usableH} ${line} ${dots[dots.length - 1].x},${padY + usableH}`;
    return { line, area, dots };
  }, [dailySeries, maxDayRev]);

  return (
    <>
      <div className="admin-intro">
        <div>
          <h1>
            Tổng quan <span className="demo-pill">POSTGRESQL TRỰC TIẾP</span>
          </h1>
          <p>Chào mừng bạn trở lại! Đây là trung tâm điều hành dữ liệu thời gian thực CommerceOS.</p>
        </div>
        <button className="admin-select admin-refresh-btn" onClick={load}>
          <AdminIcon name="refresh" size={14} />
          <span>Làm mới dữ liệu</span>
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
          <span className="change green">↑ Thanh toán thành công</span>
          <span className="kpi-icon green">
            <AdminIcon name="revenue" size={18} />
          </span>
        </div>

        <div className="kpi">
          <small>Tổng đơn hàng</small>
          <strong>{loading ? "—" : data?.orders_count ?? 0}</strong>
          <span className="change">↑ Toàn hệ thống PostgreSQL</span>
          <span className="kpi-icon">
            <AdminIcon name="orders" size={18} />
          </span>
        </div>

        <div className="kpi">
          <small>Khách hàng thành viên</small>
          <strong>{loading ? "—" : data?.customers_count ?? 0}</strong>
          <span className="change">↑ Tài khoản đã xác thực</span>
          <span className="kpi-icon">
            <AdminIcon name="customers" size={18} />
          </span>
        </div>

        <div className="kpi">
          <small>Sản phẩm sắp hết</small>
          <strong>{loading ? "—" : data?.low_stock_count ?? 0}</strong>
          <span className="change down">Cần bổ sung tồn kho</span>
          <span className="kpi-icon red">
            <AdminIcon name="alert" size={18} />
          </span>
        </div>
      </div>

      <div className="admin-charts">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <div>
              <h3>Doanh thu & Đơn hàng</h3>
              <div className="chart-legend">
                <span>
                  <i className="legend-dot" />
                  Doanh thu theo ngày
                </span>
                <span>
                  <i className="legend-dot green" />
                  Đơn hàng hợp lệ
                </span>
              </div>
            </div>
            <Link to="/admin/analytics" className="admin-select" style={{ textDecoration: "none" }}>
              14 ngày gần nhất ↗
            </Link>
          </div>

          {dailySeries.length > 0 ? (
            <div className="admin-svg-chart-wrap">
              <svg viewBox="0 0 560 165" className="admin-svg-chart" role="img" aria-label="Biểu đồ doanh thu theo ngày">
                <defs>
                  <linearGradient id="adminRevArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6059f5" stopOpacity="0.32" />
                    <stop offset="100%" stopColor="#58d2c8" stopOpacity="0.02" />
                  </linearGradient>
                </defs>
                {[30, 68, 106, 132].map((yLine) => (
                  <line
                    key={yLine}
                    x1="20"
                    y1={yLine}
                    x2="540"
                    y2={yLine}
                    stroke="#e5ecf6"
                    strokeDasharray="3 3"
                    strokeWidth="1"
                  />
                ))}
                <polygon points={chartPoints.area} fill="url(#adminRevArea)" />
                <polyline
                  fill="none"
                  stroke="#6059f5"
                  strokeWidth="2.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={chartPoints.line}
                />
                {chartPoints.dots.map((pt) => (
                  <g key={pt.day}>
                    <circle cx={pt.x} cy={pt.y} r="4" fill="#ffffff" stroke="#6059f5" strokeWidth="2.4">
                      <title>{`${pt.day}: ${money(pt.revenue)} (${pt.orders} đơn)`}</title>
                    </circle>
                    <text
                      x={pt.x}
                      y="154"
                      textAnchor="middle"
                      fontSize="9.5"
                      fill="#7c889f"
                      fontWeight="600"
                    >
                      {pt.day}
                    </text>
                  </g>
                ))}
              </svg>
            </div>
          ) : (
            <div className="admin-chart-empty">Chưa có dữ liệu doanh thu theo ngày.</div>
          )}
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>Tỷ lệ trạng thái đơn hàng</h3>
            <span className="admin-select">Toàn thời gian</span>
          </div>
          <div className="donut-wrap">
            <div
              className="donut"
              style={statusSummary.gradient ? { background: statusSummary.gradient } : undefined}
            >
              <div className="donut-hole">
                <div>
                  <strong>{statusSummary.total}</strong>
                  <br />
                  <small>Tổng đơn hàng</small>
                </div>
              </div>
            </div>
            <div className="donut-legend">
              {statusSummary.items.map((item) => (
                <div key={item.status} className="donut-legend-row">
                  <span className="donut-dot" style={{ background: item.hex }} />
                  <span>
                    {item.label} · <b>{item.count}</b> ({item.pct}%)
                  </span>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>

      <div className="admin-bottom">
        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>Đơn hàng gần đây</h3>
            <Link className="text-link" to="/admin/orders">
              Xem tất cả ↗
            </Link>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Ngày đặt</th>
                  <th>Tổng tiền</th>
                  <th>Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(data?.recent_orders || []).length ? (
                  data.recent_orders.map((order) => {
                    const pillClass = statusColors[order.status]?.pill || "blue";
                    return (
                      <tr key={order.public_id}>
                        <td>
                          <strong>#{order.order_number}</strong>
                        </td>
                        <td>{order.user__email}</td>
                        <td>{dateTime(order.created_at)}</td>
                        <td>
                          <strong>{money(order.grand_total)}</strong>
                        </td>
                        <td>
                          <span className={`pill ${pillClass}`}>
                            {orderStatusLabel(order.status)}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="5" className="admin-empty">
                      Chưa có đơn hàng.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-head">
            <h3>Sản phẩm tồn kho thấp</h3>
            <Link className="text-link" to="/admin/inventory">
              Xem tất cả ↗
            </Link>
          </div>
          {lowStock.length ? (
            lowStock.map((item) => (
              <div className="admin-lowstock-item" key={item.variant_id}>
                <div className="mini-product">
                  <div className="mini-img">
                    <img
                      src={productImage(item)}
                      alt={item.product_name || item.sku}
                      className="admin-mini-thumb"
                    />
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <b className="admin-lowstock-title">
                    {item.product_name ? `${item.product_name} (${item.sku})` : `SKU: ${item.sku}`}
                  </b>
                  <small className="admin-lowstock-sub">
                    Tồn thực tế: {item.on_hand} · Đang giữ: {item.reserved} · Ngưỡng: {item.low_stock_threshold}
                  </small>
                </div>
                <span className="pill red">Còn {item.available}</span>
              </div>
            ))
          ) : (
            <div className="admin-empty">Không có SKU dưới ngưỡng cảnh báo.</div>
          )}
        </section>
      </div>
    </>
  );
}
