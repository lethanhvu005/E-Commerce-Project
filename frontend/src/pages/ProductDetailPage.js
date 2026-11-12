import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext, useParams } from "react-router-dom";
import { api } from "../api/client";
import { assetUrl, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading } from "../components/Feedback";

export default function ProductDetailPage() {
  const { slug } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext();
  const [product, setProduct] = useState(null);
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState("");
  const [reviews, setReviews] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  useEffect(() => {
    setProduct(null);
    setError(null);
    Promise.all([
      api.get(`/products/${slug}/`),
      api.get(`/products/${slug}/reviews/`),
      api.get(`/products/${slug}/questions/`),
    ]).then(([detail, reviewData, questionData]) => {
      setProduct(detail);
      const first = detail.variants?.find((v) => v.available > 0) || detail.variants?.[0];
      setVariantId(first?.id ? String(first.id) : "");
      setActiveImage(productImage(detail));
      setReviews(reviewData.results || []);
      setQuestions(questionData.results || []);
    }).catch(setError);
  }, [slug]);

  const selectedVariant = useMemo(
    () => product?.variants?.find((v) => String(v.id) === variantId),
    [product, variantId]
  );

  const requireLogin = () => {
    if (user) return true;
    navigate("/login", { state: { from: { pathname: `/products/${slug}` } } });
    return false;
  };

  const addCart = async () => {
    if (!requireLogin() || !variantId) return;
    try {
      const cart = await api.post("/cart/items/", { variant_id: Number(variantId), quantity });
      outlet?.setCartCount(cart.items.reduce((s, i) => s + i.quantity, 0));
      setMessage("Đã thêm sản phẩm vào giỏ hàng.");
    } catch (e) { setError(e); }
  };

  const addWish = async () => {
    if (!requireLogin()) return;
    try {
      await api.post("/wishlist/", { product_id: product.id });
      setMessage("Đã lưu vào danh sách yêu thích.");
    } catch (e) { setError(e); }
  };

  if (error && !product) return <div className="page-container"><ErrorBox error={error} /></div>;
  if (!product) return <Loading />;

  const images = product.images?.length
    ? product.images
    : [{ id: "cover", object_key: product.cover_image?.object_key, alt_text: product.name }];

  return (
    <div className="page-container detail-page">
      {/* Breadcrumbs */}
      <div className="breadcrumbs">
        <Link to="/">Trang chủ</Link>
        <span>/</span>
        <Link to="/products">Sản phẩm</Link>
        <span>/</span>
        <strong>{product.short_name || product.name}</strong>
      </div>

      {/* Product detail */}
      <section className="product-detail">
        {/* Gallery */}
        <div className="detail-gallery">
          <div className="detail-main-image">
            <img src={activeImage} alt={product.name} />
          </div>
          <div className="thumbnail-row">
            {images.map((img) => {
              const url = assetUrl(img.object_key, productImage(product));
              return (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(url)}
                  className={activeImage === url ? "active" : ""}
                >
                  <img src={url} alt={img.alt_text || product.name} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Copy */}
        <div className="detail-copy">
          <span className="eyebrow">{product.brand?.name} / {product.category?.name}</span>
          <h1>{product.name}</h1>
          <p className="detail-summary">{product.summary}</p>

          <div className="detail-price">{money(selectedVariant?.price || product.min_price)}</div>
          {selectedVariant?.compare_at_price && <del>{money(selectedVariant.compare_at_price)}</del>}

          {product.variants?.length > 0 && (
            <label className="field-label">
              Phiên bản
              <select value={variantId} onChange={(e) => setVariantId(e.target.value)}>
                {product.variants.map((v) => (
                  <option key={v.id} value={v.id} disabled={v.available < 1}>
                    {[v.color, v.switch_type, v.connection, v.layout].filter(Boolean).join(" · ") || v.sku}
                    {" "}— {money(v.price)} ({v.available} còn lại)
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="purchase-row">
            <div className="quantity">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button>
              <span>{quantity}</span>
              <button onClick={() => setQuantity(quantity + 1)}>＋</button>
            </div>
            <button
              className="btn btn-primary"
              disabled={!variantId || (selectedVariant?.available ?? 999) < quantity}
              onClick={addCart}
            >
              Thêm vào giỏ
            </button>
            <button className="secondary-button" onClick={addWish} aria-label="Thêm vào yêu thích">♡</button>
          </div>

          {message && <p className="success-message">✔ {message}</p>}
          {error && <ErrorBox error={error} />}

          {product.features?.length > 0 && (
            <ul className="feature-list">
              {product.features.map((f) => <li key={f.id}>✔ {f.content}</li>)}
            </ul>
          )}

          <p className="warranty">Bảo hành chính hãng {product.warranty_months || 12} tháng.</p>
        </div>
      </section>

      {/* Information & Specs */}
      <section className="detail-information">
        <div>
          <span className="eyebrow">THIẾT KẾ CHO GÓC CHƠI CỦA BẠN</span>
          <h2>{product.short_name || product.name}</h2>
          <p>{product.description || product.summary}</p>
        </div>
        <div className="spec-card">
          <h3>Thông số kỹ thuật</h3>
          {product.specifications && typeof product.specifications === "object"
            ? Object.entries(product.specifications).map(([key, value]) => (
                <div key={key}>
                  <span>{key}</span>
                  <strong>{String(value)}</strong>
                </div>
              ))
            : <p>Thông tin đang được cập nhật.</p>
          }
        </div>
      </section>

      {/* Community: Reviews & Q&A */}
      <section className="community-section">
        <div>
          <div className="section-heading"><h2>Đánh giá sản phẩm</h2></div>
          {reviews.length ? reviews.map((r) => (
            <article className="community-card" key={r.id}>
              <strong>{"★".repeat(r.stars)}{"☆".repeat(5 - r.stars)}</strong>
              <p>{r.body}</p>
              <small>
                {r.author?.first_name || r.author?.email || "Khách hàng NEXA"}
                {r.is_verified_buyer ? " · Đã mua hàng" : ""}
              </small>
            </article>
          )) : <p className="muted">Chưa có đánh giá.</p>}
        </div>
        <div>
          <div className="section-heading"><h2>Hỏi đáp</h2></div>
          {questions.length ? questions.map((q) => (
            <article className="community-card" key={q.id}>
              <p>{q.body}</p>
              <small>{q.author?.first_name || q.author?.email || "Khách hàng"}</small>
            </article>
          )) : <p className="muted">Chưa có câu hỏi.</p>}
        </div>
      </section>
    </div>
  );
}
