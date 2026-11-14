import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { orderService } from "../api/client";
import { dateTime, money } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading } from "../components/Feedback";

const ORDER_FILTER_TABS = [
  { label: "Tất cả", value: "all", statusParam: "" },
  { label: "Chờ xác nhận", value: "pending", statusParam: "pending" },
  { label: "Đang xử lý / Vận chuyển", value: "processing", statusParam: "confirmed,packing,shipped" },
  { label: "Đã giao", value: "delivered", statusParam: "delivered" },
  { label: "Đã hủy", value: "cancelled", statusParam: "cancelled,expired" },
];

function getTimelineStage(status) {
  if (status === "cancelled" || status === "expired") return -1;
  if (status === "delivered" || status === "completed") return 4;
  if (status === "shipped") return 3;
  if (status === "confirmed" || status === "packing" || status === "processing") return 2;
  return 1; // pending
}

export default function OrdersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [orders, setOrders] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const currentTabConfig = ORDER_FILTER_TABS.find((t) => t.value === activeTab) || ORDER_FILTER_TABS[0];

  const loadOrders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await orderService.getOrders({
        status: currentTabConfig.statusParam,
        page,
      });
      const list = data.results || data || [];
      setOrders(list);
      setTotalCount(data.count ?? list.length);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [currentTabConfig.statusParam, page]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/orders" } } });
      return;
    }
    loadOrders();
  }, [user, navigate, loadOrders]);

  const filteredOrders = orders;
  const totalPages = Math.ceil(totalCount / 10) || 1;

  const getStatusLabel = (status) => {
    switch (status) {
      case "pending": return "Chờ xác nhận";
      case "confirmed": return "Đã xác nhận";
      case "packing": return "Đang đóng gói";
      case "processing": return "Đang xử lý";
      case "shipped": return "Đang vận chuyển";
      case "delivered": return "Đã giao hàng";
      case "completed": return "Hoàn thành";
      case "cancelled": return "Đã hủy";
      case "expired": return "Hết hạn giữ chỗ";
      default: return status;
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="container" style={{ padding: "40px 0" }}>
        <Loading label="Đang tải danh sách đơn hàng..." />
      </div>
    );
  }

  return (
    <div className="container">
      {/* Breadcrumb */}
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › <Link to="/account">Tài khoản</Link> › Đơn hàng của tôi
      </div>

      <h1 className="page-title">Đơn hàng của tôi</h1>
      <p className="muted" style={{ fontSize: "12px", margin: "2px 0 16px" }}>
        Theo dõi trạng thái và tiến trình thực hiện của từng đơn hàng từ hệ thống.
      </p>

      {error && <ErrorBox error={error} onRetry={loadOrders} />}

      {/* Tabs */}
      <nav className="order-filters" aria-label="Lọc đơn hàng">
        {ORDER_FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={activeTab === tab.value ? "active" : ""}
            onClick={() => {
              setActiveTab(tab.value);
              setPage(1);
            }}
          >
            {tab.label}
            {activeTab === tab.value ? ` (${totalCount})` : ""}
          </button>
        ))}
      </nav>

      {/* Orders List matching orders.html */}
      {filteredOrders.length === 0 ? (
        <div className="empty" style={{ margin: "25px 0 50px" }}>
          <h2>Không có đơn hàng nào</h2>
          <p>
            {activeTab === "all"
              ? "Bạn chưa có đơn hàng nào trong tài khoản."
              : "Không tìm thấy đơn hàng ở trạng thái này."}
          </p>
          <button className="btn btn-violet" onClick={() => navigate("/products")}>
            Mua sắm ngay
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {filteredOrders.map((order) => {
            const stage = getTimelineStage(order.status);
            const items = order.items || [];

            return (
              <article className="whitebox order-card" key={order.public_id || order.id}>
                {/* Header */}
                <header className="order-card-head">
                  <div>
                    <strong style={{ letterSpacing: "0.5px" }}>
                      {order.order_number || order.public_id}
                    </strong>
                    <span>{dateTime(order.created_at)}</span>
                  </div>
                  <span className={`order-status ${order.status === "cancelled" ? "cancelled" : stage === 4 ? "delivered" : ""}`}>
                    {getStatusLabel(order.status)}
                  </span>
                </header>

                {/* Timeline */}
                {stage < 0 ? (
                  <div className="order-cancelled" style={{ margin: "18px 0", color: "#e27682", fontWeight: 700 }}>
                    ✕ Đơn hàng đã bị hủy
                  </div>
                ) : (
                  <ol className="order-timeline">
                    {["Đặt hàng", "Chờ xác nhận", "Đã xác nhận", "Đang vận chuyển", "Đã giao"].map((label, idx) => (
                      <li
                        key={idx}
                        className={idx < stage ? "done" : idx === stage ? "current" : ""}
                      >
                        <span>{idx < stage ? "✓" : idx + 1}</span>
                        <b>{label}</b>
                      </li>
                    ))}
                  </ol>
                )}

                {/* Items snapshot */}
                <div className="order-items">
                  {items.map((item) => (
                    <div key={item.id}>
                      <span>
                        {item.product_name_snapshot || item.product_name || "Sản phẩm"} × {item.quantity}
                      </span>
                      <strong>{money(item.line_total)}</strong>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <footer className="order-card-foot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link
                    to={`/orders/${order.public_id}`}
                    style={{ color: "var(--action)", fontWeight: 700, fontSize: "12.5px" }}
                  >
                    Xem chi tiết đơn hàng →
                  </Link>
                  <b>Tổng cộng: {money(order.grand_total, order.currency)}</b>
                </footer>
              </article>
            );
          })}
          {totalPages > 1 && (
            <nav
              className="pagination nexa-pagination"
              aria-label="Phân trang đơn hàng"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "12px",
                marginTop: "24px",
              }}
            >
              <button
                type="button"
                className="btn btn-quiet"
                disabled={page <= 1 || loading}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                ← Trang trước
              </button>
              <span className="nexa-page-indicator">
                Trang <b>{page}</b> / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-quiet"
                disabled={page >= totalPages || loading}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Trang sau →
              </button>
            </nav>
          )}
        </div>
      )}
    </div>
  );
}
