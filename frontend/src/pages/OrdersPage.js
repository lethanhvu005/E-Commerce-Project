import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { dateTime, money } from "../api/format";
import { Empty, ErrorBox, Loading } from "../components/Feedback";

const STATUS_LABEL = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  processing: "Đang xử lý",
  shipped: "Đang giao",
  delivered: "Đã giao",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
};

export default function OrdersPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/orders/").then(setData).catch(setError);
  }, []);

  return (
    <div className="page-container">
      <header className="page-heading compact">
        <span className="eyebrow">ORDER HISTORY</span>
        <h1>Đơn hàng của bạn.</h1>
      </header>

      {error && <ErrorBox error={error} />}
      {!data && !error && <Loading />}
      {data?.results?.length === 0 && <Empty title="Bạn chưa có đơn hàng" />}

      {data?.results?.length > 0 && (
        <div className="order-list">
          {data.results.map((order) => (
            <Link className="order-row" to={`/orders/${order.public_id}`} key={order.public_id}>
              <div>
                <span className="eyebrow">{order.order_number}</span>
                <strong>{order.items?.length || 0} sản phẩm</strong>
              </div>
              <span className={`status status-${order.status}`}>
                {STATUS_LABEL[order.status] || order.status}
              </span>
              <span>{dateTime(order.created_at)}</span>
              <strong>{money(order.grand_total, order.currency)}</strong>
              <i>→</i>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
