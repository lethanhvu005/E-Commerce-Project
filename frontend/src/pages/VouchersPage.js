import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { promotionService } from "../api/client";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

export default function VouchersPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const redirectTimerRef = useRef(null);

  const loadVouchers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await promotionService.getVouchers();
      setVouchers(data.results || data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVouchers();
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const handleUseVoucher = (code) => {
    navigator.clipboard?.writeText(code);
    setToastMsg(`Đã sao chép mã ${code}! Đang chuyển đến giỏ hàng...`);
    if (redirectTimerRef.current) {
      clearTimeout(redirectTimerRef.current);
    }
    redirectTimerRef.current = setTimeout(() => {
      navigate("/cart");
    }, 900);
  };

  if (loading && vouchers.length === 0) {
    return (
      <div className="container" style={{ padding: "40px 0" }}>
        <Loading label="Đang tải danh sách ưu đãi..." />
      </div>
    );
  }

  return (
    <div className="container ux-page">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <section className="ux-hero">
        <div>
          <span className="ux-kicker">Chương trình ưu đãi &amp; Khuyến mãi</span>
          <h1>Kho mã giảm giá NEXA</h1>
          <p>Sao chép mã ưu đãi đang có hiệu lực và áp dụng trực tiếp tại bước thanh toán giỏ hàng.</p>
        </div>
      </section>

      {error && <ErrorBox error={error} onRetry={loadVouchers} />}

      {vouchers.length === 0 ? (
        <Empty
          title="Chưa có mã ưu đãi"
          text="Hiện chưa có chương trình khuyến mãi nào đang kích hoạt. Hãy quay lại sau!"
          actionText="Về cửa hàng"
          onAction={() => navigate("/products")}
        />
      ) : (
        <div className="ux-voucher-grid">
          {vouchers.map((v) => (
            <article className="ux-voucher" key={v.id || v.code}>
              <span className="ux-kicker">Mã ưu đãi chính thức</span>
              <h2>{v.name || v.code}</h2>
              <p>
                {v.description ||
                  (v.kind === "percent"
                    ? `Giảm ${v.value}% cho toàn bộ giỏ hàng`
                    : v.kind === "free_ship"
                    ? "Miễn phí vận chuyển toàn quốc"
                    : `Giảm ngay ${v.value} ₫`)}
              </p>
              <code>{v.code}</code>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => handleUseVoucher(v.code)}
              >
                Sao chép &amp; Sử dụng →
              </button>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
