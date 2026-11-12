import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { cartService, catalogService, wishlistService } from "../api/client";
import { categoryImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Empty, ErrorBox, ProductSkeleton, Toast } from "../components/Feedback";

const DEFAULT_SLIDES = [
  {
    className: "campaign-sound",
    dark: "/assets/images/campaign/cobalt-sound-wide.png",
    light: "/assets/images/campaign/cobalt-sound-wide-day.png",
    kicker: "ÂM THANH ĐỒNG HÀNH CÙNG BẠN",
    accent: "Cảm Nhận",
    lines: ["Từng", "Khoảnh Khắc."],
    text: "Âm thanh cho những khoảnh khắc riêng. Thiết kế cho nhịp sống của bạn.",
    index: "01",
    collection: "BỘ SƯU TẬP TAI NGHE",
    note: <>Chạm vào âm nhạc.<br />Chạm đến cảm xúc.</>,
    category: "tai-nghe",
  },
  {
    className: "campaign-keys",
    dark: "/assets/images/campaign/cobalt-keys-lettered.png",
    light: "/assets/images/campaign/cobalt-keys-day.png",
    kicker: "DÀNH CHO NHỮNG ĐIỀU BẠN TẠO NÊN",
    accent: "Cảm Hứng",
    lines: ["Trên Từng", "Phím Chạm."],
    text: "Một góc làm việc có gu. Một nhịp sáng tạo rất riêng — bắt đầu từ bàn phím bạn chọn.",
    index: "02",
    collection: "BỘ SƯU TẬP BÀN PHÍM",
    note: <>Thiết kế tinh gọn.<br />Cảm hứng bất tận.</>,
    category: "ban-phim",
  },
  {
    className: "campaign-motion",
    dark: "/assets/images/campaign/cobalt-motion.png",
    light: "/assets/images/campaign/cobalt-motion-day.png",
    kicker: "CÔNG NGHỆ HÒA VÀO NHỊP SỐNG",
    accent: "Tự Do",
    lines: ["Trong Từng", "Chuyển Động."],
    text: "Khám phá thiết bị phù hợp với cách bạn làm việc, chơi và tận hưởng mỗi ngày.",
    index: "03",
    collection: "BỘ SƯU TẬP CHUỘT",
    note: <>Chuyển động tự nhiên.<br />Trải nghiệm liền mạch.</>,
    category: "chuot",
  },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);

  // Live Database States
  const [banners, setBanners] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState(null);
  const [activeCategory, setActiveCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Auto advance hero slider
  useEffect(() => {
    if (paused) return;
    const interval = setInterval(() => {
      setSlide((prev) => (prev + 1) % DEFAULT_SLIDES.length);
    }, 5500);
    return () => clearInterval(interval);
  }, [paused]);

  // Fetch all storefront data from Backend API
  const loadStoreData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [bannersRes, categoriesRes, brandsRes, productsRes] = await Promise.allSettled([
        catalogService.getHomeBanners(),
        catalogService.getCategories(),
        catalogService.getBrands(),
        catalogService.getProducts({ page_size: 12, ordering: "-created_at" }),
      ]);

      if (bannersRes.status === "fulfilled" && bannersRes.value) {
        setBanners(bannersRes.value.results || bannersRes.value || []);
      }
      if (categoriesRes.status === "fulfilled" && categoriesRes.value) {
        setCategories(categoriesRes.value.results || categoriesRes.value || []);
      }
      if (brandsRes.status === "fulfilled" && brandsRes.value) {
        setBrands(brandsRes.value.results || brandsRes.value || []);
      }
      if (productsRes.status === "fulfilled" && productsRes.value) {
        setProducts(productsRes.value.results || productsRes.value || []);
      } else if (productsRes.status === "rejected") {
        setError(productsRes.reason);
        setProducts([]);
      }
    } catch (err) {
      setError(err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStoreData();
  }, []);

  // Filter products by selected category
  const filteredProducts = (products || []).filter((p) => {
    if (!activeCategory) return true;
    return p.category?.slug === activeCategory || p.category?.name === activeCategory;
  });

  // Add/Remove Wishlist
  const handleWishlist = async (product) => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }
    const isFav = wishlistIds.has(product.id);
    try {
      if (isFav) {
        await wishlistService.removeWishlist(product.id);
        setToastMsg(`Đã xóa ${product.name} khỏi yêu thích.`);
      } else {
        await wishlistService.addWishlist(product.id);
        setToastMsg(`Đã lưu ${product.name} vào yêu thích.`);
      }
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      setToastMsg(err.message || "Không thể cập nhật danh sách yêu thích.");
    }
  };

  // Quick add to cart
  const handleAddToCart = async (product) => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/" } } });
      return;
    }
    // Need variant id
    try {
      const detail = await catalogService.getProductDetail(product.slug);
      const variant = (detail.variants || []).find((v) => v.available > 0) || detail.variants?.[0];
      if (!variant) {
        setToastMsg("Sản phẩm tạm thời hết hàng.");
        return;
      }
      await cartService.addItem(variant.id, 1);
      setToastMsg(`Đã thêm ${product.name} vào giỏ hàng.`);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm vào giỏ hàng.");
    }
  };

  // Slides data: priority to backend banners if available, else standard campaign slides
  const activeSlides = banners.length > 0
    ? banners.map((b, idx) => ({
        className: idx === 1 ? "campaign-keys" : idx === 2 ? "campaign-motion" : "campaign-sound",
        dark: b.desktop_image_key ? `/${b.desktop_image_key}` : DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].dark,
        light: b.mobile_image_key ? `/${b.mobile_image_key}` : DEFAULT_SLIDES[idx % DEFAULT_SLIDES.length].light,
        kicker: b.subtitle || "KHÁM PHÁ THIẾT BỊ NEXA",
        accent: b.title?.split(" ")[0] || "Trải Nghiệm",
        lines: [b.title?.split(" ").slice(1).join(" ") || "Đỉnh Cao"],
        text: b.subtitle || "Thiết bị gaming chuẩn eSports.",
        index: `0${idx + 1}`,
        collection: "BỘ SƯU TẬP NEXA",
        note: <>Thiết kế cao cấp.<br />Chuẩn thi đấu.</>,
        category: b.link_path || "ban-phim",
      }))
    : DEFAULT_SLIDES;

  return (
    <>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Hero Carousel */}
      <section className="gear-hero container" aria-roledescription="carousel" aria-label="Sản phẩm được giới thiệu">
        <div className="slider-viewport">
          {activeSlides.map((item, index) => (
            <div
              className={`gear-slide ${item.className}`}
              key={item.index || index}
              hidden={index !== slide}
              aria-hidden={index !== slide}
            >
              <div className="gear-stage">
                <img className="hero-product-image hero-image-dark" src={item.dark} alt={item.accent} />
                <img className="hero-product-image hero-image-light" src={item.light} alt="" aria-hidden="true" />
                <span className="campaign-caption">NEXA / ẢNH Ý TƯỞNG</span>
              </div>

              <div className="gear-slide-copy">
                <span className="gear-kicker">{item.kicker}</span>
                <h1>
                  <em>{item.accent}</em>
                  {item.lines.map((line) => (
                    <span key={line}>{line}</span>
                  ))}
                </h1>
                <p className="hero-benefit">{item.text}</p>
                <div className="hero-buy">
                  <Link className="btn btn-primary" to={`/products?category=${item.category}`}>
                    Khám phá ngay <ArrowIcon />
                  </Link>
                </div>
                <div className="campaign-index">
                  <span>{item.index}</span> / {item.collection}
                </div>
              </div>

              <div className="campaign-note">
                {item.note}
                <i />
              </div>
            </div>
          ))}
        </div>

        {/* Carousel dock controls */}
        <div className="slider-dock">
          <div className="slider-dots">
            {activeSlides.map((item, index) => (
              <button
                key={item.index || index}
                className={slide === index ? "active" : ""}
                onClick={() => setSlide(index)}
                aria-label={`Slide ${index + 1}`}
              >
                <span><i /></span>
              </button>
            ))}
          </div>
          <button
            className="slider-play"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Chạy slider" : "Tạm dừng slider"}
          >
            <span>{paused ? "▷" : "⏡"}</span>
          </button>
        </div>
      </section>

      {/* Main Home Sections */}
      <div className="container home-body">
        {/* Category Section */}
        <section className="home-section" id="categories">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">DANH MỤC THIẾT BỊ</span>
              <h2>Chọn loại sản phẩm</h2>
            </div>
          </div>

          {categories.length === 0 && !loading && (
            <Empty title="Chưa có danh mục" text="Hệ thống đang cập nhật danh mục sản phẩm." />
          )}

          <div className="gear-categories">
            {categories.map((cat, idx) => (
              <Link className="gear-category" to={`/products?category=${cat.slug}`} key={cat.id || cat.slug}>
                <span className="category-index">0{idx + 1}</span>
                <img src={categoryImage(cat)} alt={cat.name} loading="lazy" />
                <div>
                  <strong>{cat.name}</strong>
                  <small>Xem sản phẩm <span aria-hidden="true">↗</span></small>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Brand Section */}
        {brands.length > 0 && (
          <section className="home-section gear-brand-section">
            <div className="gear-section-head">
              <div>
                <span className="gear-kicker">CHỌN THƯƠNG HIỆU</span>
                <h2>Gaming Gear</h2>
              </div>
            </div>
            <div className="gear-brand-grid">
              {brands.map((b) => (
                <Link
                  className={`gear-brand-card brand-${(b.slug || b.name).replace(/\W/g, "").toLowerCase()}`}
                  to={`/products?brand=${encodeURIComponent(b.slug || b.name)}`}
                  key={b.id || b.slug}
                >
                  <span>{b.name}</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Featured Products Section */}
        <section className="home-section" id="featured">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">SẢN PHẨM NỔI BẬT</span>
              <h2>Mỗi món, một lý do chọn.</h2>
            </div>
            <Link to="/products">Toàn bộ sản phẩm <span aria-hidden="true">↗</span></Link>
          </div>

          {/* Category Tabs */}
          {categories.length > 0 && (
            <div className="gear-tabs">
              <button
                className={!activeCategory ? "active" : ""}
                onClick={() => setActiveCategory("")}
              >
                Tất cả
              </button>
              {categories.slice(0, 6).map((c) => (
                <button
                  key={c.id || c.slug}
                  className={activeCategory === c.slug ? "active" : ""}
                  onClick={() => setActiveCategory(c.slug)}
                >
                  {c.name}
                </button>
              ))}
            </div>
          )}

          {error && <ErrorBox error={error} onRetry={loadStoreData} />}

          {loading && !products && (
            <div className="gear-product-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          )}

          {products && filteredProducts.length === 0 && !loading && (
            <Empty
              title="Không có sản phẩm nào"
              text={activeCategory ? "Không tìm thấy sản phẩm trong danh mục này." : "Chưa có sản phẩm nào trong database."}
              actionText={activeCategory ? "Xem tất cả sản phẩm" : undefined}
              onAction={activeCategory ? () => setActiveCategory("") : undefined}
            />
          )}

          {products && filteredProducts.length > 0 && (
            <div className="gear-product-grid">
              {filteredProducts.slice(0, 8).map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={wishlistIds.has(product.id)}
                  onFav={handleWishlist}
                  onAdd={handleAddToCart}
                />
              ))}
            </div>
          )}
        </section>

        {/* Editorial Section matching frontend_html */}
        <section className="gear-editorial home-section">
          <div className="editorial-copy">
            <span className="gear-kicker">GÓC CHỌN GEAR / BÀN PHÍM</span>
            <h2>Gọn 75%.<br />Hay đủ phím?</h2>
            <p>Ưu tiên khoảng trống cho chuột hay hàng phím số? Bắt đầu từ layout bạn dùng mỗi ngày.</p>
            <div className="editorial-links">
              <Link to="/products?category=ban-phim">Layout 75% <span aria-hidden="true">↗</span></Link>
              <Link to="/products?category=ban-phim">Full-size <span aria-hidden="true">↗</span></Link>
            </div>
          </div>
          <Link className="editorial-product" to="/products?category=ban-phim">
            <span className="gear-kicker">NEXA / KEYBOARD</span>
            <img src="/assets/images/categories/keyboards.png" alt="Bàn phím cơ NEXA" />
            <span>Bàn phím cơ nhỏ gọn với trải nghiệm gõ tinh tế. <b>Xem chi tiết ↗</b></span>
          </Link>
        </section>
      </div>
    </>
  );
}
