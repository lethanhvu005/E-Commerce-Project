import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authService, orderService } from "../api/client";
import { money, dateTime, orderStatusLabel } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { Loading, ErrorBox } from "../components/Feedback";
import { Tilt3DCard } from "../components/Motion3D";

export function AboutPage() {
  return (
    <div className="container ux-page">
      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / STORY / BRAND</span>
          <h1>
            Built for the
            <br />
            <em>extra mile.</em>
          </h1>
          <p>Gear dành cho những người luôn muốn tốt hơn từng ngày.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>
      <div className="ux-two">
        <Tilt3DCard as="section" className="ux-card" intensity={6} scale={1.01}>
          <h2>Thiết bị tốt bắt đầu từ trải nghiệm tốt.</h2>
          <p>
            NEXA là thương hiệu thiết bị ngoại vi chuyên nghiệp, cung cấp bàn phím cơ, chuột gaming,
            tai nghe và phụ kiện công nghệ cao cấp. Toàn bộ trải nghiệm được xây dựng đồng bộ với hệ
            thống dữ liệu CommerceOS và backend PostgreSQL.
          </p>
          <p>
            Brand direction: futuristic gaming · bold typography · thoughtful performance.
          </p>
        </Tilt3DCard>
        <Tilt3DCard as="section" className="ux-card" intensity={6} scale={1.01}>
          <h2>Tiêu chuẩn kỹ thuật NEXA Lab</h2>
          <p>
            Mỗi sản phẩm trước khi đưa vào danh mục đều trải qua kiểm thử độ trễ tín hiệu, độ bền
            switch cơ học 80 triệu lần nhấn và độ ổn định kết nối không dây 2.4GHz.
          </p>
          <Link className="btn btn-violet nexa-btn-3d" to="/products">
            Khám phá bộ sưu tập ↗
          </Link>
        </Tilt3DCard>
      </div>
    </div>
  );
}

export function ContactPage() {
  const { user } = useAuth();
  const supportEmail = (process.env.REACT_APP_SUPPORT_EMAIL || "lethanhvu005@gmail.com").trim();
  const supportPhone = (process.env.REACT_APP_SUPPORT_PHONE || "0947243014").trim();
  const supportPhoneRaw = supportPhone.replace(/\s+/g, "");
  const supportAddress = (
    process.env.REACT_APP_SUPPORT_ADDRESS ||
    "K249 Nguyễn Đình Chiểu, Phường Khuê Mỹ, Quận Ngũ Hành Sơn, Thành phố Đà Nẵng"
  ).trim();
  const googleMapsApiKey = (process.env.REACT_APP_GOOGLE_MAPS_API_KEY || "").trim();
  const hasValidMapsApiKey = /^AIza[0-9A-Za-z_-]{35}$/.test(googleMapsApiKey);

  const mapEmbedUrl = hasValidMapsApiKey
    ? `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(googleMapsApiKey)}&q=${encodeURIComponent(
        supportAddress
      )}&zoom=17&language=vi`
    : `https://maps.google.com/maps?q=${encodeURIComponent(
        supportAddress
      )}&hl=vi&z=17&ie=UTF8&iwloc=B&output=embed`;

  const mapDirectionsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
    supportAddress
  )}`;

  const [formState, setFormState] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "Tư vấn sản phẩm",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    if (user) {
      const fullName = [user.last_name, user.first_name].filter(Boolean).join(" ").trim();
      setFormState((prev) => ({
        ...prev,
        name: prev.name || fullName || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  const handleCopy = (label, text) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedField(label);
        setTimeout(() => setCopiedField(""), 2000);
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitError(null);
    try {
      await authService.submitSupportContact({
        name: formState.name.trim(),
        email: formState.email.trim(),
        phone: formState.phone.trim(),
        subject: formState.subject,
        message: formState.message.trim(),
      });
      setSubmitted(true);
    } catch (err) {
      setSubmitError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container ux-page">
      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / SUPPORT / CONTACT</span>
          <h1>
            Liên hệ &amp; <em>Hỗ trợ.</em>
          </h1>
          <p>
            Kết nối trực tiếp qua Gmail, Hotline hoặc ghé thăm Showroom NEXA. Đội ngũ kỹ thuật luôn
            sẵn sàng hỗ trợ bạn.
          </p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>

      <div className="ux-two">
        {/* Left: Support Request Form */}
        <section className="ux-card">
          <h2>Gửi yêu cầu hỗ trợ</h2>
          {submitted ? (
            <div style={{ padding: "18px 0" }}>
              <div
                style={{
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "rgba(16, 185, 129, 0.12)",
                  border: "1px solid rgba(16, 185, 129, 0.35)",
                  color: "#10b981",
                  fontWeight: 600,
                  marginBottom: "14px",
                }}
              >
                ✓ Đã gửi yêu cầu hỗ trợ thành công tới <strong>{supportEmail}</strong>! Chúng tôi sẽ
                phản hồi bạn sớm nhất.
              </div>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setSubmitted(false);
                  setFormState((prev) => ({ ...prev, message: "" }));
                }}
              >
                Gửi yêu cầu khác
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <label>
                Họ và tên
                <input
                  className="field"
                  name="name"
                  value={formState.name}
                  onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                  placeholder="Họ và tên của bạn"
                  maxLength={80}
                  required
                />
              </label>
              <div className="form-grid">
                <div>
                  <label>
                    Địa chỉ Email / Gmail
                    <input
                      className="field"
                      name="email"
                      type="email"
                      value={formState.email}
                      onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                      placeholder="yourname@gmail.com"
                      maxLength={120}
                      required
                    />
                  </label>
                </div>
                <div>
                  <label>
                    Số điện thoại
                    <input
                      className="field"
                      name="phone"
                      type="tel"
                      value={formState.phone}
                      onChange={(e) => setFormState({ ...formState, phone: e.target.value })}
                      placeholder="0947243014"
                      maxLength={20}
                    />
                  </label>
                </div>
              </div>
              <label>
                Chủ đề cần hỗ trợ
                <select
                  className="field"
                  name="subject"
                  value={formState.subject}
                  onChange={(e) => setFormState({ ...formState, subject: e.target.value })}
                >
                  <option>Tư vấn sản phẩm</option>
                  <option>Trạng thái đơn hàng</option>
                  <option>Bảo hành và đổi trả</option>
                  <option>Hợp tác kinh doanh</option>
                </select>
              </label>
              <label>
                Nội dung chi tiết
                <textarea
                  className="field"
                  name="message"
                  rows={5}
                  minLength={10}
                  maxLength={1000}
                  required
                  value={formState.message}
                  onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                  placeholder="Mô tả chi tiết yêu cầu hỗ trợ, mã đơn hàng hoặc sản phẩm bạn quan tâm..."
                />
              </label>

              {submitError && <ErrorBox error={submitError} variant="inline" />}

              <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", marginTop: "8px" }}>
                <button
                  type="submit"
                  className="btn btn-violet nexa-btn-3d"
                  disabled={submitting}
                >
                  {submitting ? "Đang gửi email..." : "Gửi email trực tiếp ↗"}
                </button>
              </div>
            </form>
          )}
          <p className="ux-note" style={{ marginTop: "14px" }}>
            Email sẽ được gửi trực tiếp qua máy chủ SMTP tới hộp thư{" "}
            <strong>{supportEmail}</strong> (không cần mở ứng dụng mail trên máy).
          </p>
        </section>

        {/* Right: Direct Contact Cards (Gmail, Phone, Address, Hours) */}
        <section className="ux-card">
          <h2>Thông tin liên hệ trực tiếp</h2>

          <div className="ux-contact-tile" style={{ alignItems: "center" }}>
            <span>✉</span>
            <div style={{ flex: 1 }}>
              <b>Gmail hỗ trợ trực tuyến</b>
              <p style={{ margin: "4px 0 0" }}>
                <a
                  href={`mailto:${supportEmail}`}
                  style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                >
                  {supportEmail}
                </a>
              </p>
            </div>
            <button
              type="button"
              className="btn btn-quiet"
              style={{ padding: "6px 12px", fontSize: "12px" }}
              onClick={() => handleCopy("email", supportEmail)}
            >
              {copiedField === "email" ? "Đã chép ✓" : "Sao chép"}
            </button>
          </div>

          <div className="ux-contact-tile" style={{ alignItems: "center" }}>
            <span>☎</span>
            <div style={{ flex: 1 }}>
              <b>Hotline / Zalo hỗ trợ</b>
              <p style={{ margin: "4px 0 0" }}>
                <a
                  href={`tel:${supportPhoneRaw}`}
                  style={{ color: "var(--accent)", fontWeight: 700, textDecoration: "none" }}
                >
                  {supportPhone}
                </a>
              </p>
            </div>
            <a
              href={`tel:${supportPhoneRaw}`}
              className="btn btn-quiet"
              style={{ padding: "6px 12px", fontSize: "12px" }}
            >
              Gọi ngay
            </a>
          </div>

          <div className="ux-contact-tile" style={{ alignItems: "flex-start" }}>
            <span>📍</span>
            <div style={{ flex: 1 }}>
              <b>Địa chỉ Showroom &amp; Trung tâm bảo hành</b>
              <p style={{ margin: "4px 0 0", lineHeight: 1.55 }}>{supportAddress}</p>
            </div>
          </div>

          <div className="ux-contact-tile">
            <span>🕒</span>
            <div>
              <b>Giờ mở cửa &amp; Tiếp nhận bảo hành</b>
              <p style={{ margin: "4px 0 0" }}>Thứ 2 – Chủ Nhật, 08:00 – 21:00</p>
            </div>
          </div>
        </section>
      </div>

      {/* Full-width Google Maps Integration Section */}
      <section className="ux-card" style={{ marginTop: "24px", padding: "24px" }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "12px",
            marginBottom: "16px",
          }}
        >
          <div>
            <span className="ux-kicker">GOOGLE MAPS / VỊ TRÍ SHOWROOM</span>
            <h2 style={{ margin: "4px 0 0" }}>Bản đồ đường đi đến NEXA</h2>
            <p style={{ margin: "4px 0 0", color: "var(--muted)", fontSize: "13.5px" }}>
              {supportAddress}
            </p>
          </div>
          <a
            href={mapDirectionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-primary"
          >
            Chỉ đường trên Google Maps ↗
          </a>
        </div>

        <div
          style={{
            width: "100%",
            height: "400px",
            borderRadius: "14px",
            overflow: "hidden",
            border: "1px solid var(--edge)",
            background: "var(--bg2)",
          }}
        >
          <iframe
            title="Bản đồ vị trí NEXA trên Google Maps"
            src={mapEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0, display: "block" }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </div>
  );
}

export function FaqPage() {
  return (
    <div className="container ux-page">
      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / HELP / FAQ</span>
          <h1>
            Your questions.
            <br />
            <em>Answered.</em>
          </h1>
          <p>Những giải đáp thường gặp khi mua sắm tại NEXA.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>
      <div className="ux-faq">
        <details className="ux-faq-item" open>
          <summary>
            Làm sao để áp voucher giảm giá?<span>＋</span>
          </summary>
          <p>
            Bạn có thể xem các mã ưu đãi trong trang Kho Voucher. Tại giỏ hàng, hãy nhập mã voucher
            vào ô coupon và bấm "Áp dụng" để hệ thống tính toán chiết khấu từ máy chủ.
          </p>
        </details>
        <details className="ux-faq-item">
          <summary>
            Phương thức thanh toán nào được hỗ trợ?<span>＋</span>
          </summary>
          <p>
            NEXA hỗ trợ thanh toán khi nhận hàng (COD) và các cổng thanh toán điện tử. Mọi thông tin
            thanh toán đều được đồng bộ và xác nhận qua API bảo mật.
          </p>
        </details>
        <details className="ux-faq-item">
          <summary>
            Thời gian giao hàng là bao lâu?<span>＋</span>
          </summary>
          <p>
            Đơn hàng nội thành thường được giao trong 1–2 ngày qua hình thức Hỏa tốc, hoặc 2–4 ngày
            qua hình thức Tiêu chuẩn đối với các tỉnh thành khác.
          </p>
        </details>
        <details className="ux-faq-item">
          <summary>
            Tôi có thể theo dõi tiến độ đơn hàng như thế nào?<span>＋</span>
          </summary>
          <p>
            Sau khi đặt hàng, bạn có thể vào trang Quản lý đơn hàng hoặc nhập mã định danh đơn tại
            trang Theo dõi vận chuyển để xem toàn bộ lịch sử trạng thái thời gian thực.
          </p>
        </details>
        <details className="ux-faq-item">
          <summary>
            Chính sách bảo hành sản phẩm ra sao?<span>＋</span>
          </summary>
          <p>
            Tất cả các sản phẩm chính hãng tại NEXA đều có thông tin bảo hành cụ thể được ghi rõ
            trong trang chi tiết sản phẩm (từ 12 đến 24 tháng theo từng danh mục).
          </p>
        </details>
      </div>
    </div>
  );
}

export function ShippingPage() {
  const [methods, setMethods] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    orderService
      .getShippingMethods()
      .then((res) => setMethods(res?.results || res || []))
      .catch(() => setMethods([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="container ux-page">
      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / FULFILLMENT / DELIVERY</span>
          <h1>
            From our setup
            <br />
            <em>to yours.</em>
          </h1>
          <p>Luồng giao hàng minh bạch: từ xác nhận đơn đến bàn giao cho khách.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>
      <div className="ux-two">
        <section className="ux-card">
          <h2>Phương thức giao hàng (từ PostgreSQL)</h2>
          {loading ? (
            <Loading label="Đang tải phương thức giao hàng..." />
          ) : methods.length === 0 ? (
            <p style={{ color: "var(--muted)" }}>Chưa có phương thức giao hàng khả dụng.</p>
          ) : (
            methods.map((m, idx) => (
              <div className="ux-shipping-item" key={m.id || m.code}>
                <strong>
                  {String(idx + 1).padStart(2, "0")} / {m.name} ({m.code})
                </strong>
                <p>
                  Dự kiến {m.min_days}–{m.max_days} ngày làm việc · {money(m.base_fee)}
                  {m.free_threshold ? ` · Miễn phí cho đơn từ ${money(m.free_threshold)}` : ""}
                </p>
              </div>
            ))
          )}
        </section>
        <section className="ux-card">
          <h2>Theo dõi đơn hàng</h2>
          <p>
            Nhập mã đơn hàng của bạn để kiểm tra trạng thái và lịch sử xử lý đơn tức thì.
          </p>
          <Link className="btn btn-violet nexa-btn-3d" to="/tracking">
            Kiểm tra đơn hàng ↗
          </Link>
        </section>
      </div>
    </div>
  );
}

export function PrivacyPage() {
  return (
    <div className="container ux-page">
      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / LEGAL / PRIVACY</span>
          <h1>
            Your data.
            <br />
            <em>Your control.</em>
          </h1>
          <p>Chính sách bảo mật thông tin và an toàn tài khoản tại NEXA CommerceOS.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>
      <section className="ux-card">
        <h2>Cam kết quyền riêng tư</h2>
        <p>
          Hệ thống NEXA sử dụng cơ chế xác thực JWT chuẩn công nghiệp, mã hóa mật khẩu an toàn
          trong cơ sở dữ liệu PostgreSQL. Mọi giao dịch đặt hàng, thông tin địa chỉ và hồ sơ người
          dùng đều được phân quyền nghiêm ngặt.
        </p>
        <p>
          Chúng tôi cam kết không cung cấp thông tin của quý khách cho bất kỳ bên thứ ba không liên
          quan nào ngoài các đối tác vận tải phục vụ vận chuyển đơn hàng.
        </p>
      </section>
    </div>
  );
}

export function TrackingPage() {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const handleTrack = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;
    if (!user) {
      setError(new Error("Vui lòng đăng nhập tài khoản để tra cứu đơn hàng của bạn."));
      return;
    }

    setLoading(true);
    setError(null);
    setOrderData(null);
    setHistoryData([]);

    try {
      const [orderRes, histRes] = await Promise.all([
        orderService.getOrderDetail(trimmed),
        orderService.getOrderHistory(trimmed).catch(() => ({ results: [] })),
      ]);
      setOrderData(orderRes);
      const hList = Array.isArray(histRes) ? histRes : histRes?.results || [];
      setHistoryData(hList);
    } catch (err) {
      setError(
        new Error(
          err.status === 404
            ? `Không tìm thấy đơn hàng "${trimmed}". Vui lòng kiểm tra lại mã UUID của đơn.`
            : err.status === 401
            ? "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để tra cứu đơn hàng."
            : err.message || "Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại sau."
        )
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container ux-page">
      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / ORDERS / TRACKING</span>
          <h1>
            Track every <em>move.</em>
          </h1>
          <p>Kiểm tra thông tin và tiến độ giao hàng của đơn hàng tại NEXA.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>
      <section className="ux-card">
        <h2>Theo dõi vận chuyển</h2>
        {!user && (
          <p style={{ marginBottom: "14px", color: "var(--muted)", fontSize: "13.5px" }}>
            Vui lòng{" "}
            <Link to="/login" state={{ from: { pathname: "/tracking" } }} style={{ color: "var(--action)", fontWeight: 700 }}>
              Đăng nhập
            </Link>{" "}
            để tra cứu trạng thái đơn hàng thuộc tài khoản của bạn.
          </p>
        )}
        <form onSubmit={handleTrack}>
          <label>
            Mã định danh đơn hàng (UUID)
            <input
              name="code"
              className="field"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập mã UUID đơn hàng (ví dụ: b84f67c4-...)"
            />
          </label>
          <button type="submit" className="btn btn-violet nexa-btn-3d" disabled={loading}>
            {loading ? "Đang tra cứu..." : "Tra cứu đơn ↗"}
          </button>
        </form>

        {loading && <Loading label="Đang kiểm tra thông tin đơn hàng từ máy chủ..." />}
        {error && <ErrorBox error={error} variant="inline" />}

        {orderData && (
          <div style={{ marginTop: "24px" }}>
            <div className="whitebox" style={{ padding: "18px", marginBottom: "16px" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "12px",
                }}
              >
                <div>
                  <strong>Đơn hàng #{orderData.order_number || orderData.public_id}</strong>
                  <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "4px" }}>
                    Ngày đặt: {dateTime(orderData.created_at)}
                  </div>
                </div>
                <span className={`status-pill status-${orderData.status}`}>
                  {orderStatusLabel(orderData.status)}
                </span>
              </div>
              <div style={{ fontSize: "14px", lineHeight: "1.7" }}>
                <div>
                  <b>Tổng giá trị:</b>{" "}
                  {money(orderData.grand_total ?? orderData.total ?? orderData.total_amount, orderData.currency)}
                </div>
                <div>
                  <b>Phương thức giao hàng:</b>{" "}
                  {orderData.shipping_method_snapshot ||
                    orderData.shipping_method?.name ||
                    orderData.shipping_method_name ||
                    "Tiêu chuẩn"}
                </div>
              </div>
            </div>

            {historyData.length > 0 && (
              <div>
                <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>Lịch sử tiến trình</h3>
                <div className="order-timeline">
                  {historyData.map((h, idx) => (
                    <div key={h.id || idx} className="timeline-node active">
                      <span className="dot" />
                      <div>
                        <strong>{orderStatusLabel(h.to_status)}</strong>
                        <div style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {dateTime(h.created_at)}
                        </div>
                        {(h.reason || h.note) && (
                          <p style={{ fontSize: "13px", marginTop: "4px" }}>{h.reason || h.note}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <p className="ux-note" style={{ marginTop: "20px" }}>
          Mỗi trạng thái chuyển tiếp đều được ghi nhận trực tiếp trên hệ thống PostgreSQL qua API Order History.
        </p>
      </section>
    </div>
  );
}
