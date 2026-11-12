import { Link } from "react-router-dom";
import { money, productImage } from "../api/format";

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" width="19" height="19" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function PlusIcon() {
  return (
    <span className="gear-add-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M12 5v14M5 12h14"/>
      </svg>
    </span>
  );
}

function ArrowIcon() {
  return (
    <span className="gear-add-icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        <path d="M7 17L17 7M7 7h10v10"/>
      </svg>
    </span>
  );
}

export default function ProductCard({ product, onWish, onAdd }) {
  const imgSrc = productImage(product);

  // Determine badge class
  const badgeClass = product.badge
    ? product.badge.includes("%") ? "gear-badge gear-badge-sale"
    : product.badge === "Mới" || product.badge === "New" ? "gear-badge gear-badge-new"
    : product.badge === "Hot" ? "gear-badge gear-badge-hot"
    : "gear-badge gear-badge-new"
    : null;

  return (
    <article className="gear-card">
      {/* Badge */}
      {product.badge && <span className={badgeClass}>{product.badge}</span>}

      {/* Wishlist button */}
      {onWish && (
        <button
          className="gear-favorite"
          onClick={() => onWish(product)}
          aria-label={`Yêu thích ${product.name}`}
        >
          <HeartIcon />
        </button>
      )}

      {/* Product image */}
      <Link className="gear-product-photo" to={product.slug ? `/products/${product.slug}` : "/products"} aria-label={`Xem ${product.name}`}>
        <img className="nexa-product-img" src={imgSrc} alt={product.cover_image?.alt_text || product.name} loading="lazy"/>
      </Link>

      {/* Meta */}
      <div className="gear-product-meta">
        <div className="gear-kicker">
          <span>{product.brand?.name || "NEXA"}</span>
          <i> / </i>
          <span>{product.category?.name || "GEAR"}</span>
        </div>
        <h3>
          <Link to={product.slug ? `/products/${product.slug}` : "/products"}>{product.name}</Link>
        </h3>

        {/* Rating */}
        <div className="gear-rating">
          <span className="gear-stars" style={{ "--rating-fill": "96%" }}>★★★★★</span>
          <span>4.8 <i>·</i> NEXA</span>
        </div>

        {/* Summary */}
        <p>
          <span className="gear-feature-icon">
            <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
            </svg>
          </span>
          <span>{product.summary || "Thiết bị gaming được tuyển chọn."}</span>
        </p>

        {/* Price */}
        <div className="gear-price">{money(product.min_price)}</div>

        {/* CTA button */}
        {onAdd ? (
          <button className="gear-add" onClick={() => onAdd(product)}>
            Thêm vào giỏ <PlusIcon/>
          </button>
        ) : (
          <Link className="gear-add" to={product.slug ? `/products/${product.slug}` : "/products"}>
            Xem sản phẩm <ArrowIcon/>
          </Link>
        )}
      </div>
    </article>
  );
}
