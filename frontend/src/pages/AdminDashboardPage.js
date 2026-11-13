import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminService, catalogService, orderService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading } from "../components/Feedback";

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    productsCount: 0,
    inventoryBalancesCount: 0,
    ordersCount: 0,
    recentAuditLogs: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/admin" } } });
      return;
    }

    const fetchStats = async () => {
      try {
        setError("");
        const [prodRes, invRes, orderRes, auditRes] = await Promise.all([
          catalogService.getProducts({ page_size: 1 }),
          adminService.getInventoryBalances(),
          orderService.getOrders({ page_size: 1 }),
          adminService.getAuditLogs(),
        ]);

        const pCount = prodRes.count ?? (Array.isArray(prodRes.results) ? prodRes.results.length : 0);
        const invList = Array.isArray(invRes) ? invRes : invRes.results || [];
        const oCount = orderRes.count ?? (Array.isArray(orderRes.results) ? orderRes.results.length : 0);
        const auditList = Array.isArray(auditRes) ? auditRes : auditRes.results || [];

        setStats({
          productsCount: pCount,
          inventoryBalancesCount: invList.length,
          ordersCount: oCount,
          recentAuditLogs: auditList.slice(0, 5),
        });
      } catch (err) {
        setError(
          err.status === 403
            ? "Tài khoản hiện tại không có quyền truy cập khu vực quản trị."
            : err.message
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [user, navigate]);

  return (
    <div className="container" style={{ padding: "30px 0 80px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "16px", marginBottom: "24px" }}>
        <div>
          <span className="ux-kicker" style={{ color: "var(--action)" }}>COMMERCEOS / ADMIN</span>
          <h1 className="page-title" style={{ margin: "4px 0" }}>Tổng quan Quản trị</h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            Hệ thống quản lý thời gian thực kết nối trực tiếp cơ sở dữ liệu PostgreSQL.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <Link className="btn btn-violet" to="/admin/inventory">
            Quản lý kho hàng (Tồn kho) ↗
          </Link>
          <Link className="btn btn-quiet" to="/">
            Xem cửa hàng →
          </Link>
        </div>
      </div>

      {loading ? (
        <Loading label="Đang nạp dữ liệu quản trị..." />
      ) : error ? (
        <ErrorBox message={error} />
      ) : (
        <>
          <div className="admin-kpis" style={{ marginBottom: "32px" }}>
            <div className="kpi">
              <small>Sản phẩm trong Catalog</small>
              <strong>{stats.productsCount}</strong>
              <span className="change green">Đang hoạt động</span>
              <span className="kpi-icon">⬡</span>
            </div>
            <div className="kpi">
              <small>Bản ghi tồn kho SKU</small>
              <strong>{stats.inventoryBalancesCount}</strong>
              <span className="change">Cập nhật thời gian thực</span>
              <span className="kpi-icon green">▣</span>
            </div>
            <div className="kpi">
              <small>Tổng đơn hàng hệ thống</small>
              <strong>{stats.ordersCount}</strong>
              <span className="change">Đã ghi nhận</span>
              <span className="kpi-icon">♧</span>
            </div>
          </div>

          <div className="ux-two">
            <section className="ux-card">
              <h2>Lối tắt quản lý</h2>
              <p style={{ marginBottom: "16px" }}>Truy cập nhanh các phân hệ nghiệp vụ hệ thống:</p>
              <div style={{ display: "grid", gap: "12px" }}>
                <Link
                  to="/admin/inventory"
                  className="whitebox"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <strong>Quản lý tồn kho & Điều chỉnh Stock</strong>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                      Xem On-Hand, Reserved, Available; tạo phiếu điều chỉnh stock qua API.
                    </div>
                  </div>
                  <span style={{ fontSize: "18px" }}>→</span>
                </Link>
                <Link
                  to="/orders"
                  className="whitebox"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <strong>Quản lý đơn đặt hàng</strong>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                      Xem danh sách đơn, chi tiết đơn hàng và lịch sử timeline.
                    </div>
                  </div>
                  <span style={{ fontSize: "18px" }}>→</span>
                </Link>
                <Link
                  to="/products"
                  className="whitebox"
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "16px",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid var(--border)",
                  }}
                >
                  <div>
                    <strong>Danh mục & Sản phẩm</strong>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                      Duyệt tất cả sản phẩm, bộ lọc ngành hàng và thương hiệu.
                    </div>
                  </div>
                  <span style={{ fontSize: "18px" }}>→</span>
                </Link>
              </div>
            </section>

            <section className="ux-card">
              <h2>Nhật ký vận hành gần nhất</h2>
              {stats.recentAuditLogs.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>Chưa có bản ghi nhật ký vận hành nào.</p>
              ) : (
                <div style={{ display: "grid", gap: "10px" }}>
                  {stats.recentAuditLogs.map((log) => (
                    <div
                      key={log.id}
                      style={{
                        padding: "12px",
                        background: "rgba(255, 255, 255, 0.03)",
                        borderRadius: "8px",
                        fontSize: "13px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                        <strong>{log.action}</strong>
                        <span style={{ color: "var(--muted)", fontSize: "11px" }}>{log.created_at?.slice(0, 16)}</span>
                      </div>
                      <div style={{ color: "var(--muted)", fontSize: "12px" }}>
                        Bởi: {log.actor_email || "Hệ thống"} · Đối tượng: {log.entity_type} #{log.entity_id}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}
