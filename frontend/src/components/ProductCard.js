import { useState } from "react";
import { Link } from "react-router-dom";
import { money, productImage } from "../api/format";
import { Tilt3DCard } from "./Motion3D";

function GearIcon({ name }) {
  const paths = {
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z" />,
    keyboard: (
      <>
        <rect x="2" y="5" width="20" height="14" rx="2" />
        <path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10" />
      </>
    ),
    mouse: (
      <>
        <rect x="6" y="2" width="12" height="20" rx="6" />
        <path d="M12 2v7M6 10h12" />
      </>
    ),
    headset: (
      <>
        <path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v2a2 2 0 0 1-2 2h-4" />
        <rect x="2" y="11" width="5" height="7" rx="2" />
        <rect x="17" y="11" width="5" height="7" rx="2" />
      </>
    ),
    monitor: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" />
        <path d="M12 17v4M7 21h10" />
      </>
    ),
    pad: <path d="M3 6h18v13H3zM7 10h10M7 14h6" />,
    chair: <path d="M7 3h10l-1 11H8L7 3ZM5 12v5h14v-5M12 17v4M7 22l5-1 5 1" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="21"
      height="21"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name] || paths.keyboard}
    </svg>
  );
}

export default function ProductCard({
  product,
  isFavorite = false,
  onFav,
  onWish,
  onAdd,
  onQuickView,
}) {
  const [justAdded, setJustAdded] = useState(false);
  const [favPop, setFavPop] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);

  if (!product) return null;

  const favHandler = onFav || onWish;
  const slug = product.slug || "";
  const link = slug ? `/products/${slug}` : "#";
  const imgSrc = productImage(product);

  const brandName = product.brand?.name || "NEXA";
  const catName = product.category?.name || "Gaming Gear";
  const catCode = product.category?.code || "keyboard";

  const badge = product.badge || "";
  let badgeClass = "";
  if (badge.startsWith("-") || badge.includes("%")) badgeClass = "gear-badge-sale";
  else if (badge === "Mới" || badge === "New") badgeClass = "gear-badge-new";
  else if (badge) badgeClass = "gear-badge-hot";

  const feature = product.summary || product.description || "Thiết bị gaming chuẩn eSports";
  const availableStock = product.available_stock;
  const isOutOfStock = availableStock !== undefined && availableStock <= 0;

  const priceVal = product.min_price ?? product.price;
  const compareVal = product.compare_at_price;
  const discountPercent =
    priceVal && compareVal && Number(compareVal) > Number(priceVal)
      ? Math.round(((Number(compareVal) - Number(priceVal)) / Number(compareVal)) * 100)
      : null;

  const handleAddClick = async (e) => {
    e.preventDefault();
    if (!onAdd || isOutOfStock) return;
    setJustAdded(true);
    try {
      await onAdd(product);
    } finally {
      setTimeout(() => setJustAdded(false), 1600);
    }
  };

  const handleFavClick = (e) => {
    e.preventDefault();
    if (!favHandler) return;
    setFavPop(true);
    favHandler(product);
    setTimeout(() => setFavPop(false), 380);
  };

  return (
    <Tilt3DCard
      as="article"
      className="gear-card nexa-card-3d"
      intensity={9}
      scale={1.018}
      style={{ "--card-accent": product.accent_color || "var(--accent)" }}
    >
      {/* Top Badges */}
      <div className="gear-card-badges">
        {badge ? (
          <span className={`gear-badge ${badgeClass}`}>{badge}</span>
        ) : discountPercent ? (
          <span className="gear-badge gear-badge-sale">-{discountPercent}%</span>
        ) : null}
      </div>

      {/* Favorite Heart Button */}
      {favHandler && (
        <button
          type="button"
          className={`gear-favorite ${isFavorite ? "is-fav" : ""} ${favPop ? "is-popping" : ""}`}
          onClick={handleFavClick}
          aria-label={`Yêu thích ${product.name}`}
          aria-pressed={isFavorite}
        >
          <GearIcon name="heart" />
        </button>
      )}

      {/* 3D Floating Product Photo Stage */}
      <div className="gear-product-photo-wrap">
        <Link className="gear-product-photo" to={link} aria-label={`Xem ${product.name}`}>
          <span className="gear-photo-halo" aria-hidden="true" />
          {imgSrc && !imgFailed ? (
            <img
              className="nexa-product-img nexa-3d-float-img"
              src={imgSrc}
              loading="lazy"
              decoding="async"
              alt={product.name}
              onError={() => setImgFailed(true)}
            />
          ) : (
            <span className="image-empty" role="img" aria-label={product.name}>
              {imgFailed ? "Không tải được ảnh" : "Chưa có ảnh"}
            </span>
          )}
          <span className="gear-photo-floor-shadow" aria-hidden="true" />
        </Link>

        {onQuickView && (
          <button
            type="button"
            className="nexa-quickview-trigger"
            onClick={(e) => {
              e.preventDefault();
              onQuickView(product);
            }}
            aria-label={`Xem nhanh ${product.name}`}
          >
            <GearIcon name="eye" />
            <span>Xem nhanh</span>
          </button>
        )}
      </div>

      {/* Card Metadata */}
      <div className="gear-product-meta">
        <div className="gear-meta-toprow">
          <span className="gear-kicker" title={`${brandName} / ${catName}`}>
            {brandName} <i aria-hidden="true">/</i> {catName}
          </span>
          {availableStock !== undefined ? (
            <span
              className={`nexa-stock-dot ${
                isOutOfStock ? "out" : availableStock <= 5 ? "low" : "in"
              }`}
            >
              {isOutOfStock
                ? "Hết hàng"
                : availableStock <= 5
                ? `Còn ${availableStock}`
                : "Sẵn hàng"}
            </span>
          ) : product.rating_avg ? (
            <span className="nexa-card-rating" title={`Đánh giá ${product.rating_avg}/5`}>
              ★ {product.rating_avg}
            </span>
          ) : null}
        </div>

        <h3>
          <Link to={link} title={product.name}>
            {product.short_name || product.name}
          </Link>
        </h3>

        <p>
          <span className="gear-feature-icon" aria-hidden="true">
            <GearIcon name={catCode} />
          </span>
          <span className="gear-feature-text" title={feature}>
            {feature}
          </span>
        </p>

        <div className="gear-price">
          <span>{priceVal != null ? money(priceVal) : "Chưa có giá"}</span>
          {compareVal && Number(compareVal) > Number(priceVal) && (
            <del>{money(compareVal)}</del>
          )}
        </div>

        {onAdd ? (
          <button
            type="button"
            className={`gear-add ${justAdded ? "added is-adding" : ""}`}
            disabled={isOutOfStock}
            onClick={handleAddClick}
            aria-label={`Thêm ${product.name} vào giỏ hàng`}
          >
            {justAdded ? (
              <>
                ✓ Đã thêm vào giỏ
              </>
            ) : isOutOfStock ? (
              "Tạm hết hàng"
            ) : (
              <>
                Thêm vào giỏ
                <span className="gear-add-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M3 4h2l2.2 11.2a2 2 0 0 0 2 1.6h8.9a2 2 0 0 0 1.9-1.4L22 9H6" />
                    <circle cx="10" cy="21" r="1" />
                    <circle cx="19" cy="21" r="1" />
                  </svg>
                </span>
              </>
            )}
          </button>
        ) : (
          <Link className="gear-add" to={link}>
            Khám phá chi tiết
            <span className="gear-add-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <path d="M7 17L17 7M7 7h10v10" />
              </svg>
            </span>
          </Link>
        )}
      </div>
    </Tilt3DCard>
  );
}
