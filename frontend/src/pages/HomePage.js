import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { categoryImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { ErrorBox } from "../components/Feedback";

const slides = [
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
    note: <>Chạm vào âm nhạc.<br/>Chạm đến cảm xúc.</>,
    category: "tai-nghe",
  },
  {
    className: "campaign-keys",
    dark: "/assets/images/campaign/cobalt-keys-lettered.png",
    light: "/assets/images/campaign/cobalt-keys-day.png",
    kicker: "DÀNH CHO NHỮNG ĐIỀU BẠN TẠO NÊN",
    accent: "Cảm Hứng",
    lines: ["Trên Từng", "Phím Chạm."],
    text: "Một góc làm việc có gu. Một nhịp sáng tạo rất riêng – bắt đầu từ bàn phím bạn chọn.",
    index: "02",
    collection: "BỘ SƯU TẬP BÀN PHÍM",
    note: <>Thiết kế tinh gọn.<br/>Cảm hứng bất tận.</>,
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
    note: <>Chuyển động tự nhiên.<br/>Trải nghiệm liền mạch.</>,
    category: "chuot",
  },
];

const fallbackCategories = [
  { id: -1, name: "Bàn phím", slug: "ban-phim", code: "keyboard", image_key: "assets/images/categories/keyboards.png" },
  { id: -2, name: "Chuột", slug: "chuot", code: "mouse", image_key: "assets/images/categories/mouse.png" },
  { id: -3, name: "Tai nghe", slug: "tai-nghe", code: "headset", image_key: "assets/images/categories/headset.png" },
  { id: -4, name: "Màn hình", slug: "man-hinh", code: "monitor", image_key: "assets/images/categories/monitor.png" },
  { id: -5, name: "Lót bàn & phụ kiện", slug: "phu-kien", code: "accessory", image_key: "assets/images/categories/pad.png" },
  { id: -6, name: "Ghế gaming", slug: "ghe-gaming", image_key: "assets/images/categories/desk.png" },
];

const fallbackBrands = ["SONY", "logitech", "msi", "Microsoft", "ASUS", "RAPOO", "JBL", "nuio.", "ZADEZ"];

const fallbackProducts = [
  { id: -1, slug: "", name: "NEXA X75 Mechanical Keyboard", summary: "Layout 75% tiện dụng", min_price: "2490000", brand: { name: "NEXA" }, category: { name: "Bàn phím", slug: "ban-phim" }, cover_image: { object_key: "assets/images/categories/keyboards.png" }, badge: "Bán chạy" },
  { id: -2, slug: "", name: "Logitech G Pro X Superlight 2", summary: "Trọng lượng siêu nhẹ", min_price: "2890000", brand: { name: "Logitech" }, category: { name: "Chuột", slug: "chuot" }, cover_image: { object_key: "assets/images/categories/mouse.png" }, badge: "-20%" },
  { id: -3, slug: "", name: "Razer BlackShark V2 Pro", summary: "Micro thoại rõ ràng", min_price: "4990000", brand: { name: "Razer" }, category: { name: "Tai nghe", slug: "tai-nghe" }, cover_image: { object_key: "assets/images/categories/headset.png" }, badge: "Mới" },
  { id: -4, slug: "", name: "ASUS TUF Gaming VG27AQ", summary: "27 inch QHD", min_price: "6990000", brand: { name: "ASUS" }, category: { name: "Màn hình", slug: "man-hinh" }, cover_image: { object_key: "assets/images/categories/monitor.png" } },
];

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M5 12h14m-6-6 6 6-6 6"/>
    </svg>
  );
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [categories, setCategories] = useState(fallbackCategories);
  const [brands, setBrands] = useState([]);
  const [products, setProducts] = useState(fallbackProducts);
  const [activeCategory, setActiveCategory] = useState("");
  const [error, setError] = useState(null);

  // Auto-advance slider
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => setSlide((s) => (s + 1) % slides.length), 5000);
    return () => clearInterval(id);
  }, [paused]);

  // Fetch data
  useEffect(() => {
    api.get("/categories/").then((data) => { if (data.results?.length) setCategories(data.results); }).catch(() => {});
    api.get("/brands/").then((data) => { if (data.results?.length) setBrands(data.results); }).catch(() => {});
    api.get("/products/?page_size=12&ordering=-created_at").then((data) => {
      if (data.results?.length) setProducts(data.results);
    }).catch(setError);
  }, []);

  const visibleProducts = activeCategory ? products.filter((p) => p.category?.slug === activeCategory) : products;

  const addWish = async (product) => {
    if (product.id < 0) return navigate("/products");
    if (!user) return navigate("/login");
    try { await api.post("/wishlist/", { product_id: product.id }); } catch (e) { setError(e); }
  };

  return (
    <>
      {/* Hero Slider */}
      <section className="gear-hero container" aria-roledescription="carousel" aria-label="Sản phẩm được giới thiệu">
        <div className="slider-viewport">
          {slides.map((item, index) => (
            <div
              className={`gear-slide ${item.className}`}
              key={item.index}
              hidden={index !== slide}
              aria-hidden={index !== slide}
            >
              <div className="gear-stage">
                <img className="hero-product-image hero-image-dark" src={item.dark} alt={item.accent}/>
                <img className="hero-product-image hero-image-light" src={item.light} alt="" aria-hidden="true"/>
                <span className="campaign-caption">NEXA / ẢNH Ý TƯỞNG</span>
              </div>
              <div className="gear-slide-copy">
                <span className="gear-kicker">{item.kicker}</span>
                <h1>
                  <em>{item.accent}</em>
                  {item.lines.map((line) => <span key={line}>{line}</span>)}
                </h1>
                <p className="hero-benefit">{item.text}</p>
                <div className="hero-buy">
                  <Link className="btn btn-primary" to={`/products?category=${item.category}`}>
                    Khám phá ngay <ArrowIcon/>
                  </Link>
                </div>
                <div className="campaign-index">
                  <span>{item.index}</span> / {item.collection}
                </div>
              </div>
              <div className="campaign-note">{item.note}<i /></div>
            </div>
          ))}
        </div>

        {/* Slider controls */}
        <div className="slider-dock">
          <div className="slider-dots">
            {slides.map((item, index) => (
              <button
                key={item.index}
                className={slide === index ? "active" : ""}
                onClick={() => setSlide(index)}
                aria-label={item.accent}
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

      {/* Body */}
      <div className="container home-body">
        {/* Categories */}
        <section className="home-section" id="categories">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">DANH MỤC THIẾT BỊ</span>
              <h2>Chọn loại sản phẩm</h2>
            </div>
          </div>
          <div className="gear-categories">
            {categories.map((category, index) => (
              <Link className="gear-category" to={`/products?category=${category.slug}`} key={category.id}>
                <span className="category-index">0{index + 1}</span>
                <img src={categoryImage(category)} alt={category.name}/>
                <div>
                  <strong>{category.name}</strong>
                  <small>Xem sản phẩm <span>↗</span></small>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* Brands */}
        <section className="home-section gear-brand-section">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">CHỌN THƯƠNG HIỆU</span>
              <h2>Gaming Gear</h2>
            </div>
          </div>
          <div className="gear-brand-grid">
            {(brands.length ? brands.map((b) => b.name) : fallbackBrands).map((name, index) => (
              <Link
                className={`gear-brand-card brand-${name.replace(/\W/g, "").toLowerCase()}`}
                to={`/products?brand=${encodeURIComponent(name.toLowerCase())}`}
                key={`${name}-${index}`}
              >
                <span>{name}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* Featured Products */}
        <section className="home-section" id="featured">
          <div className="gear-section-head">
            <div>
              <span className="gear-kicker">SẢN PHẨM NỔI BẬT</span>
              <h2>Mỗi món, một lý do chọn.</h2>
            </div>
            <Link to="/products">Toàn bộ sản phẩm ↗</Link>
          </div>

          {/* Category tabs */}
          <div className="gear-tabs">
            <button className={!activeCategory ? "active" : ""} onClick={() => setActiveCategory("")}>Tất cả</button>
            {categories.slice(0, 6).map((category) => (
              <button
                key={category.id}
                className={activeCategory === category.slug ? "active" : ""}
                onClick={() => setActiveCategory(category.slug)}
              >
                {category.name}
              </button>
            ))}
          </div>

          {error && <ErrorBox error={error}/>}

          <div className="gear-product-grid">
            {visibleProducts.slice(0, 8).map((product) => (
              <ProductCard key={product.id} product={product} onWish={addWish}/>
            ))}
          </div>
        </section>

        {/* Editorial */}
        <section className="gear-editorial home-section">
          <div className="editorial-copy">
            <span className="gear-kicker">GÓC CHỌN GEAR / BÀN PHÍM</span>
            <h2>Gọn 75%.<br/>Hay đủ phím?</h2>
            <p>Ưu tiên khoảng trống cho chuột hay hàng phím số? Bắt đầu từ layout bạn dùng mỗi ngày.</p>
            <div className="editorial-links">
              <Link to="/products?category=ban-phim">Layout 75% <span>↗</span></Link>
              <Link to="/products?category=ban-phim">Full-size <span>↗</span></Link>
            </div>
          </div>
          <Link className="editorial-product" to="/products?category=ban-phim">
            <span className="gear-kicker">NEXA / KEYBOARD</span>
            <img src="/assets/images/categories/keyboards.png" alt="Bàn phím NEXA"/>
            <span>Bàn phím cơ nhỏ gọn với trải nghiệm gõ tinh tế. <b>Xem chi tiết ↗</b></span>
          </Link>
        </section>
      </div>
    </>
  );
}
