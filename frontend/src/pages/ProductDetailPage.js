import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { cartService, catalogService, communityService, wishlistService } from "../api/client";
import { assetUrl, fallbackProductImage, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Interactive3DStage } from "../components/Motion3D";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  // Data States
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeView, setActiveView] = useState("full"); // "full" | "angle" | "close" | "spin3d"
  const [activeTone, setActiveTone] = useState("original"); // "original" | "ice" | "rose"

  // Interactive 3D Manual Rotation State
  const [rotY, setRotY] = useState(-14);
  const [rotX, setRotX] = useState(8);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, rx: 8, ry: -14 });

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

  const loadProductData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [detail, reviewData, questionData] = await Promise.all([
        catalogService.getProductDetail(slug),
        communityService.getProductReviews(slug).catch(() => ({ results: [] })),
        communityService.getProductQuestions(slug).catch(() => ({ results: [] })),
      ]);

      setProduct(detail);
      setActiveImageIndex(0);
      const initialVariant =
        detail.variants?.find((v) => v.available > 0) || detail.variants?.[0];
      setVariantId(initialVariant?.id ? String(initialVariant.id) : "");
      setReviews(reviewData.results || reviewData || []);
      setQuestions(questionData.results || questionData || []);

      if (detail.category?.slug) {
        catalogService
          .getProducts({ category: detail.category.slug, page_size: 5 })
          .then((rel) => {
            const list = (rel.results || rel || []).filter((p) => p.slug !== detail.slug);
            setRelatedProducts(list.slice(0, 4));
          })
          .catch(() => setRelatedProducts([]));
      }
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadProductData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadProductData]);

  // Selected Variant
  const selectedVariant = useMemo(() => {
    return (
      product?.variants?.find((v) => String(v.id) === String(variantId)) ||
      product?.variants?.[0] ||
      null
    );
  }, [product, variantId]);

  const availableStock = selectedVariant?.available ?? 0;

  // Images Gallery
  const imageList = useMemo(() => {
    if (product?.images && product.images.length > 0) {
      return product.images.map((img) => assetUrl(img.object_key, productImage(product)));
    }
    return [productImage(product)];
  }, [product]);

  const activeImage = imageList[activeImageIndex] || imageList[0];

  // 3D Drag Handlers
  const handleStagePointerDown = (e) => {
    if (activeView !== "spin3d") return;
    setIsDragging3D(true);
    setDragStart({ x: e.clientX, y: e.clientY, rx: rotX, ry: rotY });
  };

  const handleStagePointerMove = (e) => {
    if (!isDragging3D || activeView !== "spin3d") return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;
    setRotY(Math.max(-65, Math.min(65, dragStart.ry + dx * 0.45)));
    setRotX(Math.max(-35, Math.min(35, dragStart.rx - dy * 0.35)));
  };

  const handleStagePointerUp = () => {
    setIsDragging3D(false);
  };

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
        setToastMsg("Đã lưu vào danh sách yêu thích ♥");
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
      return false;
    }
    if (!selectedVariant) {
      setToastMsg("Vui lòng chọn phiên bản sản phẩm.");
      return false;
    }
    if (availableStock < quantity) {
      setToastMsg(`Chỉ còn ${availableStock} sản phẩm khả dụng.`);
      return false;
    }

    try {
      await cartService.addItem(selectedVariant.id, quantity);
      setAddedSuccess(true);
      setToastMsg(`Đã thêm ${quantity} × ${product.short_name || product.name} vào giỏ hàng!`);
      if (refreshCartCount) refreshCartCount();
      setTimeout(() => setAddedSuccess(false), 2600);
      return true;
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm vào giỏ hàng.");
      return false;
    }
  };

  const handleBuyNow = async () => {
    const ok = await handleAddToCart();
    if (ok) navigate("/cart");
  };

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
      const freshReviews = await communityService.getProductReviews(slug);
      setReviews(freshReviews.results || freshReviews || []);
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi đánh giá.");
    } finally {
      setSubmittingReview(false);
    }
  };

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
        <Loading label="Đang tải không gian sản phẩm 3D..." />
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
        <Empty
          title="Sản phẩm không tồn tại"
          text="Sản phẩm bạn đang tìm kiếm không tồn tại hoặc đã bị xóa."
          actionText="Về cửa hàng"
          onAction={() => navigate("/products")}
        />
      </div>
    );
  }

  const price = selectedVariant?.price || product.min_price || 0;
  const comparePrice = selectedVariant?.compare_at_price || product.compare_at_price;
  const specEntries =
    product.specifications && typeof product.specifications === "object"
      ? Object.entries(product.specifications)
      : [];

  return (
    <>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <div
        className="pd-experience container"
        data-product-id={product.id}
        data-stock={availableStock}
        style={{ "--pd-accent": product.accent_color || "#9cc6ff" }}
      >
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

        {/* Hero 3D Product Showcase Studio */}
        <section className="pd-hero nexa-pd-hero-3d" aria-labelledby="pd-title">
          <div className="pd-orbit pd-orbit-one" aria-hidden="true" />
          <div className="pd-orbit pd-orbit-two" aria-hidden="true" />
          <div className="pd-orbit pd-orbit-three" aria-hidden="true" />

          {/* Topline */}
          <div className="pd-topline">
            <span>
              {product.brand?.name || "NEXA"} <b>/ {product.category?.name || "GEAR"}</b>
              {selectedVariant?.sku && <b> · SKU: {selectedVariant.sku}</b>}
            </span>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <button
                type="button"
                className={`nexa-3d-mode-btn ${activeView === "spin3d" ? "active" : ""}`}
                onClick={() => setActiveView(activeView === "spin3d" ? "full" : "spin3d")}
              >
                ◇ 3D {activeView === "spin3d" ? "Đang bật (Kéo để xoay)" : "Xoay 3D"}
              </button>
              <button
                type="button"
                className={`pd-save ${isFav ? "is-popping" : ""}`}
                onClick={toggleWishlist}
                aria-pressed={isFav}
                aria-label={`Yêu thích ${product.name}`}
              >
                <svg
                  viewBox="0 0 24 24"
                  width="21"
                  height="21"
                  fill={isFav ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z" />
                </svg>
              </button>
            </div>
          </div>

          {/* 3D Interactive Artwork Stage */}
          <Interactive3DStage
            className={`pd-artwork ${activeView === "spin3d" ? "is-spin3d-mode" : ""} ${
              isDragging3D ? "is-dragging" : ""
            }`}
            data-view={activeView}
            data-tone={activeTone}
            intensity={18}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerLeave={handleStagePointerUp}
          >
            <div className="pd-watermark" aria-hidden="true">
              {product.brand?.name || "NEXA"}
            </div>

            <div className="pd-wordmark" aria-hidden="true">
              <span>{product.brand?.name || "NEXA"}</span>
              <span>{product.short_name || product.category?.code || "PRO"}</span>
            </div>

            <div
              className="pd-product-art nexa-pd-3d-object"
              style={
                activeView === "spin3d"
                  ? {
                      transform: `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.08)`,
                    }
                  : undefined
              }
            >
              <img
                src={activeImage}
                alt={product.name}
                draggable={false}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackProductImage(product);
                }}
              />
            </div>

            {activeView === "spin3d" && (
              <div className="nexa-3d-controls-bar" onClick={(e) => e.stopPropagation()}>
                <span>Góc xoay 3D:</span>
                <input
                  type="range"
                  min="-60"
                  max="60"
                  value={rotY}
                  onChange={(e) => setRotY(Number(e.target.value))}
                  aria-label="Xoay ngang 3D"
                />
                <button
                  type="button"
                  onClick={() => {
                    setRotX(8);
                    setRotY(-14);
                  }}
                >
                  Đặt lại
                </button>
              </div>
            )}

            <div className="pd-art-caption">
              <span>{product.short_name || product.name}</span>
              <i />
              <span>3D SPATIAL HARDWARE</span>
            </div>

            {/* View angle buttons */}
            <div className="pd-view-dots" role="group" aria-label="Góc nhìn sản phẩm">
              {[
                { key: "full", label: "Toàn cảnh" },
                { key: "angle", label: "Góc nghiêng 3D" },
                { key: "close", label: "Cận cảnh" },
                { key: "spin3d", label: "Xoay 3D tự do" },
              ].map((v) => (
                <button
                  type="button"
                  key={v.key}
                  className={activeView === v.key ? "active" : ""}
                  onClick={() => setActiveView(v.key)}
                  aria-label={v.label}
                  title={v.label}
                >
                  <span />
                </button>
              ))}
            </div>
          </Interactive3DStage>

          {/* Bottom 2-Column Grid inside Hero: Gallery + Purchase */}
          <div className="pd-bottom">
            {/* Left: Gallery Thumbnails & Tone Switcher */}
            <div className="pd-gallery">
              <span className="pd-label">GÓC NHÌN & HÌNH ẢNH ({imageList.length})</span>
              <div className="pd-thumbnails">
                {imageList.map((img, idx) => (
                  <button
                    type="button"
                    key={idx}
                    className={`pd-thumbnail ${
                      activeImageIndex === idx && activeView === "full" ? "active" : ""
                    }`}
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setActiveView("full");
                    }}
                  >
                    <span className="pd-thumbnail-art">
                      <img src={img} alt={`Góc nhìn ${idx + 1}`} />
                    </span>
                    Ảnh {idx + 1}
                  </button>
                ))}
                <button
                  type="button"
                  className={`pd-thumbnail ${activeView === "angle" ? "active" : ""}`}
                  onClick={() => setActiveView("angle")}
                >
                  <span className="pd-thumbnail-art pd-thumb-angle">
                    <img src={activeImage} alt="Góc nghiêng 3D" />
                  </span>
                  Góc 3D
                </button>
                <button
                  type="button"
                  className={`pd-thumbnail ${activeView === "close" ? "active" : ""}`}
                  onClick={() => setActiveView("close")}
                >
                  <span className="pd-thumbnail-art pd-thumb-close">
                    <img src={activeImage} alt="Cận cảnh" />
                  </span>
                  Zoom
                </button>
              </div>

              <div className="pd-tones">
                <span>Ánh sáng Studio:</span>
                <button
                  type="button"
                  className={`pd-tone ${activeTone === "original" ? "active" : ""}`}
                  aria-pressed={activeTone === "original"}
                  onClick={() => setActiveTone("original")}
                  title="Nguyên bản"
                />
                <button
                  type="button"
                  className={`pd-tone tone-ice ${activeTone === "ice" ? "active" : ""}`}
                  aria-pressed={activeTone === "ice"}
                  onClick={() => setActiveTone("ice")}
                  title="Tone Cyber Ice"
                />
                <button
                  type="button"
                  className={`pd-tone tone-rose ${activeTone === "rose" ? "active" : ""}`}
                  aria-pressed={activeTone === "rose"}
                  onClick={() => setActiveTone("rose")}
                  title="Tone Neon Rose"
                />
              </div>
            </div>

            {/* Right: Purchase Details */}
            <div className="pd-purchase">
              <div className="pd-product-heading">
                <div>
                  <span className="pd-label">
                    {product.brand?.name || "NEXA"} / {product.category?.name || "SELECT"}
                  </span>
                  <h1 id="pd-title">{product.name}</h1>
                </div>
                <div className="pd-price">
                  <strong>{money(price)}</strong>
                  {comparePrice && <del>{money(comparePrice)}</del>}
                </div>
              </div>

              <div className="pd-stock">
                <span className={availableStock > 0 ? "" : "out"} />
                {availableStock > 0 ? (
                  <>
                    Còn <b>{availableStock}</b> sản phẩm sẵn sàng giao ngay
                  </>
                ) : (
                  <b style={{ color: "#ff6b81" }}>Tạm hết hàng</b>
                )}
                {product.warranty_months > 0 && (
                  <small>Bảo hành chính hãng {product.warranty_months} tháng</small>
                )}
              </div>

              {/* Interactive Variant Selector Pills */}
              {product.variants && product.variants.length > 0 && (
                <div className="nexa-variant-picker">
                  <span className="pd-label" style={{ marginBottom: "8px" }}>
                    CHỌN CẤU HÌNH / PHIÊN BẢN ({product.variants.length})
                  </span>
                  <div className="nexa-variant-pills">
                    {product.variants.map((v) => {
                      const label =
                        [v.color, v.switch_type, v.connection, v.layout]
                          .filter(Boolean)
                          .join(" · ") || v.sku;
                      const isSelected = String(v.id) === String(variantId);
                      const out = v.available < 1;
                      return (
                        <button
                          type="button"
                          key={v.id}
                          className={`nexa-variant-pill ${isSelected ? "active" : ""} ${
                            out ? "is-out" : ""
                          }`}
                          onClick={() => setVariantId(String(v.id))}
                        >
                          <strong>{label}</strong>
                          <span>
                            {money(v.price)} · {out ? "Hết hàng" : `Còn ${v.available}`}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Buy Row */}
              <div className="pd-buy-row" style={{ marginTop: "16px" }}>
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
                  {addedSuccess
                    ? "✓ Đã thêm vào giỏ"
                    : availableStock > 0
                    ? "Thêm vào giỏ hàng"
                    : "Hết hàng"}
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
            </div>
          </div>
        </section>

        {/* Story, Features & Specifications Section */}
        <section className="pd-story" aria-label="Chi tiết và thông số kỹ thuật">
          <div>
            <span className="pd-label">CÂU CHUYỆN THIẾT KẾ & TÍNH NĂNG</span>
            <h2>
              {product.short_name || product.name}
              <span>{product.summary || "Thiết bị chuẩn thi đấu chuyên nghiệp."}</span>
            </h2>
            <p>{product.description || product.summary}</p>

            {product.features && product.features.length > 0 && (
              <ul className="nexa-feature-list">
                {product.features.map((feat) => (
                  <li key={feat.id}>
                    <span className="nexa-feat-check">✦</span>
                    <span>{feat.content}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <span className="pd-label" style={{ marginBottom: "14px" }}>
              THÔNG SỐ KỸ THUẬT CHI TIẾT
            </span>
            <dl className="pd-specs">
              <div>
                <dt>THƯƠNG HIỆU</dt>
                <dd>{product.brand?.name || "NEXA"}</dd>
              </div>
              <div>
                <dt>DANH MỤC</dt>
                <dd>{product.category?.name || "Gaming Gear"}</dd>
              </div>
              {selectedVariant?.sku && (
                <div>
                  <dt>MÃ SKU</dt>
                  <dd>{selectedVariant.sku}</dd>
                </div>
              )}
              {product.warranty_months > 0 && (
                <div>
                  <dt>BẢO HÀNH</dt>
                  <dd>{product.warranty_months} tháng chính hãng</dd>
                </div>
              )}
              {specEntries.map(([key, val]) => (
                <div key={key}>
                  <dt>{key.toUpperCase()}</dt>
                  <dd>{String(val)}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="pd-related" aria-label="Sản phẩm cùng danh mục">
            <div className="gear-section-head">
              <div>
                <span className="gear-kicker">GỢI Ý CÙNG HỆ SINH THÁI</span>
                <h2>Sản phẩm tương tự</h2>
              </div>
              <Link to={`/products?category=${product.category?.slug || ""}`}>
                Xem tất cả ↗
              </Link>
            </div>
            <div className="products-grid">
              {relatedProducts.map((rel) => (
                <ProductCard
                  key={rel.id}
                  product={rel}
                  isFavorite={wishlistIds.has(rel.id)}
                  onFav={async (p) => {
                    if (!user) return navigate("/login");
                    if (wishlistIds.has(p.id)) await wishlistService.removeWishlist(p.id);
                    else await wishlistService.addWishlist(p.id);
                    if (refreshWishlist) refreshWishlist();
                  }}
                  onAdd={async (p) => {
                    if (!user) return navigate("/login");
                    try {
                      let vId = p.default_variant_id;
                      if (!vId) {
                        const detail = await catalogService.getProductDetail(p.slug);
                        const v =
                          (detail.variants || []).find((item) => item.available > 0) ||
                          detail.variants?.[0];
                        vId = v?.id;
                      }
                      if (vId) {
                        await cartService.addItem(vId, 1);
                        setToastMsg(`Đã thêm ${p.name} vào giỏ hàng!`);
                        if (refreshCartCount) refreshCartCount();
                      }
                    } catch (err) {
                      setToastMsg(err.message || "Không thể thêm vào giỏ hàng.");
                    }
                  }}
                />
              ))}
            </div>
          </section>
        )}
      </div>

      {/* Community Section: Reviews & Questions */}
      <section className="ux-detail-reviews container" style={{ marginTop: "10px", paddingBottom: "50px" }}>
        <div className="sec-head">
          <div>
            <span className="ux-kicker">COMMUNITY & REVIEWS</span>
            <h2>Đánh giá & Hỏi đáp thực tế</h2>
            <p>Chia sẻ từ cộng đồng game thủ và người dùng NEXA đã trải nghiệm.</p>
          </div>
        </div>

        <div className="ux-two">
          {/* Left: Reviews & Questions List */}
          <div>
            <div className="ux-card">
              <h3>
                Đánh giá sản phẩm <span className="demo-pill">{reviews.length} đánh giá</span>
              </h3>
              {reviews.length === 0 ? (
                <p style={{ color: "var(--muted)" }}>
                  Chưa có đánh giá nào cho sản phẩm này. Hãy là người đầu tiên chia sẻ cảm nhận!
                </p>
              ) : (
                <div className="ux-review-stack">
                  {reviews.map((rev) => (
                    <article className="ux-review" key={rev.id}>
                      <div className="ux-review-head">
                        <b>{rev.author?.first_name || rev.author?.email || rev.author || "Khách hàng NEXA"}</b>
                        <small>{new Date(rev.created_at).toLocaleDateString("vi-VN")}</small>
                      </div>
                      <div style={{ color: "#ffc107", fontSize: "14px", margin: "4px 0" }}>
                        {"★".repeat(rev.stars)}
                        {"☆".repeat(5 - rev.stars)}
                        {rev.is_verified_buyer && <span className="ux-verified">✓ Đã mua hàng</span>}
                      </div>
                      <p>{rev.body}</p>
                    </article>
                  ))}
                </div>
              )}

              <div style={{ marginTop: "28px", borderTop: "1px solid var(--edge)", paddingTop: "20px" }}>
                <h3>Hỏi đáp về sản phẩm ({questions.length})</h3>
                {questions.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>
                    Chưa có câu hỏi nào. Đặt câu hỏi bên phải nếu bạn cần tư vấn kỹ thuật!
                  </p>
                ) : (
                  <div className="ux-review-stack">
                    {questions.map((q) => (
                      <article className="ux-review" key={q.id}>
                        <div className="ux-review-head">
                          <b>{q.author?.first_name || q.author || "Khách hàng"}</b>
                          <small>{new Date(q.created_at).toLocaleDateString("vi-VN")}</small>
                        </div>
                        <p style={{ fontWeight: 600, color: "var(--ink)" }}>{q.body}</p>
                        {q.answers && q.answers.length > 0 && (
                          <div className="nexa-qa-answers">
                            {q.answers.map((ans) => (
                              <div key={ans.id} className="nexa-qa-answer">
                                <strong>Phản hồi từ NEXA:</strong> {ans.body}
                              </div>
                            ))}
                          </div>
                        )}
                      </article>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Submit Review & Question Forms */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="ux-card">
              <h3>Gửi đánh giá của bạn</h3>
              {!user ? (
                <p style={{ color: "var(--muted)" }}>
                  Vui lòng{" "}
                  <Link to="/login" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    Đăng nhập
                  </Link>{" "}
                  để gửi đánh giá sản phẩm.
                </p>
              ) : (
                <form onSubmit={handleSubmitReview}>
                  <label htmlFor="rev-stars">Mức độ hài lòng</label>
                  <select
                    id="rev-stars"
                    className="field"
                    value={reviewForm.stars}
                    onChange={(e) => setReviewForm({ ...reviewForm, stars: e.target.value })}
                  >
                    <option value="5">★★★★★ (5 sao - Tuyệt vời)</option>
                    <option value="4">★★★★☆ (4 sao - Rất tốt)</option>
                    <option value="3">★★★☆☆ (3 sao - Hài lòng)</option>
                    <option value="2">★★☆☆☆ (2 sao - Tạm ổn)</option>
                    <option value="1">★☆☆☆☆ (1 sao - Chưa tốt)</option>
                  </select>

                  <label htmlFor="rev-body" style={{ display: "block", marginTop: "12px" }}>
                    Nội dung nhận xét (tối thiểu 10 ký tự)
                  </label>
                  <textarea
                    id="rev-body"
                    className="field"
                    rows="4"
                    required
                    minLength={10}
                    maxLength={500}
                    placeholder="Chia sẻ trải nghiệm thực tế về cảm giác gõ, độ nhạy, thiết kế..."
                    value={reviewForm.body}
                    onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  />

                  <button
                    className="btn btn-violet nexa-btn-3d"
                    disabled={submittingReview}
                    style={{ marginTop: "12px" }}
                  >
                    {submittingReview ? "Đang gửi..." : "Gửi đánh giá ↗"}
                  </button>
                </form>
              )}
            </div>

            <div className="ux-card">
              <h3>Đặt câu hỏi kỹ thuật</h3>
              {!user ? (
                <p style={{ color: "var(--muted)" }}>
                  Vui lòng{" "}
                  <Link to="/login" style={{ color: "var(--accent)", fontWeight: 700 }}>
                    Đăng nhập
                  </Link>{" "}
                  để đặt câu hỏi tư vấn.
                </p>
              ) : (
                <form onSubmit={handleSubmitQuestion}>
                  <label htmlFor="q-body">Nội dung câu hỏi</label>
                  <textarea
                    id="q-body"
                    className="field"
                    rows="3"
                    required
                    minLength={5}
                    maxLength={300}
                    placeholder="Bạn cần tư vấn về switch, kết nối 2.4GHz, tương thích macOS/Windows...?"
                    value={questionBody}
                    onChange={(e) => setQuestionBody(e.target.value)}
                  />
                  <button
                    className="btn btn-primary nexa-btn-3d"
                    disabled={submittingQuestion}
                    style={{ marginTop: "12px" }}
                  >
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
