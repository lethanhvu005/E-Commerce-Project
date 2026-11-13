import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { cartService, catalogService, wishlistService } from "../api/client";
import { assetUrl, categoryImage, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Interactive3DStage, QuickViewModal, Tilt3DCard } from "../components/Motion3D";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

function splitTitle(title = "") {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const accentLength = words.length > 3 ? 2 : 1;
  const accent = words.slice(0, accentLength).join(" ");
  const rest = words.slice(accentLength);
  const midpoint = Math.ceil(rest.length / 2);
  return {
    accent,
    lines: [rest.slice(0, midpoint).join(" "), rest.slice(midpoint).join(" ")].filter(Boolean),
  };
}

const TRUST_PILLARS = [
  {
    icon: "⚡",
    title: "Giao hỏa tốc nội thành",
    desc: "Nhận gear siêu tốc trong 2–4h, đóng gói chống sốc 3 lớp.",
  },
  {
    icon: "🛡️",
    title: "Bảo hành chính hãng 24T",
    desc: "1 đổi 1 trong 30 ngày đầu nếu phát sinh lỗi nhà sản xuất.",
  },
  {
    icon: "🎛️",
    title: "Chuẩn eSports Pro-Grade",
    desc: "Tuyển chọn switch, sensor và âm thanh độ trễ bằng 0.",
  },
  {
    icon: "💎",
    title: "Ưu đãi & Voucher thực",
    desc: "Áp mã giảm giá trực tiếp từ hệ thống trên từng đơn hàng.",
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  const [data, setData] = useState({
    banners: null,
    categories: null,
    brands: null,
    products: null,
    collections: null,
  });
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const loadHome = useCallback(() => {
    setError(null);
    Promise.all([
      catalogService.getHomeBanners(),
      catalogService.getCategories(),
      catalogService.getBrands(),
      catalogService.getCollections(),
      catalogService.getProducts({ page_size: 12, ordering: "-created_at" }),
    ])
      .then(([banners, categories, brands, collections, products]) =>
        setData({
          banners: banners.results || banners || [],
          categories: categories.results || categories || [],
          brands: brands.results || brands || [],
          collections: collections.results || collections || [],
          products: products.results || products || [],
        })
      )
      .catch(setError);
  }, []);

  useEffect(() => loadHome(), [loadHome]);

  useEffect(() => {
    if (paused || !data.banners || data.banners.length < 2) return undefined;
    const timer = window.setInterval(
      () => setSlide((value) => (value + 1) % data.banners.length),
      6500
    );
    return () => window.clearInterval(timer);
  }, [paused, data.banners]);

  const visibleProducts = useMemo(() => {
    if (!data.products) return null;
    const filtered = activeCategory
      ? data.products.filter((item) => item.category?.slug === activeCategory)
      : data.products;
    return filtered.slice(0, 8);
  }, [activeCategory, data.products]);

  const spotlightProduct = useMemo(() => {
    if (!data.products || data.products.length === 0) return null;
    return data.products.find((p) => p.badge) || data.products[0];
  }, [data.products]);

  const newestThree = useMemo(() => {
    if (!data.products || data.products.length === 0) return [];
    return data.products.slice(0, 3);
  }, [data.products]);

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

      {/* 3D Interactive Hero Carousel */}
      <section
        className="gear-hero container nexa-hero-3d-wrap"
        aria-roledescription="carousel"
        aria-label="Sản phẩm được giới thiệu"
      >
        {!data.banners && !error && (
          <div className="legacy-hero-state">
            <Loading label="Đang tải không gian 3D..." />
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
            <Interactive3DStage className="slider-viewport" intensity={15}>
              {/* 3D Ambient Rings & Grid Floor */}
              <div className="nexa-hero-ambient" aria-hidden="true">
                <span className="nexa-orbit-ring ring-1" />
                <span className="nexa-orbit-ring ring-2" />
                <span className="nexa-hero-spotlight" />
              </div>

              {data.banners.map((banner, index) => {
                const title = splitTitle(banner.title);
                const desktopImage = assetUrl(banner.desktop_image_key);
                const isActive = index === slide;
                return (
                  <div
                    className={`gear-slide ${isActive ? "is-active-slide" : ""}`}
                    key={banner.id}
                    hidden={!isActive}
                  >
                    <div className="gear-stage nexa-3d-stage-object">
                      {desktopImage ? (
                        <picture>
                          <source
                            media="(max-width: 600px)"
                            srcSet={assetUrl(banner.mobile_image_key) || desktopImage}
                          />
                          <img
                            className="hero-product-image nexa-hero-3d-img"
                            src={desktopImage}
                            alt={banner.title}
                          />
                        </picture>
                      ) : (
                        <span className="image-empty hero-image-empty">Chưa có ảnh banner</span>
                      )}
                      <span className="campaign-caption">NEXA 3D / HARDWARE LAB</span>
                    </div>

                    <div className="gear-slide-copy nexa-3d-copy-layer">
                      <span className="gear-kicker">
                        <i className="nexa-pulse-dot" aria-hidden="true" /> NEXA GEAR / DESIGNED FOR YOU
                      </span>
                      <h1>
                        <em>{title.accent}</em>
                        {title.lines.map((line) => (
                          <span key={line}>{line}</span>
                        ))}
                      </h1>
                      <p className="hero-benefit">{banner.subtitle}</p>
                      <div className="hero-buy">
                        <Link
                          className="btn btn-primary nexa-btn-3d"
                          to={banner.link_path || "/products"}
                        >
                          Khám phá ngay <ArrowIcon />
                        </Link>
                        <Link className="hero-story" to="/products">
                          <span>3D</span>
                          <div>
                            <b>Trải nghiệm</b>
                            <br />
                            Bộ sưu tập
                          </div>
                        </Link>
                      </div>
                      <div className="campaign-index">
                        <span>{String(index + 1).padStart(2, "0")}</span> /{" "}
                        {String(bannerCount).padStart(2, "0")} · NEXA COLLECTION
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Quick Prev/Next Controls */}
              {bannerCount > 1 && (
                <div className="nexa-hero-arrows">
                  <button
                    type="button"
                    className="nexa-hero-arrow"
                    onClick={() => setSlide((s) => (s - 1 + bannerCount) % bannerCount)}
                    aria-label="Banner trước"
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="nexa-hero-arrow"
                    onClick={() => setSlide((s) => (s + 1) % bannerCount)}
                    aria-label="Banner tiếp theo"
                  >
                    ›
                  </button>
                </div>
              )}
            </Interactive3DStage>

            <div className="slider-dock">
              <div className="slider-dots">
                {data.banners.map((banner, index) => (
                  <button
                    key={banner.id}
                    className={slide === index ? "active" : ""}
                    onClick={() => setSlide(index)}
                    aria-label={banner.title}
                  >
                    <span>
                      <i />
                    </span>
                  </button>
                ))}
              </div>
              <button
                className="slider-play"
                onClick={() => setPaused(!paused)}
                aria-label={paused ? "Chạy slider" : "Tạm dừng slider"}
              >
                <span>{paused ? "▷" : "Ⅱ"}</span>
              </button>
            </div>
          </>
        )}
      </section>

      <div className="container home-body">
        {error && (
          <div className="home-api-error">
            <ErrorBox error={error} onRetry={loadHome} />
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

        {/* Categories 3D Grid */}
        <section className="home-section" id="categories">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">DANH MỤC THIẾT BỊ 3D</span>
              <h2>Chọn loại sản phẩm</h2>
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
                    {image ? (
                      <img className="nexa-3d-float-img" src={image} alt={category.name} />
                    ) : (
                      <span className="image-empty category-image-empty">Chưa có ảnh</span>
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
              <span className="gear-kicker">ĐỐI TÁC CHÍNH HÃNG</span>
              <h2>Thương hiệu Gaming Gear</h2>
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
                <span className="gear-kicker">BỘ SƯU TẬP CHỌN LỌC</span>
                <h2>Chọn theo cảm hứng setup.</h2>
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

        {/* Featured Products Grid */}
        <section className="home-section" id="featured">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">SẢN PHẨM NỔI BẬT</span>
              <h2>Mỗi món, một lý do chọn.</h2>
            </div>
            <Link to="/products">Toàn bộ sản phẩm ↗</Link>
          </div>

          {data.categories?.length > 0 && (
            <div className="gear-tabs">
              <button
                type="button"
                className={!activeCategory ? "active" : ""}
                onClick={() => setActiveCategory("")}
              >
                Tất cả ({data.products?.length || 0})
              </button>
              {data.categories.slice(0, 6).map((category) => (
                <button
                  type="button"
                  className={activeCategory === category.slug ? "active" : ""}
                  onClick={() => setActiveCategory(category.slug)}
                  key={category.id}
                >
                  {category.name}
                </button>
              ))}
            </div>
          )}

          {!visibleProducts && !error ? (
            <Loading label="Đang tải sản phẩm..." />
          ) : visibleProducts?.length ? (
            <div className="gear-product-grid nexa-stagger-grid">
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
              onAction={() => setActiveCategory("")}
            />
          )}
        </section>

        {/* 3D Editorial Spotlight Showcase */}
        {spotlightProduct && (
          <Tilt3DCard as="section" className="gear-editorial nexa-editorial-3d" intensity={6} scale={1.008}>
            <div className="editorial-copy">
              <span className="gear-kicker">NEXA SIGNATURE / EDITOR’S PICK</span>
              <h2>Hiệu năng định hình lại chuẩn mực bàn máy.</h2>
              <p>
                {spotlightProduct.summary ||
                  "Thiết kế tối ưu công thái học kết hợp công nghệ phản hồi tức thì, mang lại cảm giác gõ và điều khiển hoàn hảo trong từng khoảnh khắc."}
              </p>
              <div className="editorial-links">
                <Link to={`/products/${spotlightProduct.slug}`}>
                  Khám phá {spotlightProduct.short_name || spotlightProduct.name} <span>↗</span>
                </Link>
                <Link to="/products">
                  Xem toàn bộ bảng cấu hình <span>↗</span>
                </Link>
              </div>
            </div>

            <Link className="editorial-product" to={`/products/${spotlightProduct.slug}`}>
              <span className="gear-kicker">
                {spotlightProduct.brand?.name || "NEXA"} / {spotlightProduct.category?.name || "FLAGSHIP"}
              </span>
              <img
                className="nexa-3d-float-img"
                src={productImage(spotlightProduct)}
                alt={spotlightProduct.name}
              />
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
                <span className="gear-kicker">VỪA CẬP BẾN</span>
                <h2>Mới lên kệ tuần này</h2>
              </div>
            </div>
            <div className="gear-new-list">
              {newestThree.map((item) => (
                <Link className="gear-new-item" to={`/products/${item.slug}`} key={item.id}>
                  <img src={productImage(item)} alt={item.name} />
                  <div>
                    <small>
                      {item.brand?.name || "NEXA"} · {item.category?.name}
                    </small>
                    <h3>{item.short_name || item.name}</h3>
                    <strong>{item.min_price != null ? money(item.min_price) : "Liên hệ"}</strong>
                  </div>
                  <span aria-hidden="true">↗</span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}
