import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { catalogService, communityService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";
import { ReviewCard, ReviewEligibilityNotice, StarRatingInput } from "../components/ReviewComponents";

export default function ReviewsPage() {
  const { user } = useAuth();

  const [products, setProducts] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState("");
  const [reviews, setReviews] = useState([]);
  const [eligibility, setEligibility] = useState(null);
  const [form, setForm] = useState({ stars: 5, body: "" });
  const [submitting, setSubmitting] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState(null);
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
    setEligibility(null);
    communityService.getProductReviews(selectedSlug)
      .then((data) => {
        setReviews(data.results || data || []);
        setEligibility(data.eligibility || null);
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
      setEligibility(fresh.eligibility || null);
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReplyToReview = async (reviewId, body) => {
    setReplyingReviewId(reviewId);
    try {
      await communityService.createReviewReply(reviewId, { body });
      const freshReviews = await communityService.getProductReviews(selectedSlug);
      setReviews(freshReviews.results || freshReviews || []);
      setEligibility(freshReviews.eligibility || null);
      setToastMsg("Phản hồi của bạn đã được đăng.");
      return true;
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi phản hồi.");
      return false;
    } finally {
      setReplyingReviewId(null);
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
                {reviews.map((review) => (
                  <ReviewCard
                    review={review}
                    key={review.id}
                    isAuthenticated={Boolean(user)}
                    onReply={handleReplyToReview}
                    replying={replyingReviewId === review.id}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Review Submission Form */}
        <div>
          <div className="ux-card">
            <h3>Chia sẻ trải nghiệm của bạn</h3>
            {!user && (
              <p className="review-login-prompt">
                Vui lòng <Link to="/login">đăng nhập</Link> để hệ thống kiểm tra đơn hàng đã giao.
              </p>
            )}
            <ReviewEligibilityNotice
              eligibility={eligibility}
              productName={products.find((p) => p.slug === selectedSlug)?.name}
            />
            {user && eligibility?.can_review && (
              <form className="review-compose" onSubmit={handleSubmitReview}>
                <div className="review-selected-product">
                  <span>Sản phẩm đã mua</span>
                  <strong>{products.find((p) => p.slug === selectedSlug)?.name}</strong>
                  {eligibility.order_number && <small>Đơn hàng #{eligibility.order_number}</small>}
                </div>

                <label>Mức độ hài lòng</label>
                <StarRatingInput
                  value={Number(form.stars)}
                  onChange={(stars) => setForm({ ...form, stars })}
                  disabled={submitting}
                />

                <div className="review-field-heading">
                  <label htmlFor="rev-text">Nhận xét của bạn</label>
                  <span>{form.body.length}/500</span>
                </div>
                <textarea
                  id="rev-text"
                  className="field"
                  rows="5"
                  required
                  minLength={10}
                  maxLength={500}
                  placeholder="Chia sẻ ưu điểm, điểm cần cải thiện và trải nghiệm sử dụng thực tế..."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />

                <p className="review-form-hint">Đánh giá sẽ được kiểm duyệt trước khi hiển thị công khai.</p>

                <button
                  type="submit"
                  className="btn btn-primary review-submit"
                  disabled={submitting || form.body.trim().length < 10}
                >
                  {submitting ? "Đang gửi đánh giá..." : "Gửi đánh giá"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
