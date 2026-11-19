import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { cartService, catalogService, communityService, wishlistService } from "../api/client";
import {
  assetUrl,
  cleanProductTitle,
  displayBrandName,
  displayProductFeature,
  extractProductHighlights,
  extractProductSpecs,
  extractShortWordmarkCode,
  fallbackProductImage,
  money,
  productImage,
} from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Interactive3DStage, useGsapStudioAnimation } from "../components/Motion3D";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";
import { ReviewCard, ReviewEligibilityNotice, StarRatingInput } from "../components/ReviewComponents";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;
  const pdRootRef = useRef(null);

  // Data States
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [activeView, setActiveView] = useState("full"); // "full" | "angle" | "close" | "spin3d"
  const [activeTone, setActiveTone] = useState("original"); // "original" | "ice" | "rose"

  useGsapStudioAnimation(pdRootRef, product?.slug || slug, activeView);

  // Interactive 3D Manual Rotation State
  const [rotY, setRotY] = useState(-14);
  const [rotX, setRotX] = useState(8);
  const [isDragging3D, setIsDragging3D] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, rx: 8, ry: -14 });

  // Community States
  const [reviews, setReviews] = useState([]);
  const [reviewEligibility, setReviewEligibility] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [reviewForm, setReviewForm] = useState({ stars: 5, body: "" });
  const [questionBody, setQuestionBody] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [replyingReviewId, setReplyingReviewId] = useState(null);
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
      setReviewEligibility(reviewData.eligibility || null);
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
  const isMarketplaceImage = /^https?:\/\//i.test(activeImage || "");

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
      setReviewEligibility(freshReviews.eligibility || null);
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
      setToastMsg("Câu hỏi đã được gửi và đang chờ kiểm duyệt trước khi công khai.");
      const freshQ = await communityService.getProductQuestions(slug);
      setQuestions(freshQ.results || freshQ || []);
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi câu hỏi.");
    } finally {
      setSubmittingQuestion(false);
    }
  };

  const handleReplyToReview = async (reviewId, body) => {
    setReplyingReviewId(reviewId);
    try {
      await communityService.createReviewReply(reviewId, { body });
      const freshReviews = await communityService.getProductReviews(slug);
      setReviews(freshReviews.results || freshReviews || []);
      setReviewEligibility(freshReviews.eligibility || null);
      setToastMsg("Phản hồi của bạn đã được đăng.");
      return true;
    } catch (err) {
      setToastMsg(err.message || "Không thể gửi phản hồi.");
      return false;
    } finally {
      setReplyingReviewId(null);
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
  const specEntries = extractProductSpecs(product, selectedVariant);
  const highlightList = extractProductHighlights(product);
  const displayTitle = cleanProductTitle(product);
  const brandName = displayBrandName(product);
  const catName = product.category?.name || "Gaming Gear";
  const storySubtitle = displayProductFeature(product);
  const wordmarkCode = extractShortWordmarkCode(product);
  const rawDescription = String(product.description || "").trim();
  const hasDetailedDescription =
    rawDescription.length > 0 && !/^sản phẩm từ\s+/iu.test(rawDescription);
  const publicSku = selectedVariant?.sku?.startsWith("TT-") ? "" : selectedVariant?.sku;

  return (
    <>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <div
        ref={pdRootRef}
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
            {catName}
          </Link>
          <span>/</span>
          <span>{displayTitle}</span>
        </nav>

        {/* Hero Open Product Showcase Studio (Image 2 composition) */}
        <section className="pd-hero nexa-pd-hero-3d" aria-labelledby="pd-title">
          <div className="pd-orbit pd-orbit-one" aria-hidden="true" />
          <div className="pd-orbit pd-orbit-two" aria-hidden="true" />
          <div className="pd-orbit pd-orbit-three" aria-hidden="true" />

          {/* Topline */}
          <div className="pd-topline">
            <span>
              {brandName || "NEXA SELECT"} <b>/ {catName}</b>
              {publicSku && <b> · {publicSku}</b>}
            </span>
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

          {/* Open Full-Width Artwork Stage */}
          <Interactive3DStage
            className={`pd-artwork ${activeView === "spin3d" ? "is-spin3d-mode" : ""} ${
              isDragging3D ? "is-dragging" : ""
            } ${isMarketplaceImage ? "has-marketplace-image" : ""}`}
            data-view={activeView}
            data-tone={activeTone}
            intensity={16}
            onPointerDown={handleStagePointerDown}
            onPointerMove={handleStagePointerMove}
            onPointerUp={handleStagePointerUp}
            onPointerLeave={handleStagePointerUp}
          >
            <div className="pd-watermark" aria-hidden="true">
              {brandName || catName}
            </div>

            <div className="pd-wordmark" aria-hidden="true">
              <span>{brandName || "NEXA"}</span>
              <span>{wordmarkCode}</span>
            </div>

            <div
              className={`pd-product-art nexa-pd-3d-object ${
                isMarketplaceImage ? "is-marketplace-art" : ""
              }`}
              style={
                activeView === "spin3d"
                  ? {
                      transform: `perspective(1100px) rotateX(${rotX}deg) rotateY(${rotY}deg) scale(1.06)`,
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

            <div className="pd-art-caption" aria-hidden="true">
              <span>{publicSku || wordmarkCode}</span>
              <i />
              <span>HÌNH ẢNH SẢN PHẨM</span>
            </div>

            {/* View angle buttons */}
            <div className="pd-view-dots" role="group" aria-label="Góc nhìn sản phẩm">
              {[
                { key: "full", label: "Toàn cảnh" },
                { key: "angle", label: "Góc nghiêng" },
                { key: "close", label: "Cận cảnh" },
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

          {/* Bottom 2-Column Row inside Hero: Gallery Left + Purchase Right */}
          <div className="pd-bottom">
            {/* Left: Flat Gallery Tabs & Tone Switcher */}
            <div className="pd-gallery">
              <span className="pd-label">KHÁM PHÁ THIẾT KẾ</span>
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
                      <img src={img} alt={`Toàn cảnh ${idx + 1}`} />
                    </span>
                    {imageList.length > 1 ? `Ảnh ${idx + 1}` : "Toàn cảnh"}
                  </button>
                ))}
                <button
                  type="button"
                  className={`pd-thumbnail ${activeView === "angle" ? "active" : ""}`}
                  onClick={() => setActiveView("angle")}
                >
                  <span className="pd-thumbnail-art pd-thumb-angle">
                    <img src={activeImage} alt="Góc nghiêng" />
                  </span>
                  Góc nghiêng
                </button>
                <button
                  type="button"
                  className={`pd-thumbnail ${activeView === "close" ? "active" : ""}`}
                  onClick={() => setActiveView("close")}
                >
                  <span className="pd-thumbnail-art pd-thumb-close">
                    <img src={activeImage} alt="Cận cảnh" />
                  </span>
                  Cận cảnh
                </button>
              </div>

              <div className="pd-tones">
                <span>Màu ánh sáng</span>
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
                    {brandName || "NEXA"} / {catName}
                  </span>
                  <h1 id="pd-title">{displayTitle}</h1>
                </div>
                <div className="pd-price">
                  <strong>{money(price)}</strong>
                  {comparePrice && Number(comparePrice) > Number(price) && (
                    <del>{money(comparePrice)}</del>
                  )}
                </div>
              </div>

              <div className="pd-stock">
                <span className={availableStock > 0 ? "" : "out"} />
                {availableStock > 0 ? (
                  <>
                    Còn <b>{availableStock}</b> sản phẩm
                  </>
                ) : (
                  <b className="pd-stock-out-label">Tạm hết hàng</b>
                )}
                {product.warranty_months > 0 ? (
                  <small>Bảo hành {product.warranty_months} tháng</small>
                ) : product.specifications?.shop ? (
                  <small>{product.specifications.shop}</small>
                ) : null}
              </div>

              {/* Compact Variant Selector only when multiple variants exist */}
              {product.variants && product.variants.length > 1 && (
                <div className="pd-variant">
                  <span>Phiên bản:</span>
                  <select
                    value={variantId}
                    onChange={(e) => setVariantId(e.target.value)}
                    aria-label="Chọn cấu hình phiên bản"
                  >
                    {product.variants.map((v) => {
                      const label =
                        [v.color, v.switch_type, v.connection, v.layout]
                          .filter(Boolean)
                          .join(" · ") || v.sku;
                      return (
                        <option key={v.id} value={v.id}>
                          {label} — {money(v.price)} ({v.available > 0 ? `Còn ${v.available}` : "Hết hàng"})
                        </option>
                      );
                    })}
                  </select>
                </div>
              )}

              {/* Buy Row */}
              <div className={`pd-buy-row ${availableStock <= 0 ? "is-out-of-stock" : ""}`}>
                <div className="pd-quantity">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={availableStock <= 0 || quantity <= 1}
                    aria-label="Giảm số lượng"
                  >
                    −
                  </button>
                  <output aria-live="polite">{availableStock <= 0 ? 0 : quantity}</output>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.min(availableStock || 99, q + 1))}
                    disabled={availableStock <= 0 || quantity >= availableStock}
                    aria-label="Tăng số lượng"
                  >
                    +
                  </button>
                </div>

                <button
                  type="button"
                  className={`pd-add ${addedSuccess ? "is-added" : ""}`}
                  disabled={availableStock <= 0}
                  onClick={handleAddToCart}
                >
                  <svg
                    viewBox="0 0 24 24"
                    width="15"
                    height="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.9"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M6 7h12l-1 13H7L6 7Z" />
                    <path d="M9 7V5a3 3 0 0 1 6 0v2" />
                  </svg>
                  {addedSuccess
                    ? "Đã thêm vào giỏ"
                    : availableStock > 0
                    ? "Thêm vào giỏ"
                    : "Tạm hết hàng"}
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

        {/* Features & Specifications Section */}
        <section className="pd-story" aria-label="Chi tiết và thông số kỹ thuật">
          <div>
            <span className="pd-label">THÔNG TIN & ĐẶC ĐIỂM SẢN PHẨM</span>
            <h2>
              {displayTitle}
              <span>{storySubtitle}</span>
            </h2>
            {hasDetailedDescription && <p>{rawDescription}</p>}

            {highlightList.length > 0 && (
              <ul className="nexa-feature-list">
                {highlightList.map((featText, idx) => (
                  <li key={idx}>
                    <span className="nexa-feat-check">✦</span>
                    <span>{featText}</span>
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
              {specEntries.map(([key, val]) => (
                <div key={key}>
                  <dt>{key}</dt>
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
                <span className="gear-kicker">SẢN PHẨM CÙNG DANH MỤC</span>
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
                    <ReviewCard
                      review={rev}
                      key={rev.id}
                      isAuthenticated={Boolean(user)}
                      onReply={handleReplyToReview}
                      replying={replyingReviewId === rev.id}
                    />
                  ))}
                </div>
              )}

              <div className="nexa-qa-section">
                <div className="nexa-qa-section-head">
                  <h3>
                    Hỏi đáp về sản phẩm <span className="demo-pill">{questions.length} câu hỏi</span>
                  </h3>
                </div>
                {questions.length === 0 ? (
                  <p style={{ color: "var(--muted)" }}>
                    Chưa có câu hỏi nào. Đặt câu hỏi bên phải nếu bạn cần tư vấn kỹ thuật!
                  </p>
                ) : (
                  <div className="nexa-qa-list">
                    {questions.map((q) => {
                      const qAuthor = q.author?.first_name || q.author || "Khách hàng";
                      const qInitial = (qAuthor[0] || "H").toUpperCase();
                      return (
                        <article className="nexa-qa-card" key={q.id}>
                          <div className="nexa-qa-question-head">
                            <div className="nexa-qa-author-wrap">
                              <span className="nexa-qa-avatar question">{qInitial}</span>
                              <div>
                                <strong className="nexa-qa-author-name">{qAuthor}</strong>
                                <span className="nexa-qa-role-tag">
                                  {q.status === "pending"
                                    ? "Chờ kiểm duyệt · chỉ mình bạn thấy"
                                    : "Khách hàng quan tâm"}
                                </span>
                              </div>
                            </div>
                            <small className="nexa-qa-date">
                              {new Date(q.created_at).toLocaleDateString("vi-VN")}
                            </small>
                          </div>

                          <div className="nexa-qa-question-body">
                            <span className="nexa-qa-q-badge">Hỏi</span>
                            <p>{q.body}</p>
                          </div>

                          {q.answers && q.answers.length > 0 && (
                            <div className="nexa-qa-answers">
                              {q.answers.map((ans) => (
                                <div key={ans.id} className="nexa-qa-answer">
                                  <div className="nexa-qa-answer-head">
                                    <div className="nexa-qa-author-wrap">
                                      <span className="nexa-qa-avatar official">N</span>
                                      <strong>{ans.author || "Chuyên viên NEXA"}</strong>
                                      <span className="nexa-qa-official-badge">
                                        ✓ Phản hồi từ NEXA
                                      </span>
                                    </div>
                                    {ans.created_at && (
                                      <small className="nexa-qa-date">
                                        {new Date(ans.created_at).toLocaleDateString("vi-VN")}
                                      </small>
                                    )}
                                  </div>
                                  <p className="nexa-qa-answer-text">{ans.body}</p>
                                </div>
                              ))}
                            </div>
                          )}
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right: Submit Review & Question Forms */}
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            <div className="ux-card">
              <h3>Gửi đánh giá của bạn</h3>
              {!user && (
                <p className="review-login-prompt">
                  Vui lòng <Link to="/login">đăng nhập</Link> để hệ thống kiểm tra đơn hàng đã giao.
                </p>
              )}
              <ReviewEligibilityNotice eligibility={reviewEligibility} productName={displayTitle} />
              {user && reviewEligibility?.can_review && (
                <form className="review-compose" onSubmit={handleSubmitReview}>
                  <label>Mức độ hài lòng</label>
                  <StarRatingInput
                    value={Number(reviewForm.stars)}
                    onChange={(stars) => setReviewForm({ ...reviewForm, stars })}
                    disabled={submittingReview}
                  />

                  <div className="review-field-heading">
                    <label htmlFor="rev-body">Nhận xét của bạn</label>
                    <span>{reviewForm.body.length}/500</span>
                  </div>
                  <textarea
                    id="rev-body"
                    className="field"
                    rows="5"
                    required
                    minLength={10}
                    maxLength={500}
                    placeholder="Hãy chia sẻ điều bạn thích, điểm cần cải thiện và trải nghiệm sử dụng thực tế..."
                    value={reviewForm.body}
                    onChange={(e) => setReviewForm({ ...reviewForm, body: e.target.value })}
                  />

                  <p className="review-form-hint">Đánh giá sẽ được kiểm duyệt trước khi hiển thị công khai.</p>

                  <button
                    className="btn btn-primary review-submit"
                    disabled={submittingReview || reviewForm.body.trim().length < 10}
                  >
                    {submittingReview ? "Đang gửi đánh giá..." : "Gửi đánh giá"}
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
