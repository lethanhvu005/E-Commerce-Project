import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminService } from "../api/client";
import { money } from "../api/format";

const labels = { pending: "Chờ xử lý", confirmed: "Đã xác nhận", processing: "Đang xử lý", shipped: "Đang giao", delivered: "Đã giao", cancelled: "Đã hủy" };

export default function AdminDashboardPage() {
  const [data, setData] = useState(null);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const [dashboard, inventory] = await Promise.all([adminService.getDashboard(), adminService.getInventoryBalances()]);
      const balances = inventory?.results || inventory || [];
      setData(dashboard);
      setLowStock(balances.filter((x) => Number(x.available) <= Number(x.low_stock_threshold)).slice(0, 5));
    } catch (err) { setError(err.message || "Không thể tải dữ liệu quản trị."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
  const max = useMemo(() => Math.max(1, ...(data?.orders_by_status || []).map((x) => x.count)), [data]);

  return <>
    <div className="admin-intro"><div><h1>Tổng quan</h1><p>Chào mừng bạn trở lại! Đây là giao diện quản trị CommerceOS.</p></div><button className="admin-select" onClick={load}>↻ Làm mới dữ liệu</button></div>
    {error && <div className="admin-hero-note admin-error">⚠ <strong>Không thể tải dữ liệu:</strong> {error}</div>}
    <div className="admin-kpis">
      <div className="kpi"><small>Doanh thu</small><strong>{loading ? "—" : money(data?.revenue)}</strong><span className="change green">Thanh toán thành công</span><span className="kpi-icon green">▣</span></div>
      <div className="kpi"><small>Đơn hàng</small><strong>{loading ? "—" : data?.orders_count ?? 0}</strong><span className="change">Toàn hệ thống</span><span className="kpi-icon">♧</span></div>
      <div className="kpi"><small>Khách hàng</small><strong>{loading ? "—" : data?.customers_count ?? 0}</strong><span className="change">Tài khoản khách hàng</span><span className="kpi-icon">♙</span></div>
      <div className="kpi"><small>Sản phẩm sắp hết</small><strong>{loading ? "—" : data?.low_stock_count ?? 0}</strong><span className="change down">Theo ngưỡng tồn kho</span><span className="kpi-icon red">⚠</span></div>
    </div>
    <div className="admin-charts">
      <section className="admin-panel"><div className="admin-panel-head"><div><h3>Doanh thu & đơn hàng</h3><div className="chart-legend"><span><i className="legend-dot" />Dữ liệu thực từ backend</span></div></div></div><div className="admin-chart-empty">API hiện chưa cung cấp chuỗi dữ liệu theo ngày để vẽ biểu đồ.</div></section>
      <section className="admin-panel"><div className="admin-panel-head"><h3>Đơn hàng theo trạng thái</h3></div><div className="admin-status-bars">{(data?.orders_by_status || []).length ? data.orders_by_status.map((row) => <div className="admin-status-row" key={row.status}><span>{labels[row.status] || row.status}</span><div className="admin-status-track"><div className="admin-status-fill" style={{ width: `${(row.count / max) * 100}%` }} /></div><b>{row.count}</b></div>) : <div className="admin-empty">Chưa có đơn hàng.</div>}</div></section>
    </div>
    <div className="admin-bottom">
      <section className="admin-panel"><div className="admin-panel-head"><h3>Đơn hàng gần đây</h3><Link className="text-link" to="/admin/orders">Xem tất cả ↗</Link></div><div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>{(data?.recent_orders || []).length ? data.recent_orders.map((order) => <tr key={order.public_id}><td><strong>{order.order_number}</strong></td><td>{order.user__email}</td><td><strong>{money(order.grand_total)}</strong></td><td><span className="pill blue">{labels[order.status] || order.status}</span></td></tr>) : <tr><td colSpan="4" className="admin-empty">Chưa có đơn hàng.</td></tr>}</tbody></table></div></section>
      <section className="admin-panel"><div className="admin-panel-head"><h3>Sản phẩm tồn kho thấp</h3><Link className="text-link" to="/admin/inventory">Xem tất cả ↗</Link></div>{lowStock.length ? lowStock.map((item) => <div className="admin-stock-row" key={item.variant_id}><div><b>{item.sku}</b><small>Khả dụng: {item.available}</small></div><span className="pill yellow">Ngưỡng {item.low_stock_threshold}</span></div>) : <div className="admin-empty">Không có SKU dưới ngưỡng.</div>}</section>
    </div>
  </>;
}
