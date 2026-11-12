import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";
import { dateTime, money } from "../api/format";
import { ErrorBox, Loading } from "../components/Feedback";

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function OrderDetailPage() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);

  const load = () =>
    Promise.all([api.get(`/orders/${id}/`), api.get(`/orders/${id}/history/`)])
      .then(([detail, events]) => { setOrder(detail); setHistory(events.results || []); })
      .catch(setError);

  useEffect(load, [id]);

  const cancel = async () => {
    const reason = window.prompt("Lý do hủy đơn:");
    if (!reason) return;
    try { const updated = await api.post(`/orders/${id}/cancel/`, { reason }); setOrder(updated); }
    catch (e) { setError(e); }
  };

  if (error && !order) return <div className="page-container"><ErrorBox error={error} /></div>;
  if (!order) return <Loading />;

  return (
    <div className="page-container">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/orders">Đơn hàng</Link>
        <span>/</span>
        <strong>{order.order_number}</strong>
      </div>

      {/* Heading */}
      <header className="order-heading">
        <div>
          <span className="eyebrow">{order.order_number}</span>
          <h1>Chi tiết đơn hàng</h1>
          <p>Đặt lúc {dateTime(order.created_at)}</p>
        </div>
        <span className={`status status-${order.status}`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>
      </header>

      {error && <ErrorBox error={error} />}

      <div className="order-detail-grid">
        {/* Products & totals */}
        <section className="panel-card">
          <h2>Sản phẩm</h2>
          {order.items.map((item) => (
            <div className="order-product" key={item.id}>
              <div>
                <strong>{item.product_name_snapshot}</strong>
                <small>{item.sku_snapshot} · SL {item.quantity}</small>
              </div>
              <strong>{money(item.line_total, order.currency)}</strong>
            </div>
          ))}

          <div className="price-breakdown">
            <div><span>Tạm tính</span><strong>{money(order.subtotal)}</strong></div>
            <div><span>Vận chuyển</span><strong>{money(order.shipping_fee)}</strong></div>
            <div>
              <span>Giảm giá</span>
              <strong>− {money(Number(order.discount_total) + Number(order.shipping_discount))}</strong>
            </div>
            <div className="summary-total">
              <span>Tổng cộng</span>
              <strong>{money(order.grand_total)}</strong>
            </div>
          </div>

          {["pending", "confirmed"].includes(order.status) && (
            <button className="danger-button" onClick={cancel}>Hủy đơn hàng</button>
          )}
        </section>

        {/* Delivery & timeline */}
        <aside>
          <section className="panel-card">
            <h2>Giao tới</h2>
            {order.delivery_address ? (
              <>
                <strong>{order.delivery_address.recipient}</strong>
                <p>{order.delivery_address.phone}</p>
                <p>{order.delivery_address.address}, {order.delivery_address.ward}, {order.delivery_address.province}</p>
              </>
            ) : <p>Đang cập nhật.</p>}
            <h3>Phương thức</h3>
            <p>{order.shipping_method_snapshot?.name || "Tiêu chuẩn"}</p>
          </section>

          <section className="panel-card">
            <h2>Hành trình đơn</h2>
            {history.map((item, index) => (
              <div className="timeline-item" key={index}>
                <i />
                <div>
                  <strong>{STATUS_LABEL[item.to_status] || item.to_status}</strong>
                  <small>{dateTime(item.created_at)}</small>
                  {item.reason && <p>{item.reason}</p>}
                </div>
              </div>
            ))}
          </section>
        </aside>
      </div>
    </div>
  );
}
