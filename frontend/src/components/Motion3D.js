import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { fallbackProductImage, money, productImage } from "../api/format";

/**
 * High-performance 3D Perspective Tilt Container.
 * Updates CSS custom properties directly on the DOM node via requestAnimationFrame
 * so there are zero React re-renders during pointer movement.
 */
export function Tilt3DCard({
  as = "div",
  className = "",
  intensity = 10,
  scale = 1.02,
  glare = true,
  style = {},
  children,
  ...rest
}) {
  const ref = useRef(null);
  const frameRef = useRef(null);

  const handlePointerMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      if (frameRef.current) cancelAnimationFrame(frameRef.current);

      const clientX = e.clientX;
      const clientY = e.clientY;

      frameRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
        const py = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));

        const rotateY = ((px - 0.5) * intensity * 2).toFixed(2);
        const rotateX = ((0.5 - py) * intensity * 2).toFixed(2);

        el.style.setProperty("--rx", `${rotateX}deg`);
        el.style.setProperty("--ry", `${rotateY}deg`);
        el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
        el.style.setProperty("--tilt-scale", String(scale));
        el.setAttribute("data-tilting", "true");
      });
    },
    [intensity, scale]
  );

  const handlePointerLeave = useCallback(() => {
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg");
    el.style.setProperty("--ry", "0deg");
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
    el.style.setProperty("--tilt-scale", "1");
    el.removeAttribute("data-tilting");
  }, []);

  useEffect(() => {
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `nexa-3d-tilt ${className}`.trim(),
      style: {
        "--rx": "0deg",
        "--ry": "0deg",
        "--mx": "50%",
        "--my": "50%",
        "--tilt-scale": "1",
        ...style,
      },
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      ...rest,
    },
    children,
    glare ? <span className="nexa-3d-glare" aria-hidden="true" /> : null
  );
}

/**
 * Interactive 3D Parallax Stage for Hero & Product Studio.
 */
export function Interactive3DStage({ className = "", children, intensity = 14, ...rest }) {
  const stageRef = useRef(null);
  const rafRef = useRef(null);

  const onPointerMove = useCallback(
    (e) => {
      const el = stageRef.current;
      if (!el) return;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      const clientX = e.clientX;
      const clientY = e.clientY;

      rafRef.current = requestAnimationFrame(() => {
        const rect = el.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const nx = (clientX - rect.left) / rect.width - 0.5;
        const ny = (clientY - rect.top) / rect.height - 0.5;

        el.style.setProperty("--stage-ry", `${(nx * intensity * 1.8).toFixed(2)}deg`);
        el.style.setProperty("--stage-rx", `${(-ny * intensity * 1.4).toFixed(2)}deg`);
        el.style.setProperty("--stage-tx", `${(nx * 26).toFixed(1)}px`);
        el.style.setProperty("--stage-ty", `${(ny * 18).toFixed(1)}px`);
        el.style.setProperty("--cursor-x", `${((nx + 0.5) * 100).toFixed(1)}%`);
        el.style.setProperty("--cursor-y", `${((ny + 0.5) * 100).toFixed(1)}%`);
      });
    },
    [intensity]
  );

  const onPointerLeave = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    const el = stageRef.current;
    if (!el) return;
    el.style.setProperty("--stage-ry", "0deg");
    el.style.setProperty("--stage-rx", "0deg");
    el.style.setProperty("--stage-tx", "0px");
    el.style.setProperty("--stage-ty", "0px");
    el.style.setProperty("--cursor-x", "50%");
    el.style.setProperty("--cursor-y", "50%");
  }, []);

  return (
    <div
      ref={stageRef}
      className={`nexa-3d-stage ${className}`.trim()}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
      style={{
        "--stage-ry": "0deg",
        "--stage-rx": "0deg",
        "--stage-tx": "0px",
        "--stage-ty": "0px",
        "--cursor-x": "50%",
        "--cursor-y": "50%",
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * 3D Quick View Modal for instant product inspection & cart addition
 */
export function QuickViewModal({ product, isOpen, onClose, onAdd, onFav, isFavorite }) {
  const [angle, setAngle] = useState("front");

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const imgSrc = productImage(product);
  const price = product.min_price ?? product.price;
  const stock = product.available_stock ?? 10;

  const modalNode = (
    <div className="nexa-qv-backdrop" onClick={onClose} role="dialog" aria-modal="true" aria-label={`Xem nhanh ${product.name}`}>
      <div className="nexa-qv-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="nexa-qv-close" onClick={onClose} aria-label="Đóng cửa sổ xem nhanh">
          ×
        </button>

        <div className="nexa-qv-grid">
          <Interactive3DStage className={`nexa-qv-visual view-${angle}`} intensity={18}>
            <div className="nexa-qv-orbit nexa-qv-orbit-1" aria-hidden="true" />
            <div className="nexa-qv-orbit nexa-qv-orbit-2" aria-hidden="true" />
            <div className="nexa-qv-glow" style={{ "--glow-color": product.accent_color || "#4868ff" }} aria-hidden="true" />
            {imgSrc ? (
              <img
                className="nexa-qv-img"
                src={imgSrc}
                alt={product.name}
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = fallbackProductImage(product);
                }}
              />
            ) : (
              <span className="image-empty">Chưa có ảnh</span>
            )}
            <div className="nexa-qv-angles" role="group" aria-label="Góc xoay 3D">
              <button type="button" className={angle === "front" ? "active" : ""} onClick={() => setAngle("front")}>
                Trực diện
              </button>
              <button type="button" className={angle === "tilt" ? "active" : ""} onClick={() => setAngle("tilt")}>
                Góc 3D
              </button>
              <button type="button" className={angle === "zoom" ? "active" : ""} onClick={() => setAngle("zoom")}>
                Cận cảnh
              </button>
            </div>
          </Interactive3DStage>

          <div className="nexa-qv-info">
            <span className="gear-kicker">
              {product.brand?.name || "NEXA"} <i>/</i> {product.category?.name || "GAMING GEAR"}
            </span>
            <h2 className="nexa-qv-title">{product.name}</h2>

            <div className="nexa-qv-badges">
              {product.badge && <span className="nexa-pill nexa-pill-accent">{product.badge}</span>}
              <span className={`nexa-pill ${stock > 0 ? "nexa-pill-stock" : "nexa-pill-out"}`}>
                {stock > 0 ? `✓ Sẵn hàng (${stock})` : "Tạm hết hàng"}
              </span>
              {product.rating_avg && (
                <span className="nexa-pill nexa-pill-star">
                  ★ {product.rating_avg} ({product.review_count || 1})
                </span>
              )}
            </div>

            <div className="nexa-qv-price">
              <strong>{price != null ? money(price) : "Liên hệ"}</strong>
              {product.compare_at_price && <del>{money(product.compare_at_price)}</del>}
            </div>

            <p className="nexa-qv-summary">
              {product.summary || product.description || "Thiết bị ngoại vi hiệu năng cao chuẩn eSports từ NEXA."}
            </p>

            <div className="nexa-qv-actions">
              {onAdd && (
                <button
                  type="button"
                  className="btn btn-primary nexa-btn-3d"
                  disabled={stock <= 0}
                  onClick={() => {
                    onAdd(product);
                    onClose();
                  }}
                >
                  {stock > 0 ? "Thêm vào giỏ hàng" : "Tạm hết hàng"}
                </button>
              )}
              {onFav && (
                <button
                  type="button"
                  className={`btn btn-quiet ${isFavorite ? "is-fav-btn" : ""}`}
                  onClick={() => onFav(product)}
                >
                  {isFavorite ? "♥ Đã yêu thích" : "♡ Lưu yêu thích"}
                </button>
              )}
            </div>

            <Link className="nexa-qv-detail-link" to={`/products/${product.slug}`} onClick={onClose}>
              Xem toàn bộ thông số & đánh giá chi tiết →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(modalNode, document.body) : modalNode;
}
