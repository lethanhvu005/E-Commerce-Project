import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { catalogService, wishlistService } from "../api/client";
import { assetUrl, categoryImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Empty, ErrorBox, Loading } from "../components/Feedback";

function ArrowIcon() {
  return <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M5 12h14m-6-6 6 6-6 6" /></svg>;
}

function splitTitle(title = "") {
  const words = title.trim().split(/\s+/).filter(Boolean);
  const accentLength = words.length > 3 ? 2 : 1;
  const accent = words.slice(0, accentLength).join(" ");
  const rest = words.slice(accentLength);
  const midpoint = Math.ceil(rest.length / 2);
  return { accent, lines: [rest.slice(0, midpoint).join(" "), rest.slice(midpoint).join(" ")].filter(Boolean) };
}

export default function HomePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState({ banners: null, categories: null, brands: null, products: null, collections: null });
  const [slide, setSlide] = useState(0);
  const [paused, setPaused] = useState(false);
  const [activeCategory, setActiveCategory] = useState("");
  const [error, setError] = useState(null);

  const loadHome = useCallback(() => {
    setError(null);
    Promise.all([
      catalogService.getHomeBanners(),
      catalogService.getCategories(),
      catalogService.getBrands(),
      catalogService.getCollections(),
      catalogService.getProducts({ page_size: 8, ordering: "-created_at" }),
    ]).then(([banners, categories, brands, collections, products]) => setData({
      banners: banners.results || banners || [],
      categories: categories.results || categories || [],
      brands: brands.results || brands || [],
      collections: collections.results || collections || [],
      products: products.results || products || [],
    })).catch(setError);
  }, []);

  useEffect(() => loadHome(), [loadHome]);
  useEffect(() => {
    if (paused || !data.banners || data.banners.length < 2) return undefined;
    const timer = window.setInterval(() => setSlide((value) => (value + 1) % data.banners.length), 6500);
    return () => window.clearInterval(timer);
  }, [paused, data.banners]);

  const visibleProducts = useMemo(() => {
    if (!data.products) return null;
    return activeCategory ? data.products.filter((item) => item.category?.slug === activeCategory) : data.products;
  }, [activeCategory, data.products]);

  const addWish = async (product) => {
    if (!user) return navigate("/login", { state: { from: { pathname: "/" } } });
    try {
      await wishlistService.addWishlist(product.id);
    } catch (requestError) {
      setError(requestError);
    }
  };

  return <>
    <section className="gear-hero container" aria-roledescription="carousel" aria-label="Sản phẩm được giới thiệu">
      {!data.banners && !error && <div className="legacy-hero-state"><Loading label="Đang tải banner..." /></div>}
      {data.banners?.length === 0 && <div className="legacy-hero-state"><Empty title="Chưa có banner đang hoạt động" text="Banner sẽ hiển thị tại đây khi được thêm từ hệ thống quản trị." /></div>}
      {data.banners?.length > 0 && <>
        <div className="slider-viewport">{data.banners.map((banner, index) => {
          const title = splitTitle(banner.title);
          const desktopImage = assetUrl(banner.desktop_image_key);
          return <div className="gear-slide" key={banner.id} hidden={index !== slide}>
            <div className="gear-stage">
              {desktopImage ? <picture><source media="(max-width: 600px)" srcSet={assetUrl(banner.mobile_image_key) || desktopImage} /><img className="hero-product-image" src={desktopImage} alt={banner.title} /></picture> : <span className="image-empty hero-image-empty">Chưa có ảnh banner</span>}
              <span className="campaign-caption">NEXA / COLLECTION</span>
            </div>
            <div className="gear-slide-copy"><span className="gear-kicker">NEXA GEAR / DESIGNED FOR YOU</span><h1><em>{title.accent}</em>{title.lines.map((line) => <span key={line}>{line}</span>)}</h1><p className="hero-benefit">{banner.subtitle}</p><div className="hero-buy"><Link className="btn btn-primary" to={banner.link_path || "/products"}>Khám phá ngay <ArrowIcon /></Link></div><div className="campaign-index"><span>{String(index + 1).padStart(2, "0")}</span> / NEXA COLLECTION</div></div>
          </div>;
        })}</div>
        <div className="slider-dock"><div className="slider-dots">{data.banners.map((banner, index) => <button key={banner.id} className={slide === index ? "active" : ""} onClick={() => setSlide(index)} aria-label={banner.title}><span><i /></span></button>)}</div><button className="slider-play" onClick={() => setPaused(!paused)} aria-label={paused ? "Chạy slider" : "Tạm dừng slider"}><span>{paused ? "▷" : "Ⅱ"}</span></button></div>
      </>}
    </section>

    <div className="container home-body">
      {error && <div className="home-api-error"><ErrorBox message={error.message} /><button className="btn btn-primary" onClick={loadHome}>Thử lại</button></div>}

      <section className="home-section" id="categories"><div className="gear-section-head"><div><span className="gear-kicker">DANH MỤC THIẾT BỊ</span><h2>Chọn loại sản phẩm</h2></div></div>{!data.categories && !error ? <Loading label="Đang tải danh mục..." /> : data.categories?.length ? <div className="gear-categories">{data.categories.map((category, index) => { const image = categoryImage(category); return <Link className="gear-category" to={`/products?category=${category.slug}`} key={category.id}><span className="category-index">{String(index + 1).padStart(2, "0")}</span>{image ? <img src={image} alt={category.name} /> : <span className="image-empty category-image-empty">Chưa có ảnh</span>}<div><strong>{category.name}</strong><small>Xem sản phẩm <span>↗</span></small></div></Link>; })}</div> : <Empty title="Chưa có danh mục" text="Dữ liệu danh mục trong PostgreSQL đang trống." />}</section>

      <section className="home-section gear-brand-section"><div className="gear-section-head"><div><span className="gear-kicker">CHỌN THƯƠNG HIỆU</span><h2>Gaming Gear</h2></div></div>{!data.brands && !error ? <Loading label="Đang tải thương hiệu..." /> : data.brands?.length ? <div className="gear-brand-grid">{data.brands.map((brand) => <Link className={`gear-brand-card brand-${brand.slug}`} to={`/products?brand=${brand.slug}`} key={brand.id}><span>{brand.name}</span></Link>)}</div> : <Empty title="Chưa có thương hiệu" text="Dữ liệu thương hiệu trong PostgreSQL đang trống." />}</section>

      <section className="home-section"><div className="gear-section-head"><div><span className="gear-kicker">BỘ SƯU TẬP</span><h2>Chọn theo cảm hứng.</h2></div></div>{!data.collections && !error ? <Loading label="Đang tải bộ sưu tập..." /> : data.collections?.length ? <div className="gear-tabs collection-links">{data.collections.map((collection) => <Link to={`/products?collection=${collection.slug}`} key={collection.id}>{collection.name}</Link>)}</div> : <Empty title="Chưa có bộ sưu tập" text="Dữ liệu collection trong PostgreSQL đang trống." />}</section>

      <section className="home-section" id="featured"><div className="gear-section-head"><div><span className="gear-kicker">SẢN PHẨM NỔI BẬT</span><h2>Mỗi món, một lý do chọn.</h2></div><Link to="/products">Toàn bộ sản phẩm ↗</Link></div>{data.categories?.length > 0 && <div className="gear-tabs"><button className={!activeCategory ? "active" : ""} onClick={() => setActiveCategory("")}>Tất cả</button>{data.categories.slice(0, 6).map((category) => <button className={activeCategory === category.slug ? "active" : ""} onClick={() => setActiveCategory(category.slug)} key={category.id}>{category.name}</button>)}</div>}{!visibleProducts && !error ? <Loading label="Đang tải sản phẩm..." /> : visibleProducts?.length ? <div className="gear-product-grid">{visibleProducts.map((product) => <ProductCard key={product.id} product={product} onWish={addWish} />)}</div> : <Empty title="Chưa có sản phẩm active" text="Thêm sản phẩm và variant trong backend để hiển thị tại đây." />}</section>
    </div>
  </>;
}
