import { Link } from "react-router-dom";
import { money, productImage } from "../api/format";

function GearIcon({ name }) {
  const paths = {
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z" />,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></>,
    mouse: <><rect x="6" y="2" width="12" height="20" rx="6"/><path d="M12 2v7M6 10h12"/></>,
    headset: <><path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v2a2 2 0 0 1-2 2h-4"/><rect x="2" y="11" width="5" height="7" rx="2"/><rect x="17" y="11" width="5" height="7" rx="2"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M7 21h10"/></>,
    pad: <><path d="M3 6h18v13H3zM7 10h10M7 14h6"/></>,
    chair: <><path d="M7 3h10l-1 11H8L7 3ZM5 12v5h14v-5M12 17v4M7 22l5-1 5 1"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {paths[name] || paths.keyboard}
    </svg>
  );
}

export default function ProductCard({ product, isFavorite = false, onFav, onAdd }) {
  if (!product) return null;

  const slug = product.slug || "";
  const link = slug ? `/products/${slug}` : "#";
  const imgSrc = productImage(product);

  const brandName = product.brand?.name || "NEXA";
  const catName = product.category?.name || "Gaming Gear";
  const catCode = product.category?.code || "keyboard";

  // Badge mapping
  const badge = product.badge || "";
  let badgeClass = "";
  if (badge.startsWith("-") || badge.includes("%")) badgeClass = "gear-badge-sale";
  else if (badge === "Mới" || badge === "New") badgeClass = "gear-badge-new";
  else if (badge) badgeClass = "gear-badge-hot";

  const feature = product.summary || product.description || "Thiết bị gaming chuẩn eSports";

  return (
    <article className="gear-card" style={{ "--card-accent": product.accent_color || "var(--accent)" }}>
      {badge && <span className={`gear-badge ${badgeClass}`}>{badge}</span>}

      {onFav && (
        <button
          className={`gear-favorite ${isFavorite ? "is-fav" : ""}`}
          onClick={(e) => {
            e.preventDefault();
            onFav(product);
          }}
          aria-label={`Yêu thích ${product.name}`}
          aria-pressed={isFavorite}
        >
          <GearIcon name="heart" />
        </button>
      )}

      <Link className="gear-product-photo" to={link} aria-label={`Xem ${product.name}`}>
        {imgSrc ? <img className="nexa-product-img" src={imgSrc} loading="lazy" decoding="async" alt={product.name} /> : <span className="image-empty">Chưa có ảnh</span>}
      </Link>

      <div className="gear-product-meta">
        <span className="gear-kicker">
          {brandName} <i aria-hidden="true">/</i> {catName}
        </span>

        <h3>
          <Link to={link}>{product.short_name || product.name}</Link>
        </h3>

        <p>
          <span className="gear-feature-icon" aria-hidden="true">
            <GearIcon name={catCode} />
          </span>
          <span>{feature}</span>
        </p>

        <div className="gear-price">
          {product.min_price != null || product.price != null
            ? money(product.min_price ?? product.price)
            : "Chưa có giá"}
          {product.compare_at_price && <del>{money(product.compare_at_price)}</del>}
        </div>

        {onAdd ? (
          <button
            className="gear-add"
            onClick={(e) => {
              e.preventDefault();
              onAdd(product);
            }}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
          >
            Thêm vào giỏ
            <span className="gear-add-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6"/>
                <circle cx="10" cy="21" r="1"/>
                <circle cx="19" cy="21" r="1"/>
              </svg>
            </span>
          </button>
        ) : (
          <Link className="gear-add" to={link}>
            Xem sản phẩm
            <span className="gear-add-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 17L17 7M7 7h10v10"/>
              </svg>
            </span>
          </Link>
        )}
      </div>
    </article>
  );
}
