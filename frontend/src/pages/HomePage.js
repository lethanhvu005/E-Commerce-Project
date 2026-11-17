import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { cartService, catalogService, wishlistService } from "../api/client";
import { assetUrl, categoryImage, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { QuickViewModal, Tilt3DCard } from "../components/Motion3D";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function HeroWaves({ index }) {
  return (
    <svg
      className="hero-waves"
      viewBox="0 0 1440 620"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={`wave-ink-${index}`} x1="0" y1="0" x2="1" y2=".3">
          <stop offset="0" stopColor="var(--wave-deep)" stopOpacity="0" />
          <stop offset=".43" stopColor="var(--wave-blue)" />
          <stop offset=".65" stopColor="var(--wave-ice)" />
          <stop offset="1" stopColor="var(--wave-blue)" stopOpacity=".1" />
        </linearGradient>
        <linearGradient id={`wave-fill-${index}`} x1="0" y1="0" x2=".5" y2="1">
          <stop stopColor="var(--wave-blue)" stopOpacity=".2" />
          <stop offset="1" stopColor="var(--wave-deep)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g fill={`url(#wave-fill-${index})`}>
        <path d="M140 475C390 610 415 275 710 355S1100 590 1440 280L1440 465C1120 680 970 455 700 430S345 655 140 475Z" />
        <path d="M290 260C490 60 560 440 780 210S1090 100 1340 65C1140 285 950 115 770 320S470 250 290 260Z" />
        <path d="M550 560C800 360 945 650 1300 390L1440 485C1190 685 950 550 760 585Z" />
      </g>
      <g fill="none" stroke={`url(#wave-ink-${index})`}>
        <path
          className="wave-aura"
          d="M100 470C390 610 415 275 710 355S1100 590 1440 280M290 260C490 60 560 440 780 210S1090 100 1340 65M550 560C800 360 945 650 1300 390"
        />
        <path
          className="wave-edge"
          d="M100 470C390 610 415 275 710 355S1100 590 1440 280M290 260C490 60 560 440 780 210S1090 100 1340 65M550 560C800 360 945 650 1300 390"
        />
      </g>
    </svg>
  );
}

function getCampaignMeta(banner, isLight = false) {
  const key = `${banner?.desktop_image_key || ""} ${banner?.link_path || ""} ${banner?.title || ""}`.toLowerCase();
  const rawDesktop = assetUrl(banner?.desktop_image_key) || "";
  const rawMobile = assetUrl(banner?.mobile_image_key) || rawDesktop;
  const isDayVariantInMobile = rawMobile.toLowerCase().includes("-day.");

  if (key.includes("keys") || key.includes("ban-phim") || key.includes("phím")) {
    const darkImg = rawDesktop || "/assets/images/campaign/cobalt-keys-lettered.png";
    const lightImg = isDayVariantInMobile ? rawMobile : "/assets/images/campaign/cobalt-keys-day.png";
    const activeImg = isLight ? lightImg : darkImg;
    return {
      campaignClass: "campaign-keys",
      desktopImg: activeImg,
      mobileImg: isDayVariantInMobile ? activeImg : rawMobile,
      darkImg,
      lightImg,
      eyebrow: "DÀNH CHO NHỮNG ĐIỀU BẠN TẠO NÊN",
      indexLabel: "BỘ SƯU TẬP BÀN PHÍM",
      noteLines: ["Thiết kế tinh gọn.", "Cảm hứng bất tận."],
      alt: banner?.title || "Ảnh ý tưởng bàn phím giữa những cánh hoa xanh cobalt",
    };
  }
  if (key.includes("motion") || key.includes("chuot") || key.includes("chuột") || key.includes("chuyển động")) {
    const darkImg = rawDesktop || "/assets/images/campaign/cobalt-motion.png";
    const lightImg = isDayVariantInMobile ? rawMobile : "/assets/images/campaign/cobalt-motion-day.png";
    const activeImg = isLight ? lightImg : darkImg;
    return {
      campaignClass: "campaign-motion",
      desktopImg: activeImg,
      mobileImg: isDayVariantInMobile ? activeImg : rawMobile,
      darkImg,
      lightImg,
      eyebrow: "CÔNG NGHỆ HÒA VÀO NHỊP SỐNG",
      indexLabel: "BỘ SƯU TẬP CHUỘT",
      noteLines: ["Chuyển động tự nhiên.", "Trải nghiệm liền mạch."],
      alt: banner?.title || "Ảnh ý tưởng chuột giữa những cánh hoa xanh cobalt",
    };
  }
  const isSoundCampaign =
    key.includes("sound") ||
    key.includes("tai-nghe") ||
    key.includes("khoảnh khắc") ||
    key.includes("âm thanh");
  const darkImg = rawDesktop || (isSoundCampaign ? "/assets/images/campaign/cobalt-sound-wide.png" : "");
  const lightImg = isDayVariantInMobile
    ? rawMobile
    : isSoundCampaign
    ? "/assets/images/campaign/cobalt-sound-wide-day.png"
    : rawDesktop;
  const activeImg = isLight ? lightImg : darkImg;
  return {
    campaignClass: "campaign-sound",
    desktopImg: activeImg,
    mobileImg: isDayVariantInMobile ? activeImg : rawMobile,
    darkImg,
    lightImg,
    eyebrow: "ÂM THANH ĐỒNG HÀNH CÙNG BẠN",
    indexLabel: "BỘ SƯU TẬP TAI NGHE",
    noteLines: ["Chạm vào âm nhạc.", "Chạm đến cảm xúc."],
    alt: banner?.title || "Ảnh ý tưởng tai nghe giữa những cánh hoa xanh cobalt",
  };
}

function splitTitle(title = "") {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const accentLength = words.length > 3 ? 2 : 1;
  const accent = words.slice(0, accentLength).join(" ");
  const rest = words.slice(accentLength);
  const midpoint = Math.floor(rest.length / 2) || 1;
  const line1 = rest.slice(0, midpoint).join(" ");
  let line2 = rest.slice(midpoint).join(" ");
  if (line2 && !line2.endsWith(".")) {
    line2 = `${line2}.`;
  }
  return {
    accent,
    lines: [line1, line2].filter(Boolean),
  };
}

const TRUST_PILLARS = [
  {
    icon: "⚡",
    title: "Giao nhanh nội thành 2–4h",
    desc: "Đóng gói chống sốc 3 lớp, nhận hàng ngay trong ngày.",
  },
  {
    icon: "🛡️",
    title: "Bảo hành chính hãng 24 tháng",
    desc: "Hỗ trợ 1 đổi 1 trong 30 ngày đầu nếu có lỗi phần cứng.",
  },
  {
    icon: "🎧",
    title: "Trải nghiệm & Tư vấn thực tế",
    desc: "Đội ngũ kỹ thuật hỗ trợ chọn switch, form chuột và âm thanh phù hợp.",
  },
  {
    icon: "🏷️",
    title: "Ưu đãi thành viên & Voucher",
    desc: "Áp mã giảm giá trực tiếp khi thanh toán, tích điểm mọi đơn hàng.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  const HOME_PAGE_SIZE = 12;
  const [data, setData] = useState({
    banners: null,
    categories: null,
    brands: null,
    collections: null,
  });
  const [productsState, setProductsState] = useState({ items: null, count: 0 });
  const [highlights, setHighlights] = useState(null);
  const [allProductsCount, setAllProductsCount] = useState(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [failedImages, setFailedImages] = useState({});
  const productReqRef = useRef(0);

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [productPage, setProductPage] = useState(1);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [heroTilt, setHeroTilt] = useState({ tx: 0, ty: 0, rx: 0, ry: 0 });
  const [docTheme, setDocTheme] = useState(
    () => (typeof document !== "undefined" && document.documentElement.getAttribute("data-theme")) || "dark"
  );

  useEffect(() => {
    if (typeof document === "undefined" || typeof MutationObserver === "undefined") return undefined;
    const html = document.documentElement;
    const syncDocTheme = () => setDocTheme(html.getAttribute("data-theme") || "dark");
    syncDocTheme();
    const observer = new MutationObserver(syncDocTheme);
    observer.observe(html, { attributes: true, attributeFilter: ["data-theme"] });
    return () => observer.disconnect();
  }, []);

  const isLightTheme = (outlet.theme || docTheme) === "light";

  const markImageFailed = useCallback((key) => {
    setFailedImages((prev) => (prev[key] ? prev : { ...prev, [key]: true }));
  }, []);

  const loadHomeMeta = useCallback(() => {
    setError(null);
    return Promise.all([
      catalogService.getHomeBanners(),
      catalogService.getCategories(),
      catalogService.getBrands(),
      catalogService.getCollections(),
    ])
      .then(([banners, categories, brands, collections]) =>
        setData({
          banners: banners.results || banners || [],
          categories: categories.results || categories || [],
          brands: brands.results || brands || [],
          collections: collections.results || collections || [],
        })
      )
      .catch(setError);
  }, []);

  const loadFeaturedProducts = useCallback((categorySlug, pageNumber) => {
    const reqId = ++productReqRef.current;
    setProductsLoading(true);
    setError(null);
    const params = {
      page: pageNumber,
      page_size: HOME_PAGE_SIZE,
      ordering: "-created_at",
    };
    if (categorySlug) {
      params.category = categorySlug;
    }
    return catalogService
      .getProducts(params)
      .then((res) => {
        if (reqId !== productReqRef.current) return;
        const items = res?.results || (Array.isArray(res) ? res : []);
        const count = typeof res?.count === "number" ? res.count : items.length;
        setProductsState({ items, count });
        if (!categorySlug) {
          setAllProductsCount(count);
          if (pageNumber === 1) {
            setHighlights(items);
          }
        }
      })
      .catch((err) => {
        if (reqId === productReqRef.current) setError(err);
      })
      .finally(() => {
        if (reqId === productReqRef.current) setProductsLoading(false);
      });
  }, []);

  const loadHome = useCallback(() => {
    loadHomeMeta();
    loadFeaturedProducts(activeCategory, productPage);
  }, [loadHomeMeta, loadFeaturedProducts, activeCategory, productPage]);

  useEffect(() => {
    loadHomeMeta();
  }, [loadHomeMeta]);

  useEffect(() => {
    loadFeaturedProducts(activeCategory, productPage);
  }, [activeCategory, productPage, loadFeaturedProducts]);

  useEffect(() => {
    if (paused || !data.banners || data.banners.length < 2) return undefined;
    const timer = window.setInterval(
      () => setSlide((value) => (value + 1) % data.banners.length),
      6500
    );
    return () => window.clearInterval(timer);
  }, [paused, data.banners]);

  const totalProductPages = useMemo(() => {
    if (!productsState.count) return 1;
    return Math.max(1, Math.ceil(productsState.count / HOME_PAGE_SIZE));
  }, [productsState.count]);

  const visibleProducts = productsState.items;

  const spotlightProduct = useMemo(() => {
    const source = highlights || productsState.items;
    if (!source || source.length === 0) return null;
    return source.find((p) => p.badge) || source[0];
  }, [highlights, productsState.items]);

  const newestThree = useMemo(() => {
    const source = highlights || productsState.items;
    if (!source || source.length === 0) return [];
    return source.slice(0, 3);
  }, [highlights, productsState.items]);

  const handleWishlist = async (product) => {
    if (!user) return navigate("/login", { state: { from: { pathname: "/" } } });
    const isFav = wishlistIds.has(product.id);
    try {
      if (isFav) {
        await wishlistService.removeWishlist(product.id);
        setToastMsg(`Đã xóa ${product.name} khỏi yêu thích.`);
      } else {
        await wishlistService.addWishlist(product.id);
        setToastMsg(`Đã lưu ${product.name} vào danh sách yêu thích ♥`);
      }
      if (refreshWishlist) refreshWishlist();
    } catch (requestError) {
      setToastMsg(requestError.message || "Không thể cập nhật yêu thích.");
    }
  };

  const handleAddToCart = async (product) => {
    if (!user) return navigate("/login", { state: { from: { pathname: "/" } } });
    try {
      let variantId = product.default_variant_id;
      if (!variantId) {
        const detail = await catalogService.getProductDetail(product.slug);
        const variant =
          (detail.variants || []).find((v) => v.available > 0) || detail.variants?.[0];
        variantId = variant?.id;
      }
      if (!variantId) {
        setToastMsg("Sản phẩm tạm thời hết hàng.");
        return;
      }
      await cartService.addItem(variantId, 1);
      setToastMsg(`Đã thêm ${product.name} vào giỏ hàng!`);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm vào giỏ hàng.");
    }
  };

  const bannerCount = data.banners?.length || 0;

  const handleHeroMouseMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - rect.left) / rect.width - 0.5;
    const ny = (e.clientY - rect.top) / rect.height - 0.5;
    setHeroTilt({
      tx: Number((nx * -22).toFixed(2)),
      ty: Number((ny * -14).toFixed(2)),
      rx: Number((ny * -5).toFixed(2)),
      ry: Number((nx * 7).toFixed(2)),
    });
  };

  const handleHeroMouseLeave = () => {
    setHeroTilt({ tx: 0, ty: 0, rx: 0, ry: 0 });
  };

  const handleHeroKeyDown = (e) => {
    if (bannerCount < 2) return;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      setSlide((s) => (s - 1 + bannerCount) % bannerCount);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      setSlide((s) => (s + 1) % bannerCount);
    }
  };

  return (
    <>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onAdd={handleAddToCart}
        onFav={handleWishlist}
        isFavorite={quickViewProduct ? wishlistIds.has(quickViewProduct.id) : false}
      />

      {/* Hero Carousel with 3D spatial transition & Dark/Light daytime support */}
      <section
        className="gear-hero container nexa-hero-cinematic"
        aria-roledescription="carousel"
        aria-label="Sản phẩm được giới thiệu"
        tabIndex="0"
        onKeyDown={handleHeroKeyDown}
        onMouseMove={handleHeroMouseMove}
        onMouseLeave={handleHeroMouseLeave}
        style={{
          "--hero-tx": `${heroTilt.tx}px`,
          "--hero-ty": `${heroTilt.ty}px`,
          "--hero-rx": `${heroTilt.rx}deg`,
          "--hero-ry": `${heroTilt.ry}deg`,
        }}
      >
        {!data.banners && !error && (
          <div className="legacy-hero-state">
            <Loading label="Đang tải không gian trưng bày..." />
          </div>
        )}
        {data.banners?.length === 0 && (
          <div className="legacy-hero-state">
            <Empty
              title="Chưa có banner đang hoạt động"
              text="Banner sẽ hiển thị tại đây khi được thêm từ hệ thống quản trị."
            />
          </div>
        )}
        {bannerCount > 0 && (
          <>
            <div className="slider-viewport nexa-slider-stage">
              {data.banners.map((banner, index) => {
                const meta = getCampaignMeta(banner, isLightTheme);
                const title = splitTitle(banner.title);
                const bannerImgKey = `banner-${banner.id ?? index}`;
                const hasBannerImg = Boolean((meta.desktopImg || meta.mobileImg) && !failedImages[bannerImgKey]);
                const isActive = index === slide;
                const prevIndex = (slide - 1 + bannerCount) % bannerCount;
                const stateClass = isActive
                  ? "is-active"
                  : index === prevIndex
                  ? "is-prev"
                  : "is-next";
                return (
                  <div
                    className={`gear-slide ${meta.campaignClass} ${stateClass}`}
                    data-slide-panel={index}
                    key={banner.id || index}
                    aria-hidden={!isActive}
                  >
                    <HeroWaves index={index} />
                    <div className="gear-stage">
                      <span className="nexa-stage-aura" aria-hidden="true" />
                      {hasBannerImg ? (
                        <picture>
                          {meta.mobileImg && meta.mobileImg !== meta.desktopImg && (
                            <source media="(max-width: 767px)" srcSet={meta.mobileImg} />
                          )}
                          <img
                            className="hero-product-image"
                            src={meta.desktopImg || meta.mobileImg}
                            data-dark-src={meta.darkImg || meta.desktopImg}
                            data-light-src={meta.lightImg || meta.desktopImg}
                            width="1536"
                            height="1024"
                            alt={meta.alt || banner.title}
                            fetchPriority={index === 0 ? "high" : undefined}
                            loading={index === 0 ? undefined : "lazy"}
                            decoding="async"
                            onError={() => markImageFailed(bannerImgKey)}
                          />
                        </picture>
                      ) : (
                        <div className="image-empty hero-image-empty" role="img" aria-label={meta.alt || banner.title}>
                          <span>Chưa có ảnh banner</span>
                        </div>
                      )}
                      <span className="campaign-caption">NEXA / ẢNH Ý TƯỞNG</span>
                    </div>

                    <div className="gear-slide-copy">
                      <span className="gear-kicker">{meta.eyebrow}</span>
                      <h1>
                        <em>{title.accent}</em>
                        {title.lines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </h1>
                      <p className="hero-benefit">{banner.subtitle}</p>
                      <div className="hero-buy">
                        <Link
                          className="btn btn-primary"
                          to={banner.link_path || "/products"}
                          tabIndex={isActive ? 0 : -1}
                        >
                          Khám phá ngay <ArrowIcon />
                        </Link>
                      </div>
                      <div className="campaign-index">
                        <span>{String(index + 1).padStart(2, "0")}</span> / {meta.indexLabel}
                      </div>
                    </div>

                    <div className="campaign-note">
                      {meta.noteLines[0]}
                      <br />
                      {meta.noteLines[1]}
                      <i />
                    </div>
                  </div>
                );
              })}
            </div>

            {bannerCount > 1 && (
              <div className="nexa-hero-nav-arrows" aria-label="Điều khiển chuyển slide">
                <button
                  type="button"
                  className="nexa-hero-nav-btn prev"
                  onClick={() => setSlide((s) => (s - 1 + bannerCount) % bannerCount)}
                  aria-label="Slide trước"
                >
                  ‹
                </button>
                <button
                  type="button"
                  className="nexa-hero-nav-btn next"
                  onClick={() => setSlide((s) => (s + 1) % bannerCount)}
                  aria-label="Slide tiếp theo"
                >
                  ›
                </button>
              </div>
            )}

            <div className="slider-dock">
              <div className="slide-index slider-sr-only" aria-live="off" aria-atomic="true">
                <span id="slide-number">{String(slide + 1).padStart(2, "0")}</span> /{" "}
                {String(bannerCount).padStart(2, "0")}
              </div>
              <div className="slider-dots">
                {data.banners.map((banner, index) => (
                  <button
                    key={banner.id || index}
                    type="button"
                    className={slide === index ? "active" : ""}
                    onClick={() => setSlide(index)}
                    aria-label={banner.title}
                    aria-pressed={slide === index}
                  >
                    <span>
                      <i className={paused ? "is-paused" : ""} />
                    </span>
                  </button>
                ))}
              </div>
              <button
                type="button"
                className="slider-play"
                onClick={() => setPaused(!paused)}
                aria-label={paused ? "Chạy slider" : "Tạm dừng slider"}
                aria-pressed={paused}
              >
                <span aria-hidden="true">{paused ? "▷" : "Ⅱ"}</span>
              </button>
            </div>
          </>
        )}
      </section>

      <div className="container home-body">
        {error && (
          <div className="home-api-error">
            <ErrorBox error={error} onRetry={loadHome} variant="inline" />
          </div>
        )}

        {/* 4-Pillar Service Highlights Bar */}
        <section className="nexa-trust-strip" aria-label="Cam kết dịch vụ NEXA">
          {TRUST_PILLARS.map((pillar) => (
            <Tilt3DCard className="nexa-trust-card" key={pillar.title} intensity={7} scale={1.015}>
              <span className="nexa-trust-icon" aria-hidden="true">
                {pillar.icon}
              </span>
              <div>
                <strong>{pillar.title}</strong>
                <p>{pillar.desc}</p>
              </div>
            </Tilt3DCard>
          ))}
        </section>

        {/* Categories Grid */}
        <section className="home-section" id="categories">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">DANH MỤC SẢN PHẨM</span>
              <h2>Khám phá theo thiết bị</h2>
            </div>
            <Link to="/products">Xem toàn bộ danh mục ↗</Link>
          </div>
          {!data.categories && !error ? (
            <Loading label="Đang tải danh mục..." />
          ) : data.categories?.length ? (
            <div className="gear-categories">
              {data.categories.map((category, index) => {
                const image = categoryImage(category);
                return (
                  <Tilt3DCard
                    as={Link}
                    className="gear-category nexa-cat-3d"
                    to={`/products?category=${category.slug}`}
                    key={category.id}
                    intensity={12}
                    scale={1.03}
                  >
                    <span className="category-index">{String(index + 1).padStart(2, "0")}</span>
                    {image && !failedImages[`cat-${category.id}`] ? (
                      <img
                        className="nexa-3d-float-img"
                        src={image}
                        alt={category.name}
                        onError={() => markImageFailed(`cat-${category.id}`)}
                      />
                    ) : (
                      <span className="image-empty category-image-empty" role="img" aria-label={category.name}>
                        Chưa có ảnh
                      </span>
                    )}
                    <div>
                      <strong>{category.name}</strong>
                      <small>
                        Khám phá <span>↗</span>
                      </small>
                    </div>
                  </Tilt3DCard>
                );
              })}
            </div>
          ) : (
            <Empty title="Chưa có danh mục" text="Dữ liệu danh mục trong PostgreSQL đang trống." />
          )}
        </section>

        {/* Brands Section */}
        <section className="home-section gear-brand-section">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">THƯƠNG HIỆU CHÍNH HÃNG</span>
              <h2>Đối tác phân phối chính thức</h2>
            </div>
          </div>
          {!data.brands && !error ? (
            <Loading label="Đang tải thương hiệu..." />
          ) : data.brands?.length ? (
            <div className="gear-brand-grid">
              {data.brands.map((brand) => (
                <Tilt3DCard
                  as={Link}
                  className={`gear-brand-card brand-${brand.slug}`}
                  to={`/products?brand=${brand.slug}`}
                  key={brand.id}
                  intensity={10}
                  scale={1.04}
                >
                  <span>{brand.name}</span>
                </Tilt3DCard>
              ))}
            </div>
          ) : (
            <Empty title="Chưa có thương hiệu" text="Dữ liệu thương hiệu trong PostgreSQL đang trống." />
          )}
        </section>

        {/* Collections Section */}
        {data.collections?.length > 0 && (
          <section className="home-section">
            <div className="gear-section-head">
              <div>
                <span className="gear-kicker">BỘ SƯU TẬP</span>
                <h2>Gợi ý theo góc máy</h2>
              </div>
            </div>
            <div className="nexa-collection-pills">
              {data.collections.map((collection, idx) => (
                <Tilt3DCard
                  as={Link}
                  className="nexa-collection-card"
                  to={`/products?collection=${collection.slug}`}
                  key={collection.id}
                  intensity={8}
                  scale={1.02}
                >
                  <span className="nexa-col-num">0{idx + 1}</span>
                  <div>
                    <strong>{collection.name}</strong>
                    <small>Khám phá bộ sưu tập →</small>
                  </div>
                </Tilt3DCard>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products Grid (4 rows x 5 products = 20 products) */}
        <section className="home-section" id="featured">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">SẢN PHẨM NỔI BẬT</span>
              <h2>Thiết bị được ưa chuộng</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              {totalProductPages > 1 && (
                <div className="nexa-home-pager" role="group" aria-label="Chuyển trang sản phẩm nổi bật">
                  <button
                    type="button"
                    className="nexa-pager-btn"
                    disabled={productPage <= 1}
                    onClick={() => setProductPage((p) => Math.max(1, p - 1))}
                    aria-label="Trang trước"
                  >
                    ‹
                  </button>
                  <span className="nexa-pager-count">
                    {productPage} / {totalProductPages}
                  </span>
                  <button
                    type="button"
                    className="nexa-pager-btn"
                    disabled={productPage >= totalProductPages}
                    onClick={() => setProductPage((p) => Math.min(totalProductPages, p + 1))}
                    aria-label="Trang tiếp theo"
                  >
                    ›
                  </button>
                </div>
              )}
              <Link to="/products">Toàn bộ sản phẩm ↗</Link>
            </div>
          </div>

          {data.categories?.length > 0 && (
            <div className="gear-tabs">
              <button
                type="button"
                className={!activeCategory ? "active" : ""}
                onClick={() => {
                  setActiveCategory("");
                  setProductPage(1);
                }}
              >
                Tất cả{allProductsCount != null ? ` (${allProductsCount})` : ""}
              </button>
              {data.categories.slice(0, 6).map((category) => (
                <button
                  type="button"
                  className={activeCategory === category.slug ? "active" : ""}
                  onClick={() => {
                    setActiveCategory(category.slug);
                    setProductPage(1);
                  }}
                  key={category.id}
                >
                  {category.name}
                  {category.product_count != null ? ` (${category.product_count})` : ""}
                </button>
              ))}
            </div>
          )}

          {(productsLoading || !visibleProducts) && !error ? (
            <Loading label="Đang tải sản phẩm..." />
          ) : visibleProducts?.length ? (
            <div className="gear-product-grid home-grid-5 nexa-stagger-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={wishlistIds.has(product.id)}
                  onFav={handleWishlist}
                  onAdd={handleAddToCart}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          ) : (
            <Empty
              title="Chưa có sản phẩm trong danh mục này"
              text="Hãy chọn danh mục khác hoặc xem toàn bộ sản phẩm."
              actionText="Xem tất cả"
              onAction={() => {
                setActiveCategory("");
                setProductPage(1);
              }}
            />
          )}
        </section>

        {/* Editorial Spotlight Showcase */}
        {spotlightProduct && (
          <Tilt3DCard as="section" className="gear-editorial nexa-editorial-3d" intensity={6} scale={1.008}>
            <div className="editorial-copy">
              <span className="gear-kicker">TIÊU ĐIỂM TRONG TUẦN</span>
              <h2>Thiết kế tối ưu cho hiệu suất thực tế</h2>
              <p>
                {spotlightProduct.summary ||
                  "Hoàn thiện tỉ mỉ từ cảm giác bấm, độ ổn định kết nối không dây cho đến độ bền lâu dài cho nhu cầu làm việc và giải trí mỗi ngày."}
              </p>
              <div className="editorial-links">
                <Link to={`/products/${spotlightProduct.slug}`}>
                  Xem chi tiết {spotlightProduct.short_name || spotlightProduct.name} <span>↗</span>
                </Link>
                <Link to="/products">
                  Xem toàn bộ danh mục <span>↗</span>
                </Link>
              </div>
            </div>

            <Link className="editorial-product" to={`/products/${spotlightProduct.slug}`}>
              <span className="gear-kicker">
                {spotlightProduct.brand?.name || "NEXA"} / {spotlightProduct.category?.name || "GAMING GEAR"}
              </span>
              {productImage(spotlightProduct) && !failedImages[`spot-${spotlightProduct.id}`] ? (
                <img
                  className="nexa-3d-float-img"
                  src={productImage(spotlightProduct)}
                  alt={spotlightProduct.name}
                  onError={() => markImageFailed(`spot-${spotlightProduct.id}`)}
                />
              ) : (
                <span className="image-empty" role="img" aria-label={spotlightProduct.name}>
                  Chưa có ảnh
                </span>
              )}
              <span>
                <strong>{spotlightProduct.name}</strong>
                <b>{spotlightProduct.min_price != null ? money(spotlightProduct.min_price) : ""} ↗</b>
              </span>
            </Link>
          </Tilt3DCard>
        )}

        {/* Newest Arrivals 3-Column Strip */}
        {newestThree.length > 0 && (
          <section className="home-section" aria-label="Sản phẩm mới lên kệ">
            <div className="gear-section-head">
              <div>
                <span className="gear-kicker">SẢN PHẨM MỚI</span>
                <h2>Vừa lên kệ</h2>
              </div>
            </div>
            <div className="gear-new-list">
              {newestThree.map((item) => {
                const thumb = productImage(item);
                return (
                  <Link className="gear-new-item" to={`/products/${item.slug}`} key={item.id}>
                    {thumb && !failedImages[`new-${item.id}`] ? (
                      <img
                        src={thumb}
                        alt={item.name}
                        onError={() => markImageFailed(`new-${item.id}`)}
                      />
                    ) : (
                      <span className="image-empty" role="img" aria-label={item.name}>
                        Chưa có ảnh
                      </span>
                    )}
                    <div>
                      <small>
                        {item.brand?.name || "NEXA"} · {item.category?.name}
                      </small>
                      <h3>{item.short_name || item.name}</h3>
                      <strong>{item.min_price != null ? money(item.min_price) : "Liên hệ"}</strong>
                    </div>
                    <span aria-hidden="true">↗</span>
                  </Link>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
