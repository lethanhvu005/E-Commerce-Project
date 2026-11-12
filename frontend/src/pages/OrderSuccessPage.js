import { Link, useSearchParams } from "react-router-dom";

export default function OrderSuccessPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get("order_id") || "";
  const orderNumber = searchParams.get("order_number") || orderId;

  return (
    <div className="container">
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › Đặt hàng thành công
      </div>

      <div className="whitebox success-order" style={{ margin: "35px auto", maxWidth: "620px", textAlign: "center" }}>
        <div className="big-check">✓</div>
        <h1>Đặt hàng thành công!</h1>
        <p style={{ color: "#617b9f", margin: "12px 0 6px" }}>
          Cảm ơn bạn đã lựa chọn NEXA. Đơn hàng của bạn đã được tiếp nhận và chuyển đến bộ phận đóng gói.
        </p>

        {orderNumber && (
          <div style={{ background: "#edf4ff", display: "inline-block", padding: "8px 18px", borderRadius: "8px", margin: "14px 0" }}>
            <span style={{ fontSize: "12px", color: "#6e83a6" }}>Mã đơn hàng: </span>
            <strong style={{ color: "var(--action)", letterSpacing: "1px" }}>{orderNumber}</strong>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginTop: "24px" }}>
          {orderId ? (
            <Link className="btn btn-violet" to={`/orders/${orderId}`}>
              Xem chi tiết đơn hàng
            </Link>
          ) : (
            <Link className="btn btn-violet" to="/orders">
              Theo dõi đơn hàng
            </Link>
          )}
          <Link className="btn btn-dark" to="/products">
            Tiếp tục mua sắm
          </Link>
        </div>
      </div>
    </div>
  );
}
