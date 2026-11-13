import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { cartService, catalogService, communityService, wishlistService } from "../api/client";
import { assetUrl, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  // Data States
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeView, setActiveView] = useState("full"); // "full" | "angle" | "close"
  const [activeTone, setActiveTone] = useState("original"); // "original" | "ice" | "rose"

  // Community States
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [reviewForm, setReviewForm] = useState({ stars: 5, body: "" });
  const [questionBody, setQuestionBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [submittingQuestion, setSubmittingQuestion] = useState(false);

  // Status & Feedback
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [addedSuccess, setAddedSuccess] = useState(false);

  // Fetch product detail, reviews, and questions
  const loadProductData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, reviewData, questionData] = await Promise.all([
        catalogService.getProductDetail(slug),
        communityService.getProductReviews(slug).catch(() => ({ results: [] })),
        communityService.getProductQuestions(slug).catch(() => ({ results: [] })),
      ]);

      setProduct(detail);
      const initialVariant = detail.variants?.find((v) => v.available > 0) || detail.variants?.[0];
      setVariantId(initialVariant?.id ? String(initialVariant.id) : "");
      setReviews(reviewData.results || reviewData || []);
      setQuestions(questionData.results || questionData || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProductData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  // Selected Variant
  const selectedVariant = useMemo(() => {
    return product?.variants?.find((v) => String(v.id) === String(variantId)) || product?.variants?.[0] || null;
  }, [product, variantId]);

  // Available Stock
  const availableStock = selectedVariant?.available ?? 0;

  // Images Gallery
  const imageList = useMemo(() => {
    if (product?.images && product.images.length > 0) {
      return product.images.map((img) => assetUrl(img.object_key, productImage(product)));
    }
    return [productImage(product)];
  }, [product]);

  const activeImage = imageList[activeImageIndex] || imageList[0];

  // Wishlist handler
  const isFav = product ? wishlistIds.has(product.id) : false;
  const toggleWishlist = async () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    try {
      if (isFav) {
        await wishlistService.removeWishlist(product.id);
        setToastMsg("Đã xóa khỏi danh sách yêu thích.");
      } else {
        await wishlistService.addWishlist(product.id);
        setToastMsg("Đã lưu vào danh sách yêu thích.");
      }
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      setToastMsg(err.message || "Không thể cập nhật yêu thích.");
    }
  };

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    if (!selectedVariant) {
      setToastMsg("Vui lòng chọn phiên bản sản phẩm.");
      return;
    }
    if (availableStock < quantity) {
      setToastMsg(`Chỉ còn ${availableStock} sản phẩm khả dụng.`);
      return;
    }

    try {
      await cartService.addItem(selectedVariant.id, quantity);
      setAddedSuccess(true);
      setToastMsg(`Đã thêm ${quantity} sản phẩm vào giỏ hàng!`);
      if (refreshCartCount) refreshCartCount();
      setTimeout(() => setAddedSuccess(false), 3000);
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm vào giỏ hàng.");
    }
  };

  // Buy now handler
  const handleBuyNow = async () => {
    await handleAddToCart();
    navigate("/cart");
  };

  // Submit Review
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    if (!reviewForm.body.trim()) return;

    setSubmittingReview(true);
    try {
      await communityService.createProductReview(slug, {
        stars: Number(reviewForm.stars),
        body: reviewForm.body.trim(),
      });
      setReviewForm({ stars: 5, body: "" });
      setToastMsg("Đánh giá của bạn đã được gửi và đang chờ kiểm duyệt!");
      // Refetch reviews
      const freshReviews = await communityService.getProductReviews(slug);
      setReviews(freshReviews.results || freshReviews || []);
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmittingReview(false);
    }
  };

  // Submit Question
  const handleSubmitQuestion = async (e) => {
    e.preventDefault();
    if (!user) {
      navigate("/login", { state: { from: { pathname: `/products/${slug}` } } });
      return;
    }
    if (!questionBody.trim()) return;

    setSubmittingQuestion(true);
    try {
      await communityService.createProductQuestion(slug, {
        body: questionBody.trim(),
      });
      setQuestionBody("");
      setToastMsg("Câu hỏi của bạn đã được gửi!");
      const freshQ = await communityService.getProductQuestions(slug);
      setQuestions(freshQ.results || freshQ || []);
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi câu hỏi.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  if (loading && !product) {
    return (
      <div className="container" style={{ padding: "60px 0" }}>
        <Loading label="Đang tải thông tin sản phẩm..." />
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="container" style={{ padding: "60px 0" }}>
        <ErrorBox error={error} onRetry={loadProductData} />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="container" style={{ padding: "60px 0" }}>
        <Empty title="Sản phẩm không tồn tại" text="Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa." actionText="Về cửa hàng" onAction={() => navigate("/products")} />
      </div>
    );
  }

  const price = selectedVariant?.price || product.min_price || 0;
  const comparePrice = selectedVariant?.compare_at_price || product.compare_at_price;

  return (
    <>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <div className="pd-experience container" data-product-id={product.id} data-stock={availableStock}>
        {/* Breadcrumb */}
        <nav className="pd-breadcrumb" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link>
          <span>/</span>
          <Link to={`/products?category=${product.category?.slug || ""}`}>
            {product.category?.name || "Sản phẩm"}
          </Link>
          <span>/</span>
          <span>{product.short_name || product.name}</span>
        </nav>

        {/* Hero Product Detail Section */}
        <section className="pd-hero" aria-labelledby="pd-title">
          <div className="pd-orbit pd-orbit-one" aria-hidden="true" />
          <div className="pd-orbit pd-orbit-two" aria-hidden="true" />

          {/* Topline */}
          <div className="pd-topline">
            <span>
              {product.brand?.name || "NEXA"} <b>/ {product.category?.name || "GEAR"}</b>
            </span>
            <button
              className={`pd-save ${isFav ? "is-popping" : ""}`}
              onClick={toggleWishlist}
              aria-pressed={isFav}
              aria-label={`Yêu thích ${product.name}`}
            >
              <svg viewBox="0 0 24 24" width="21" height="21" fill={isFav ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z" />
              </svg>
            </button>
          </div>

          {/* Artwork Stage */}
          <div className="pd-artwork" data-view={activeView} data-tone={activeTone}>
            <div className="pd-watermark" aria-hidden="true">
              {product.brand?.name || "NEXA"}
            </div>

            <div className="pd-product-art">
              <img src={activeImage} alt={product.name} />
            </div>

            <div className="pd-art-caption">
              <span>{product.short_name || product.name}</span>
              <i />
              <span>OFFICIAL HARDWARE</span>
            </div>

            {/* View angle buttons */}
            <div className="pd-view-dots" role="group" aria-label="Góc nhìn sản phẩm">
              {["full", "angle", "close"].map((view) => (
                <button
                  key={view}
                  className={activeView === view ? "active" : ""}
                  onClick={() => setActiveView(view)}
                  aria-label={`Góc nhìn ${view}`}
                >
                  <span />
                </button>
              ))}
            </div>
          </div>

          {/* Gallery Thumbnails */}
          <div className="pd-gallery">
            <span className="pd-label">HÌNH ẢNH SẢN PHẨM</span>
            <div className="pd-thumbnails">
              {imageList.map((img, idx) => (
                <button
                  key={idx}
                  className={`pd-thumbnail ${activeImageIndex === idx ? "active" : ""}`}
                  onClick={() => setActiveImageIndex(idx)}
                >
                  <span className="pd-thumbnail-art">
                    <img src={img} alt={`Góc nhìn ${idx + 1}`} />
                  </span>
                  Góc {idx + 1}
                </button>
              ))}
            </div>

            {/* Color Tone Switches */}
            <div className="pd-tones">
              <span>Tone:</span>
              <button
                className={`pd-tone ${activeTone === "original" ? "active" : ""}`}
                aria-pressed={activeTone === "original"}
                onClick={() => setActiveTone("original")}
                title="Nguyên bản"
              />
              <button
                className={`pd-tone tone-ice ${activeTone === "ice" ? "active" : ""}`}
                aria-pressed={activeTone === "ice"}
                onClick={() => setActiveTone("ice")}
                title="Tone Ice"
              />
              <button
                className={`pd-tone tone-rose ${activeTone === "rose" ? "active" : ""}`}
                aria-pressed={activeTone === "rose"}
                onClick={() => setActiveTone("rose")}
                title="Tone Rose"
              />
            </div>
          </div>

          {/* Purchase Details */}
          <div className="pd-purchase">
            <div className="pd-product-heading">
              <span className="gear-kicker" style={{ color: "var(--accent)" }}>
                {product.brand?.name || "NEXA"} / {product.category?.name || "SELECT"}
              </span>
              <h1 id="pd-title">{product.name}</h1>
            </div>

            <p style={{ color: "var(--muted)", fontSize: "13.5px", margin: "10px 0 16px", lineHeight: "1.6" }}>
              {product.summary || product.description}
            </p>

            <div className="pd-stock">
              Tồn kho:{" "}
              {availableStock > 0 ? (
                <strong style={{ color: "var(--accent)" }}>Còn {availableStock} sản phẩm</strong>
              ) : (
                <strong style={{ color: "var(--danger, #ff4d61)" }}>Hết hàng</strong>
              )}
            </div>

            <div className="pd-price">
              <strong>{money(price)}</strong>
              {comparePrice && <del style={{ marginLeft: "10px", color: "var(--muted)", fontSize: "16px" }}>{money(comparePrice)}</del>}
            </div>

            {/* Variant Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="pd-variant" style={{ margin: "18px 0" }}>
                <label className="field-label" htmlFor="variant-select">
                  Phiên bản
                </label>
                <select
                  id="variant-select"
                  className="field"
                  value={variantId}
                  onChange={(e) => setVariantId(e.target.value)}
                  style={{ width: "100%", padding: "10px 14px" }}
                >
                  {product.variants.map((v) => {
                    const label = [v.color, v.switch_type, v.connection, v.layout].filter(Boolean).join(" · ") || v.sku;
                    return (
                      <option key={v.id} value={v.id} disabled={v.available < 1}>
                        {label} — {money(v.price)} ({v.available > 0 ? `Còn ${v.available}` : "Hết"})
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* Buy Row */}
            <div className="pd-buy-row">
              <div className="pd-quantity">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={quantity <= 1}
                  aria-label="Giảm số lượng"
                >
                  −
                </button>
                <output aria-live="polite">{quantity}</output>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(availableStock || 99, q + 1))}
                  disabled={quantity >= availableStock}
                  aria-label="Tăng số lượng"
                >
                  ＋
                </button>
              </div>

              <button
                type="button"
                className={`pd-add ${addedSuccess ? "is-added" : ""}`}
                disabled={availableStock <= 0}
                onClick={handleAddToCart}
              >
                {addedSuccess ? "✓ Đã thêm" : availableStock > 0 ? "Thêm vào giỏ" : "Hết hàng"}
              </button>

              <button
                type="button"
                className="pd-buy"
                disabled={availableStock <= 0}
                onClick={handleBuyNow}
              >
                Mua ngay →
              </button>
            </div>

            {product.warranty_months ? (
              <p className="pd-demo-note" style={{ color: "var(--muted)", margin: "16px 0 0" }}>
                Bảo hành chính hãng {product.warranty_months} tháng.
              </p>
            ) : null}

            {/* Specifications Card */}
            {product.specifications && typeof product.specifications === "object" && (
              <div className="pd-specs" style={{ marginTop: "24px", borderTop: "1px solid #ffffff17", paddingTop: "16px" }}>
                <strong style={{ display: "block", marginBottom: "10px", fontSize: "14px", color: "var(--ink)" }}>
                  Thông số kỹ thuật
                </strong>
                {Object.entries(product.specifications).map(([key, val]) => (
                  <div key={key} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: "12.5px" }}>
                    <span style={{ color: "var(--muted)" }}>{key}</span>
                    <strong style={{ color: "var(--ink)" }}>{String(val)}</strong>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Community Section: Reviews & Questions matching frontend_html */}
      <section className="ux-detail-reviews container" style={{ marginTop: "30px" }}>
        <div className="sec-head">
          <span className="ux-kicker">COMMUNITY & REVIEWS</span>
          <h2>Đánh giá từ cộng đồng</h2>
          <p>Nhận xét và câu hỏi thực tế từ người dùng NEXA.</p>
        </div>

        <div className="ux-two">
          {/* Left: Reviews List */}
          <div>
            <div className="ux-card">
              <h3>
                Đánh giá sản phẩm <span className="demo-pill">{reviews.length} đánh giá</span>
              </h3>
              {reviews.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ!</p>
              ) : (
                <div className="ux-review-stack">
                  {reviews.map((rev) => (
                    <article className="ux-review" key={rev.id}>
                      <div className="ux-review-head">
                        <b>{rev.author?.first_name || rev.author?.email || "Khách hàng NEXA"}</b>
                        <small>{new Date(rev.created_at).toLocaleDateString("vi-VN")}</small>
                      </div>
                      <div style={{ color: "#ffc107", fontSize: "14px", margin: "4px 0" }}>
                        {"★".repeat(rev.stars)}{"☆".repeat(5 - rev.stars)}
                        {rev.is_verified_buyer && <span className="ux-verified">✓ Đã mua hàng</span>}
                      </div>
                      <p>{rev.body}</p>
                    </article>
                  ))}
                </div>
              )}

              {/* Questions List */}
              <div style={{ marginTop: "28px", borderTop: "1px solid #e8edf3", paddingTop: "20px" }}>
                <h3>Hỏi đáp về sản phẩm ({questions.length})</h3>
                {questions.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>Chưa có câu hỏi nào. Đặt câu hỏi bên dưới nếu bạn cần tư vấn!</p>
                ) : (
                  <div className="ux-review-stack">
                    {questions.map((q) => (
                      <article className="ux-review" key={q.id}>
                        <div className="ux-review-head">
                          <b>{q.author?.first_name || q.author || "Khách hàng"}</b>
                          <small>{new Date(q.created_at).toLocaleDateString("vi-VN")}</small>
                        </div>
                        <p style={{ fontWeight: 600, color: "var(--ink)" }}>{q.body}</p>
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Submit Review & Question Forms */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {/* Review Form */}
            <div className="ux-card">
              <h3>Gửi đánh giá của bạn</h3>
              {!user ? (
                <p style={{ color: "var(--muted)" }}>
                  Vui lòng <Link to="/login" style={{ color: "var(--action)", fontWeight: 700 }}>Đăng nhập</Link> để gửi đánh giá sản phẩm.
                </p>
              ) : (
                <form onSubmit={handleSubmitReview}>
                  <label htmlFor="rev-stars">Số sao đánh giá</label>
                  <select
                    id="rev-stars"
                    className="field"
                    value={reviewForm.stars}
                    onChange={(e) => setReviewForm({ ...reviewForm, stars: e.target.value })}
                  >
                    <option value="5">★★★★★ (5 sao - Tuyệt vời)</option>
                    <option value="4">★★★★☆ (4 sao - Rất tốt)</option>
                    <option value="3">★★★☆☆ (3 sao - Bình thường)</option>
                    <option value="2">★★☆☆☆ (2 sao - Cần cải thiện)</option>
                    <option value="1">★☆☆☆☆ (1 sao - Kém)</option>
                  </select>

                  <label htmlFor="rev-body">Nội dung nhận xét</label>
                  <textarea
                    id="rev-body"
                    className="field"
                    rows="4"
                    required
                    minLength={5}
                    maxLength={500}
                    placeholder="Chia sẻ trải nghiệm thực tế khi sử dụng sản phẩm..."
                    value={reviewForm.body}
                    onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  />

                  <button className="btn btn-violet" disabled={submittingReview} style={{ marginTop: "12px" }}>
                    {submittingReview ? "Đang gửi..." : "Gửi đánh giá ↗"}
                  </button>
                </form>
              )}
            </div>

            {/* Question Form */}
            <div className="ux-card">
              <h3>Đặt câu hỏi cho NEXA</h3>
              {!user ? (
                <p style={{ color: "var(--muted)" }}>
                  Vui lòng <Link to="/login" style={{ color: "var(--action)", fontWeight: 700 }}>Đăng nhập</Link> để đặt câu hỏi tư vấn.
                </p>
              ) : (
                <form onSubmit={handleSubmitQuestion}>
                  <label htmlFor="q-body">Nội dung câu hỏi</label>
                  <textarea
                    id="q-body"
                    className="field"
                    rows="3"
                    required
                    maxLength={300}
                    placeholder="Bạn cần hỏi về kết nối, switch, tương thích hệ điều hành...?"
                    value={questionBody}
                    onChange={(e) => setQuestionBody(e.target.value)}
                  />
                  <button className="btn btn-primary" disabled={submittingQuestion} style={{ marginTop: "12px" }}>
                    {submittingQuestion ? "Đang gửi..." : "Gửi câu hỏi ↗"}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
