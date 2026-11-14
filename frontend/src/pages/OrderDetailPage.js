import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { orderService } from "../api/client";
import { dateTime, fallbackProductImage, money, orderStatusLabel, productImage } from "../api/format";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

export default function OrderDetailPage() {
  const { id } = useParams();

  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [showCancelPrompt, setShowCancelPrompt] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const loadOrderDetail = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, historyData] = await Promise.all([
        orderService.getOrderDetail(id),
        orderService.getOrderHistory(id).catch(() => ({ results: [] })),
      ]);
      setOrder(detail);
      setHistory(historyData.results || historyData || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrderDetail();
  }, [loadOrderDetail]);

  // Handle Cancel Order
  const handleCancelOrder = async (e) => {
    e.preventDefault();
    if (!cancelReason.trim()) {
      setToastMsg("Vui lòng nhập lý do hủy đơn hàng.");
      return;
    }
    setCancelling(true);
    try {
      const updated = await orderService.cancelOrder(id, cancelReason.trim());
      setOrder(updated);
      setShowCancelPrompt(false);
      setCancelReason("");
      setToastMsg("Đơn hàng đã được hủy thành công.");
      // Reload history
      const freshHistory = await orderService.getOrderHistory(id);
      setHistory(freshHistory.results || freshHistory || []);
    } catch (err) {
      setToastMsg(err.message || "Không thể hủy đơn hàng.");
    } finally {
      setCancelling(false);
    }
  };

  if (loading && !order) {
    return (
      <div className="container" style={{ padding: "50px 0" }}>
        <Loading label="Đang tải chi tiết đơn hàng..." />
      </div>
    );
  }

  if (error && !order) {
    return (
      <div className="container" style={{ padding: "50px 0" }}>
        <ErrorBox error={error} onRetry={loadOrderDetail} />
      </div>
    );
  }

  if (!order) {
    return null;
  }

  const items = order.items || [];
  const canCancel = ["pending", "confirmed", "packing"].includes(order.status);

  return (
    <div className="container" style={{ paddingBottom: "60px" }}>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Breadcrumb */}
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › <Link to="/orders">Đơn hàng của tôi</Link> › {order.order_number || order.public_id}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <h1 className="page-title" style={{ margin: 0 }}>
          Chi tiết đơn #{order.order_number}
        </h1>
        <span style={{ fontSize: "12.5px", color: "var(--muted)" }}>
          Đặt ngày: {dateTime(order.created_at)}
        </span>
      </div>

      <div className="order-detail-grid">
        {/* Left Column: Products List & Action */}
        <div>
          <section className="whitebox" style={{ marginBottom: "20px" }}>
            <h3>Sản phẩm đã đặt ({items.length})</h3>
            <div className="cart-lines">
              {items.map((item) => (
                <article className="cart-line" key={item.id}>
                  <Link
                    className="cart-image"
                    to={item.product_slug ? `/products/${item.product_slug}` : "/products"}
                  >
                    <img
                      src={productImage(item)}
                      alt={item.product_name_snapshot || item.product_name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackProductImage(item);
                      }}
                    />
                  </Link>
                  <div>
                    <strong>{item.product_name_snapshot || item.product_name}</strong>
                    <div style={{ color: "#7c8ba1", fontSize: "12px", marginTop: "2px" }}>
                      SKU: {item.sku_snapshot || item.sku} · Số lượng: {item.quantity}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 700 }}>{money(item.line_total, order.currency)}</div>
                    <small style={{ color: "var(--muted)" }}>{money(item.unit_price_snapshot || item.unit_price)} / sp</small>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* History Timeline */}
          <section className="whitebox">
            <h3>Hành trình đơn hàng</h3>
            {history.length === 0 ? (
              <p style={{ color: "var(--muted)" }}>Đang cập nhật lộ trình giao nhận...</p>
            ) : (
              <div style={{ borderLeft: "2px solid #dce5f2", paddingLeft: "18px", margin: "14px 0 0 6px" }}>
                {history.map((h, idx) => (
                  <div key={idx} style={{ marginBottom: "16px", position: "relative" }}>
                    <div style={{ position: "absolute", left: "-24px", top: "2px", width: "10px", height: "10px", borderRadius: "50%", background: "var(--action)" }} />
                    <strong style={{ fontSize: "13px", color: "var(--ink)", display: "block" }}>
                      {orderStatusLabel(h.to_status)}
                    </strong>
                    <span style={{ fontSize: "11px", color: "var(--muted)" }}>{dateTime(h.created_at)}</span>
                    {h.reason && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#617b9f" }}>{h.reason}</p>}
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Right Column: Breakdown & Delivery Info */}
        <aside>
          {/* Order Summary */}
          <div className="whitebox" style={{ marginBottom: "20px" }}>
            <h3>Thông tin thanh toán</h3>
            <div className="summary-row">
              <span>Trạng thái</span>
              <strong
                style={{
                  color: ["cancelled", "expired"].includes(order.status) ? "#e27682" : "var(--action)",
                }}
              >
                {orderStatusLabel(order.status)}
              </strong>
            </div>
            <div className="summary-row">
              <span>Tạm tính</span>
              <strong>{money(order.subtotal, order.currency)}</strong>
            </div>
            <div className="summary-row">
              <span>Phí vận chuyển</span>
              <strong>{money(order.shipping_fee, order.currency)}</strong>
            </div>
            {(Number(order.discount_total || 0) + Number(order.shipping_discount || 0)) > 0 && (
              <div className="summary-row" style={{ color: "#169569" }}>
                <span>Giảm giá</span>
                <strong>− {money(Number(order.discount_total || 0) + Number(order.shipping_discount || 0), order.currency)}</strong>
              </div>
            )}
            <div className="summary-row total">
              <span>Tổng cộng</span>
              <strong>{money(order.grand_total, order.currency)}</strong>
            </div>
          </div>

          {/* Delivery & Shipping Info */}
          <div className="whitebox" style={{ marginBottom: "20px" }}>
            <h3>Thông tin giao nhận</h3>
            {order.delivery_address ? (
              <div>
                <strong>{order.delivery_address.recipient_name || order.delivery_address.recipient}</strong>
                <div style={{ color: "#617b9f", fontSize: "12px", margin: "4px 0" }}>
                  {order.delivery_address.phone}
                </div>
                <div style={{ color: "#4f6587", fontSize: "12px" }}>
                  {order.delivery_address.address_line || order.delivery_address.address}, {order.delivery_address.ward}, {order.delivery_address.province}
                </div>
              </div>
            ) : (
              <p style={{ color: "var(--muted)" }}>Thông tin địa chỉ giao nhận</p>
            )}

            <div style={{ borderTop: "1px solid #edf1f7", marginTop: "14px", paddingTop: "12px" }}>
              <span style={{ fontSize: "11px", color: "var(--muted)", display: "block" }}>PHƯƠNG THỨC VẬN CHUYỂN</span>
              <strong style={{ fontSize: "13px" }}>
                {order.shipping_method_snapshot?.name || order.shipping_method_snapshot || "Tiêu chuẩn"}
              </strong>
            </div>
          </div>

          {/* Cancel Order Action */}
          {canCancel && (
            <div className="whitebox" style={{ borderColor: "#ff4d6133" }}>
              <h3>Hủy đơn hàng</h3>
              <p style={{ fontSize: "12px", color: "var(--muted)", margin: "0 0 12px" }}>
                Đơn hàng đang ở trạng thái chuẩn bị. Bạn có thể yêu cầu hủy đơn nếu thay đổi nhu cầu.
              </p>

              {showCancelPrompt ? (
                <form onSubmit={handleCancelOrder}>
                  <textarea
                    className="field"
                    rows="2"
                    required
                    placeholder="Nhập lý do hủy đơn..."
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                  />
                  <div style={{ display: "flex", gap: "8px", marginTop: "8px" }}>
                    <button type="submit" className="btn btn-dark" disabled={cancelling} style={{ background: "#d43b62" }}>
                      {cancelling ? "Đang hủy..." : "Xác nhận hủy đơn"}
                    </button>
                    <button type="button" className="btn btn-quiet" onClick={() => setShowCancelPrompt(false)}>
                      Đóng
                    </button>
                  </div>
                </form>
              ) : (
                <button
                  type="button"
                  className="btn btn-quiet"
                  style={{ color: "#d43b62", borderColor: "#fecdd3" }}
                  onClick={() => setShowCancelPrompt(true)}
                >
                  Yêu cầu hủy đơn hàng
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
