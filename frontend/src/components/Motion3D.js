import { createElement, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import gsap from "gsap";
import {
  cleanProductTitle,
  displayBrandName,
  displayProductFeature,
  fallbackProductImage,
  money,
  productImage,
} from "../api/format";

function isMotionAllowed() {
  if (typeof window === "undefined") return false;
  if (typeof process !== "undefined" && process.env && process.env.NODE_ENV === "test") {
    return false;
  }
  if (typeof window.matchMedia === "function") {
    return !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }
  return true;
}

/**
 * Lenis Smooth Inertia Scrolling synchronized with GSAP ticker.
 * Loaded dynamically in browser runtime so Jest CJS runner never trips on lenis.mjs.
 */
export function useLenisSmoothScroll(pathname, paused = false) {
  const lenisRef = useRef(null);
  const pausedRef = useRef(paused);
  pausedRef.current = paused;

  useEffect(() => {
    if (!isMotionAllowed()) return undefined;
    let active = true;
    let lenisInstance = null;
    let tickerFn = null;

    import("lenis")
      .then((mod) => {
        if (!active) return;
        const LenisClass = mod.default || mod.Lenis || mod;
        lenisInstance = new LenisClass({
          duration: 1.05,
          easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
          smoothWheel: true,
          wheelMultiplier: 0.95,
        });
        lenisRef.current = lenisInstance;
        if (pausedRef.current) {
          lenisInstance.stop();
        }
        tickerFn = (time) => {
          lenisInstance.raf(time * 1000);
        };
        gsap.ticker.add(tickerFn);
        gsap.ticker.lagSmoothing(0);
      })
      .catch(() => {});

    return () => {
      active = false;
      if (tickerFn) gsap.ticker.remove(tickerFn);
      if (lenisInstance) lenisInstance.destroy();
      lenisRef.current = null;
    };
  }, []);

  useEffect(() => {
    const lenis = lenisRef.current;
    if (!lenis) return;
    if (paused) {
      lenis.stop();
    } else {
      lenis.start();
    }
  }, [paused]);

  useEffect(() => {
    if (lenisRef.current) {
      lenisRef.current.scrollTo(0, { immediate: true });
    }
  }, [pathname]);
}

/**
 * GSAP Staggered Grid Reveal (React-Bits / 21st.dev style entrance for product cards).
 */
export function useGsapGridStagger(gridRef, triggerKey) {
  useEffect(() => {
    if (!isMotionAllowed() || !gridRef?.current) return undefined;
    const cards = gridRef.current.querySelectorAll(".gear-card");
    if (!cards.length) return undefined;

    const tween = gsap.fromTo(
      cards,
      { opacity: 0, y: 18, scale: 0.985 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.46,
        stagger: 0.032,
        ease: "power3.out",
        overwrite: "auto",
        clearProps: "opacity,transform",
      }
    );
    return () => {
      tween.kill();
    };
  }, [gridRef, triggerKey]);
}

/**
 * GSAP Product Detail Studio Entrance & View-Angle Morphing.
 */
export function useGsapStudioAnimation(rootRef, slug, activeView) {
  useEffect(() => {
    if (!isMotionAllowed() || !rootRef?.current) return undefined;
    const root = rootRef.current;
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".pd-wordmark > span",
        { opacity: 0, y: 22 },
        {
          opacity: (i, el) =>
            el.closest(".has-marketplace-image") ? 0.42 : 0.78,
          y: 0,
          duration: 0.68,
          stagger: 0.08,
          ease: "expo.out",
          overwrite: "auto",
        }
      );
      gsap.fromTo(
        ".pd-product-art",
        { opacity: 0, scale: 0.9, y: 18 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.72,
          ease: "expo.out",
          overwrite: "auto",
        }
      );
      gsap.fromTo(
        ".pd-product-heading, .pd-stock, .pd-buy-row",
        { opacity: 0, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.52,
          stagger: 0.06,
          ease: "power3.out",
          overwrite: "auto",
        }
      );
      gsap.fromTo(
        ".pd-specs > div",
        { opacity: 0, x: 12 },
        {
          opacity: 1,
          x: 0,
          duration: 0.42,
          stagger: 0.03,
          ease: "power2.out",
          overwrite: "auto",
        }
      );
    }, root);

    return () => ctx.revert();
  }, [rootRef, slug]);

  useEffect(() => {
    if (!isMotionAllowed() || !rootRef?.current) return undefined;
    const art = rootRef.current.querySelector(".pd-product-art > img");
    if (!art) return undefined;
    const tween = gsap.fromTo(
      art,
      { scale: 0.94, filter: "brightness(1.08)" },
      {
        scale: 1,
        filter: "brightness(1)",
        duration: 0.48,
        ease: "back.out(1.5)",
        overwrite: "auto",
        clearProps: "scale,filter",
      }
    );
    return () => tween.kill();
  }, [rootRef, activeView]);
}

/**
 * High-performance 3D Perspective Tilt + React-Bits / 21st.dev Spotlight Border Card.
 * Powered by GSAP quickTo for smooth inertia and zero React re-renders.
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
  const stateRef = useRef({ rx: 0, ry: 0, s: 1 });
  const tweenRef = useRef(null);

  const handlePointerMove = useCallback(
    (e) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;

      const px = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const py = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));
      const targetRY = (px - 0.5) * intensity * 2;
      const targetRX = (0.5 - py) * intensity * 2;

      el.style.setProperty("--mx", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--my", `${(py * 100).toFixed(1)}%`);
      el.style.setProperty("--spot-x", `${(e.clientX - rect.left).toFixed(1)}px`);
      el.style.setProperty("--spot-y", `${(e.clientY - rect.top).toFixed(1)}px`);
      el.setAttribute("data-tilting", "true");

      if (isMotionAllowed()) {
        if (tweenRef.current) tweenRef.current.kill();
        tweenRef.current = gsap.to(stateRef.current, {
          rx: targetRX,
          ry: targetRY,
          s: scale,
          duration: 0.32,
          ease: "power3.out",
          onUpdate: () => {
            el.style.setProperty("--rx", `${stateRef.current.rx.toFixed(2)}deg`);
            el.style.setProperty("--ry", `${stateRef.current.ry.toFixed(2)}deg`);
            el.style.setProperty("--tilt-scale", stateRef.current.s.toFixed(3));
          },
        });
      } else {
        el.style.setProperty("--rx", `${targetRX.toFixed(2)}deg`);
        el.style.setProperty("--ry", `${targetRY.toFixed(2)}deg`);
        el.style.setProperty("--tilt-scale", String(scale));
      }
    },
    [intensity, scale]
  );

  const handlePointerLeave = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.removeAttribute("data-tilting");

    if (isMotionAllowed()) {
      if (tweenRef.current) tweenRef.current.kill();
      tweenRef.current = gsap.to(stateRef.current, {
        rx: 0,
        ry: 0,
        s: 1,
        duration: 0.55,
        ease: "expo.out",
        onUpdate: () => {
          el.style.setProperty("--rx", `${stateRef.current.rx.toFixed(2)}deg`);
          el.style.setProperty("--ry", `${stateRef.current.ry.toFixed(2)}deg`);
          el.style.setProperty("--tilt-scale", stateRef.current.s.toFixed(3));
        },
      });
    } else {
      el.style.setProperty("--rx", "0deg");
      el.style.setProperty("--ry", "0deg");
      el.style.setProperty("--tilt-scale", "1");
    }
    el.style.setProperty("--mx", "50%");
    el.style.setProperty("--my", "50%");
  }, []);

  useEffect(() => {
    return () => {
      if (tweenRef.current) tweenRef.current.kill();
    };
  }, []);

  return createElement(
    as,
    {
      ref,
      className: `nexa-3d-tilt nexa-spotlight-card ${className}`.trim(),
      style: {
        "--rx": "0deg",
        "--ry": "0deg",
        "--mx": "50%",
        "--my": "50%",
        "--spot-x": "50%",
        "--spot-y": "50%",
        "--tilt-scale": "1",
        ...style,
      },
      onPointerMove: handlePointerMove,
      onPointerLeave: handlePointerLeave,
      ...rest,
    },
    children,
    glare ? <span className="nexa-3d-glare" aria-hidden="true" /> : null,
    glare ? <span className="nexa-21st-border-glow" aria-hidden="true" /> : null
  );
}

/**
 * Interactive 3D Parallax Stage for Hero & Product Studio (GSAP powered).
 */
export function Interactive3DStage({ className = "", children, intensity = 14, ...rest }) {
  const stageRef = useRef(null);
  const posRef = useRef({ rx: 0, ry: 0, tx: 0, ty: 0 });
  const tweenRef = useRef(null);

  const onPointerMove = useCallback(
    (e) => {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const nx = (e.clientX - rect.left) / rect.width - 0.5;
      const ny = (e.clientY - rect.top) / rect.height - 0.5;

      el.style.setProperty("--cursor-x", `${((nx + 0.5) * 100).toFixed(1)}%`);
      el.style.setProperty("--cursor-y", `${((ny + 0.5) * 100).toFixed(1)}%`);

      const targetRY = nx * intensity * 1.8;
      const targetRX = -ny * intensity * 1.4;
      const targetTX = nx * 24;
      const targetTY = ny * 16;

      if (isMotionAllowed()) {
        if (tweenRef.current) tweenRef.current.kill();
        tweenRef.current = gsap.to(posRef.current, {
          rx: targetRX,
          ry: targetRY,
          tx: targetTX,
          ty: targetTY,
          duration: 0.42,
          ease: "power3.out",
          onUpdate: () => {
            el.style.setProperty("--stage-ry", `${posRef.current.ry.toFixed(2)}deg`);
            el.style.setProperty("--stage-rx", `${posRef.current.rx.toFixed(2)}deg`);
            el.style.setProperty("--stage-tx", `${posRef.current.tx.toFixed(1)}px`);
            el.style.setProperty("--stage-ty", `${posRef.current.ty.toFixed(1)}px`);
          },
        });
      } else {
        el.style.setProperty("--stage-ry", `${targetRY.toFixed(2)}deg`);
        el.style.setProperty("--stage-rx", `${targetRX.toFixed(2)}deg`);
        el.style.setProperty("--stage-tx", `${targetTX.toFixed(1)}px`);
        el.style.setProperty("--stage-ty", `${targetTY.toFixed(1)}px`);
      }
    },
    [intensity]
  );

  const onPointerLeave = useCallback(() => {
    const el = stageRef.current;
    if (!el) return;
    if (isMotionAllowed()) {
      if (tweenRef.current) tweenRef.current.kill();
      tweenRef.current = gsap.to(posRef.current, {
        rx: 0,
        ry: 0,
        tx: 0,
        ty: 0,
        duration: 0.65,
        ease: "expo.out",
        onUpdate: () => {
          el.style.setProperty("--stage-ry", `${posRef.current.ry.toFixed(2)}deg`);
          el.style.setProperty("--stage-rx", `${posRef.current.rx.toFixed(2)}deg`);
          el.style.setProperty("--stage-tx", `${posRef.current.tx.toFixed(1)}px`);
          el.style.setProperty("--stage-ty", `${posRef.current.ty.toFixed(1)}px`);
        },
      });
    } else {
      el.style.setProperty("--stage-ry", "0deg");
      el.style.setProperty("--stage-rx", "0deg");
      el.style.setProperty("--stage-tx", "0px");
      el.style.setProperty("--stage-ty", "0px");
    }
    el.style.setProperty("--cursor-x", "50%");
    el.style.setProperty("--cursor-y", "50%");
  }, []);

  useEffect(() => {
    return () => {
      if (tweenRef.current) tweenRef.current.kill();
    };
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
              {displayBrandName(product) ? (
                <>
                  {displayBrandName(product)} <i>/</i> {product.category?.name || "GAMING GEAR"}
                </>
              ) : (
                product.category?.name || "GAMING GEAR"
              )}
            </span>
            <h2 className="nexa-qv-title">{cleanProductTitle(product)}</h2>

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
              {displayProductFeature(product)}
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
