import { useState } from "react";
import { Link } from "react-router-dom";
import { orderService } from "../api/client";
import { money, dateTime } from "../api/format";
import { Loading, ErrorBox } from "../components/Feedback";

export function AboutPage() {
  return (
    <main className="main-with-mobile light-area" id="main">
      <div className="container ux-page">
        <section className="ux-hero">
          <div>
            <span className="ux-kicker">NEXA / STORY / BRAND</span>
            <h1>Built for the<br /><em>extra mile.</em></h1>
            <p>Gear dành cho những người luôn muốn tốt hơn từng ngày.</p>
          </div>
          <span className="ux-hero-orbit" aria-hidden="true">N</span>
        </section>
        <section className="ux-card">
          <h2>Thiết bị tốt bắt đầu từ trải nghiệm tốt.</h2>
          <p>
            NEXA là thương hiệu thiết bị ngoại vi chuyên nghiệp, cung cấp bàn phím cơ,
            chuột gaming, tai nghe và phụ kiện công nghệ cao cấp. Toàn bộ trải nghiệm
            được xây dựng đồng bộ với hệ thống dữ liệu CommerceOS và backend PostgreSQL.
          </p>
          <p>
            Brand direction: futuristic gaming · bold typography · thoughtful performance.
          </p>
        </section>
      </div>
    </main>
  );
}

export function ContactPage() {
  const [formState, setFormState] = useState({ name: "", email: "", subject: "Tư vấn sản phẩm", message: "" });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const mailto = `mailto:support@nexa.example?subject=${encodeURIComponent(
      `[${formState.subject}] từ ${formState.name}`
    )}&body=${encodeURIComponent(
      `Họ tên: ${formState.name}\nEmail: ${formState.email}\n\nNội dung:\n${formState.message}`
    )}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <main className="main-with-mobile light-area" id="main">
      <div className="container ux-page">
        <section className="ux-hero">
          <div>
            <span className="ux-kicker">NEXA / SUPPORT / CONTACT</span>
            <h1>Let’s <em>talk.</em></h1>
            <p>Bạn có câu hỏi về sản phẩm, đơn hàng hay hợp tác? Hãy để lại lời nhắn.</p>
          </div>
          <span className="ux-hero-orbit" aria-hidden="true">N</span>
        </section>
        <div className="ux-two">
          <section className="ux-card">
            <h2>Gửi yêu cầu hỗ trợ</h2>
            {submitted ? (
              <div style={{ padding: "16px 0", color: "var(--nexa-emerald, #10b981)" }}>
                ✓ Đã mở ứng dụng gửi thư. Đội ngũ NEXA sẽ phản hồi bạn sớm nhất!
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <label>
                  Họ tên
                  <input
                    className="field"
                    name="name"
                    value={formState.name}
                    onChange={(e) => setFormState({ ...formState, name: e.target.value })}
                    placeholder="Họ tên của bạn"
                    maxLength={80}
                    required
                  />
                </label>
                <label>
                  Email
                  <input
                    className="field"
                    name="email"
                    type="email"
                    value={formState.email}
                    onChange={(e) => setFormState({ ...formState, email: e.target.value })}
                    placeholder="example@gmail.com"
                    maxLength={120}
                    required
                  />
                </label>
                <label>
                  Chủ đề
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
                  Nội dung
                  <textarea
                    className="field"
                    name="message"
                    rows={5}
                    minLength={10}
                    maxLength={1000}
                    required
                    value={formState.message}
                    onChange={(e) => setFormState({ ...formState, message: e.target.value })}
                    placeholder="Nội dung cần hỗ trợ..."
                  />
                </label>
                <button type="submit" className="btn btn-violet">
                  Gửi yêu cầu hỗ trợ ↗
                </button>
              </form>
            )}
            <p className="ux-note">Ứng dụng email của bạn sẽ được kích hoạt để gửi trực tiếp đến trung tâm hỗ trợ.</p>
          </section>
          <section className="ux-card">
            <h2>Chúng tôi luôn ở đây.</h2>
            <div className="ux-contact-tile">
              <span>✉</span>
              <div>
                <b>Liên hệ qua email</b>
                <p>support@nexa.example</p>
              </div>
            </div>
            <div className="ux-contact-tile">
              <span>▷</span>
              <div>
                <b>Giờ hoạt động</b>
                <p>Thứ 2 – Thứ 7, 8:00 – 20:00</p>
              </div>
            </div>
            <div className="ux-contact-tile">
              <span>☎</span>
              <div>
                <b>Hỗ trợ kỹ thuật</b>
                <p>Phản hồi trong vòng 24 giờ</p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

export function FaqPage() {
  return (
    <main className="main-with-mobile light-area" id="main">
      <div className="container ux-page">
        <section className="ux-hero">
          <div>
            <span className="ux-kicker">NEXA / HELP / FAQ</span>
            <h1>Your questions.<br /><em>Answered.</em></h1>
            <p>Những giải đáp thường gặp khi mua sắm tại NEXA.</p>
          </div>
          <span className="ux-hero-orbit" aria-hidden="true">N</span>
        </section>
        <div className="ux-faq">
          <details className="ux-faq-item">
            <summary>Làm sao để áp voucher giảm giá?<span>＋</span></summary>
            <p>
              Bạn có thể xem các mã ưu đãi trong trang Vouchers. Tại giỏ hàng, hãy nhập mã voucher
              vào ô coupon và bấm "Áp dụng" để hệ thống tính toán chiết khấu từ máy chủ.
            </p>
          </details>
          <details className="ux-faq-item">
            <summary>Phương thức thanh toán nào được hỗ trợ?<span>＋</span></summary>
            <p>
              NEXA hỗ trợ thanh toán khi nhận hàng (COD) và các cổng thanh toán điện tử. Mọi thông tin
              thanh toán đều được đồng bộ và xác nhận qua API bảo mật.
            </p>
          </details>
          <details className="ux-faq-item">
            <summary>Thời gian giao hàng là bao lâu?<span>＋</span></summary>
            <p>
              Đơn hàng nội thành thường được giao trong 1–2 ngày qua hình thức Hỏa tốc, hoặc 2–4 ngày
              qua hình thức Tiêu chuẩn đối với các tỉnh thành khác.
            </p>
          </details>
          <details className="ux-faq-item">
            <summary>Tôi có thể theo dõi tiến độ đơn hàng như thế nào?<span>＋</span></summary>
            <p>
              Sau khi đặt hàng, bạn có thể vào trang Quản lý đơn hàng hoặc nhập mã định danh đơn tại
              trang Theo dõi vận chuyển để xem toàn bộ lịch sử trạng thái thời gian thực.
            </p>
          </details>
          <details className="ux-faq-item">
            <summary>Chính sách bảo hành sản phẩm ra sao?<span>＋</span></summary>
            <p>
              Tất cả các sản phẩm chính hãng tại NEXA đều có thông tin bảo hành cụ thể được ghi rõ
              trong trang chi tiết sản phẩm (từ 12 đến 24 tháng theo từng danh mục).
            </p>
          </details>
        </div>
      </div>
    </main>
  );
}

export function ShippingPage() {
  return (
    <main className="main-with-mobile light-area" id="main">
      <div className="container ux-page">
        <section className="ux-hero">
          <div>
            <span className="ux-kicker">NEXA / FULFILLMENT / DELIVERY</span>
            <h1>From our setup<br /><em>to yours.</em></h1>
            <p>Luồng giao hàng minh bạch: từ xác nhận đơn đến bàn giao cho khách.</p>
          </div>
          <span className="ux-hero-orbit" aria-hidden="true">N</span>
        </section>
        <div className="ux-two">
          <section className="ux-card">
            <h2>Phương thức giao hàng</h2>
            <div className="ux-shipping-item">
              <strong>01 / Giao hàng tiêu chuẩn (Standard)</strong>
              <p>Dự kiến 2–4 ngày làm việc · 30.000 ₫ · Miễn phí khi đạt điều kiện ưu đãi.</p>
            </div>
            <div className="ux-shipping-item">
              <strong>02 / Giao hàng hỏa tốc (Express)</strong>
              <p>Dự kiến 1–2 ngày làm việc · 50.000 ₫ · Giao nhanh ưu tiên.</p>
            </div>
            <div className="ux-shipping-item">
              <strong>03 / Theo dõi tiến độ (Tracking)</strong>
              <p>Cập nhật trạng thái từng chặng: Chờ xác nhận, Đã xác nhận, Đang giao, Hoàn thành.</p>
            </div>
          </section>
          <section className="ux-card">
            <h2>Theo dõi đơn hàng</h2>
            <p>Nhập mã đơn hàng của bạn để kiểm tra trạng thái và lịch sử xử lý đơn tức thì.</p>
            <Link className="btn btn-violet" to="/tracking">
              Kiểm tra đơn hàng ↗
            </Link>
          </section>
        </div>
      </div>
    </main>
  );
}

export function PrivacyPage() {
  return (
    <main className="main-with-mobile light-area" id="main">
      <div className="container ux-page">
        <section className="ux-hero">
          <div>
            <span className="ux-kicker">NEXA / LEGAL / PRIVACY</span>
            <h1>Your data.<br /><em>Your control.</em></h1>
            <p>Chính sách bảo mật thông tin và an toàn tài khoản tại NEXA CommerceOS.</p>
          </div>
          <span className="ux-hero-orbit" aria-hidden="true">N</span>
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
    </main>
  );
}

export function TrackingPage() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [orderData, setOrderData] = useState(null);
  const [historyData, setHistoryData] = useState([]);

  const handleTrack = async (e) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    setLoading(true);
    setError(null);
    setOrderData(null);
    setHistoryData([]);

    try {
      const [orderRes, histRes] = await Promise.all([
        orderService.getOrderDetail(trimmed),
        orderService.getOrderHistory(trimmed).catch(() => [])
      ]);
      setOrderData(orderRes);
      const hList = Array.isArray(histRes)
        ? histRes
        : histRes?.results || [];
      setHistoryData(hList);
    } catch (err) {
      setError(
        err.status === 404
          ? `Không tìm thấy đơn hàng "${trimmed}". Vui lòng kiểm tra lại mã UUID của đơn.`
          : "Không thể tra cứu đơn hàng lúc này. Vui lòng thử lại sau."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="main-with-mobile light-area" id="main">
      <div className="container ux-page">
        <section className="ux-hero">
          <div>
            <span className="ux-kicker">NEXA / ORDERS / TRACKING</span>
            <h1>Track every <em>move.</em></h1>
            <p>Kiểm tra thông tin và tiến độ giao hàng của đơn hàng tại NEXA.</p>
          </div>
          <span className="ux-hero-orbit" aria-hidden="true">N</span>
        </section>
        <section className="ux-card">
          <h2>Theo dõi vận chuyển</h2>
          <form onSubmit={handleTrack}>
            <label>
              Mã đơn hàng (UUID)
              <input
                name="code"
                className="field"
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Nhập mã đơn hàng (ví dụ: b84f67c4-...)"
              />
            </label>
            <button type="submit" className="btn btn-violet" disabled={loading}>
              {loading ? "Đang tra cứu..." : "Tra cứu đơn ↗"}
            </button>
          </form>

          {loading && <Loading label="Đang kiểm tra thông tin đơn hàng từ máy chủ..." />}
          {error && <ErrorBox message={error} />}

          {orderData && (
            <div style={{ marginTop: "24px" }}>
              <div className="whitebox" style={{ padding: "16px", marginBottom: "16px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                  <div>
                    <strong>Đơn hàng #{orderData.public_id}</strong>
                    <div style={{ fontSize: "12px", color: "var(--nexa-muted, #94a3b8)", marginTop: "4px" }}>
                      Ngày đặt: {dateTime(orderData.created_at)}
                    </div>
                  </div>
                  <span className={`status-pill status-${orderData.status}`}>
                    {orderData.status_display || orderData.status}
                  </span>
                </div>
                <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                  <div><b>Tổng giá trị:</b> {money(orderData.total_amount)}</div>
                  <div><b>Phương thức thanh toán:</b> {orderData.payment_method || "COD"}</div>
                  <div><b>Phương thức giao hàng:</b> {orderData.shipping_method_name || "Tiêu chuẩn"}</div>
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
                          <strong>{h.to_status_display || h.to_status}</strong>
                          <div style={{ fontSize: "12px", color: "var(--nexa-muted)" }}>
                            {dateTime(h.created_at)}
                          </div>
                          {h.note && <p style={{ fontSize: "13px", marginTop: "4px" }}>{h.note}</p>}
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
    </main>
  );
}
