import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalogService, communityService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

export default function ReviewsPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [reviews, setReviews] = useState([]);
  const [form, setForm] = useState({ stars: 5, body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Load products list for dropdown
  useEffect(() => {
    catalogService.getProducts({ page_size: 50 })
      .then((data) => {
        const list = data.results || data || [];
        setProducts(list);
        if (list.length > 0) {
          setSelectedSlug(list[0].slug);
        } else {
          setLoading(false);
        }
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, []);

  // Load reviews whenever selectedSlug changes
  useEffect(() => {
    if (!selectedSlug) return;
    setLoading(true);
    communityService.getProductReviews(selectedSlug)
      .then((data) => {
        setReviews(data.results || data || []);
      })
      .catch((err) => {
        setError(err);
        setReviews([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [selectedSlug]);

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      setToastMsg("Vui lòng đăng nhập để gửi đánh giá.");
      return;
    }
    if (!selectedSlug) return;

    setSubmitting(true);
    try {
      await communityService.createProductReview(selectedSlug, {
        stars: Number(form.stars),
        body: form.body.trim(),
      });
      setForm({ stars: 5, body: "" });
      setToastMsg("Đánh giá của bạn đã được gửi thành công!");
      // Refetch reviews
      const fresh = await communityService.getProductReviews(selectedSlug);
      setReviews(fresh.results || fresh || []);
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container ux-page">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Hero Header matching reviews.html */}
      <section className="ux-hero">
        <div>
          <span className="ux-kicker">COMMUNITY / REVIEWS</span>
          <h1>
            Real voices.<br />
            <em>Real experiences.</em>
          </h1>
          <p>Lắng nghe trải nghiệm thực tế từ cộng đồng người dùng và game thủ cùng NEXA.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">N</span>
      </section>

      {error && <ErrorBox error={error} />}

      <div className="ux-two">
        {/* Left Column: Reviews List */}
        <div>
          <div className="ux-card">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h2 style={{ margin: 0 }}>
                Đánh giá sản phẩm <span className="demo-pill">{reviews.length} nhận xét</span>
              </h2>

              {/* Product selector filter */}
              {products.length > 0 && (
                <select
                  className="field"
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                  style={{ width: "auto", minHeight: "36px", padding: "6px 12px", fontSize: "12px" }}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.short_name || p.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            {loading ? (
              <Loading label="Đang tải đánh giá sản phẩm..." />
            ) : reviews.length === 0 ? (
              <Empty
                title="Chưa có đánh giá nào"
                text="Sản phẩm này chưa có đánh giá nào được công bố. Hãy gửi đánh giá đầu tiên ở bên cạnh!"
              />
            ) : (
              <div className="ux-review-stack">
                {reviews.map((r) => (
                  <article className="ux-review" key={r.id}>
                    <div className="ux-review-head">
                      <strong>{r.author?.first_name || r.author?.email || r.author || "Khách hàng NEXA"}</strong>
                      <small>{new Date(r.created_at).toLocaleDateString("vi-VN")}</small>
                    </div>
                    <div style={{ color: "#ffc107", fontSize: "14px", margin: "4px 0" }}>
                      {"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}
                      {r.is_verified_buyer && <span className="ux-verified">✓ Đã mua hàng</span>}
                    </div>
                    <p>{r.body}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review Submission Form */}
        <div>
          <div className="ux-card">
            <h3>Chia sẻ trải nghiệm của bạn</h3>
            {!user ? (
              <p style={{ color: "var(--muted)" }}>
                Vui lòng <Link to="/login" style={{ color: "var(--action)", fontWeight: 700 }}>Đăng nhập</Link> để viết nhận xét về sản phẩm bạn đã trải nghiệm.
              </p>
            ) : (
              <form onSubmit={handleSubmitReview}>
                <label htmlFor="rev-prd">Sản phẩm đánh giá</label>
                <select
                  id="rev-prd"
                  className="field"
                  value={selectedSlug}
                  onChange={(e) => setSelectedSlug(e.target.value)}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.slug}>
                      {p.name}
                    </option>
                  ))}
                </select>

                <label htmlFor="rev-stars-input">Mức độ hài lòng</label>
                <select
                  id="rev-stars-input"
                  className="field"
                  value={form.stars}
                  onChange={(e) => setForm({ ...form, stars: e.target.value })}
                >
                  <option value="5">★★★★★ (5 sao - Xuất sắc)</option>
                  <option value="4">★★★★☆ (4 sao - Tốt)</option>
                  <option value="3">★★★☆☆ (3 sao - Trung bình)</option>
                  <option value="2">★★☆☆☆ (2 sao - Chưa hài lòng)</option>
                  <option value="1">★☆☆☆☆ (1 sao - Rất tệ)</option>
                </select>

                <label htmlFor="rev-text">Nội dung đánh giá</label>
                <textarea
                  id="rev-text"
                  className="field"
                  rows="4"
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder="Mô tả cảm giác gõ, thời lượng pin, độ chính xác của cảm biến..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />

                <button
                  type="submit"
                  className="btn btn-violet full"
                  disabled={submitting}
                  style={{ width: "100%", marginTop: "16px", padding: "12px" }}
                >
                  {submitting ? "Đang gửi..." : "Gửi đánh giá ↗"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
