import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { paymentService } from "../api/client";
import { money } from "../api/format";
import { ErrorBox, Loading } from "../components/Feedback";

export default function VnpayReturnPage() {
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [retryingPay, setRetryingPay] = useState(false);
  const [error, setError] = useState(null);
  const [retryError, setRetryError] = useState(null);
  const [result, setResult] = useState(null);

  const verifyReturn = useCallback(async () => {
    const paramsObj = {};
    searchParams.forEach((value, key) => {
      paramsObj[key] = value;
    });

    if (!paramsObj.vnp_TxnRef || !paramsObj.vnp_SecureHash) {
      setError(new Error("Thiếu thông tin chữ ký hoặc mã giao dịch VNPay trong đường dẫn phản hồi."));
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await paymentService.verifyVnpayReturn(paramsObj);
      setResult(res);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    verifyReturn();
  }, [verifyReturn]);

  const handleRetryVnpay = async () => {
    if (!result?.order_id) return;
    setRetryingPay(true);
    setRetryError(null);
    try {
      const res = await paymentService.createVnpayUrl({ order_id: result.order_id });
      if (res?.payment_url) {
        window.location.assign(res.payment_url);
      }
    } catch (err) {
      setRetryError(err);
    } finally {
      setRetryingPay(false);
    }
  };

  return (
    <div className="container" style={{ paddingBottom: "60px" }}>
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › <Link to="/orders">Đơn hàng</Link> › Kết quả thanh toán VNPay
      </div>

      <div className="whitebox success-order" style={{ margin: "28px auto", maxWidth: "620px" }}>
        {loading ? (
          <Loading label="Đang xác thực chữ ký và kết quả giao dịch VNPay..." />
        ) : error ? (
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Không thể xác minh thanh toán VNPay</h2>
            <ErrorBox error={error} onRetry={verifyReturn} />
            <div style={{ display: "flex", gap: "12px", marginTop: "18px", flexWrap: "wrap" }}>
              <Link className="btn btn-primary" to="/orders">
                Xem danh sách đơn hàng
              </Link>
              <Link className="btn btn-quiet" to="/">
                Về trang chủ
              </Link>
            </div>
          </div>
        ) : result?.paid ? (
          <div style={{ textAlign: "center" }}>
            <div className="big-check">✓</div>
            <h1>Thanh toán VNPay thành công!</h1>
            <p style={{ color: "var(--muted)", margin: "10px 0 16px" }}>
              Đơn hàng của bạn đã được xác nhận thanh toán tự động và chuyển sang bộ phận xử lý.
            </p>

            <div
              style={{
                textAlign: "left",
                background: "var(--bg2)",
                border: "1px solid var(--edge)",
                borderRadius: "10px",
                padding: "14px 18px",
                margin: "16px 0",
                display: "grid",
                gap: "8px",
                fontSize: "13px",
              }}
            >
              {result.order_number && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: "var(--muted)" }}>Mã đơn hàng</span>
                  <strong>#{result.order_number}</strong>
                </div>
              )}
              {result.transaction_no && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: "var(--muted)" }}>Mã giao dịch VNPay</span>
                  <strong>{result.transaction_no}</strong>
                </div>
              )}
              {result.amount != null && (
                <div style={{ display: "flex", justifyContent: "space-between", gap: "12px" }}>
                  <span style={{ color: "var(--muted)" }}>Số tiền đã thanh toán</span>
                  <strong style={{ color: "#169569" }}>{money(result.amount)}</strong>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "center", gap: "12px", flexWrap: "wrap", marginTop: "20px" }}>
              {result.order_id && (
                <Link className="btn btn-primary" to={`/orders/${result.order_id}`}>
                  Xem chi tiết đơn hàng
                </Link>
              )}
              <Link className="btn btn-quiet" to="/products">
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>
        ) : result?.awaiting_ipn ? (
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Đang chờ cổng VNPay đồng bộ xác nhận</h2>
            <p style={{ color: "var(--muted)", fontSize: "13.5px", lineHeight: 1.6 }}>
              {result.message || "Chữ ký hợp lệ. Hệ thống đang chờ phản hồi IPN từ VNPay để hoàn tất xác nhận đơn hàng."}
            </p>
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
              <button type="button" className="btn btn-primary" onClick={verifyReturn}>
                Kiểm tra lại trạng thái
              </button>
              {result.order_id && (
                <Link className="btn btn-quiet" to={`/orders/${result.order_id}`}>
                  Xem chi tiết đơn hàng
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div>
            <h2 style={{ margin: "0 0 8px" }}>Thanh toán VNPay chưa hoàn tất</h2>
            <ErrorBox error={result?.message || "Giao dịch thanh toán chưa được xác nhận."} />
            <div style={{ display: "flex", gap: "10px", marginTop: "16px", flexWrap: "wrap" }}>
              {result?.order_id && (
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={retryingPay}
                  onClick={handleRetryVnpay}
                >
                  {retryingPay ? "Đang chuyển sang VNPay..." : "Thanh toán lại qua VNPay ↗"}
                </button>
              )}
              {result?.order_id && (
                <Link className="btn btn-quiet" to={`/orders/${result.order_id}`}>
                  Xem chi tiết đơn hàng
                </Link>
              )}
            </div>
            {retryError && <ErrorBox error={retryError} />}
          </div>
        )}
      </div>
    </div>
  );
}
