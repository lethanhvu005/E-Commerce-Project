import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { promotionService } from "../api/client";
import { Tilt3DCard } from "../components/Motion3D";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

export default function VouchersPage() {
  const navigate = useNavigate();
  const [vouchers, setVouchers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

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
  }, []);

  const handleUseVoucher = (code) => {
    navigator.clipboard?.writeText(code);
    setToastMsg(`Đã sao chép mã ${code}! Đang chuyển đến giỏ hàng...`);
    setTimeout(() => {
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

      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">REWARDS / OFFERS</span>
          <h1>
            Good gear.
            <br />
            <em>Better deals.</em>
          </h1>
          <p>Khám phá ưu đãi độc quyền từ NEXA và áp dụng ngay trong giỏ hàng của bạn.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
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
            <Tilt3DCard
              as="article"
              className="ux-voucher"
              key={v.id || v.code}
              intensity={10}
              scale={1.02}
            >
              <span className="ux-kicker">NEXA / REWARDS</span>
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
                className="btn btn-violet nexa-btn-3d"
                onClick={() => handleUseVoucher(v.code)}
              >
                Sao chép & Sử dụng →
              </button>
            </Tilt3DCard>
          ))}
        </div>
      )}
    </div>
  );
}
