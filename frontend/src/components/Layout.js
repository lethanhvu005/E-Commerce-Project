import { useEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api } from "../api/client";

function Icon({ name, className }) {
  const paths = {
    home: <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z" />,
    grid: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></>,
    keyboard: <><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M6 9h.01M10 9h.01M14 9h.01M18 9h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></>,
    mouse: <><rect x="5" y="2" width="14" height="20" rx="7"/><path d="M12 2v8M5 10h14"/></>,
    headset: <><path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v2a2 2 0 0 1-2 2h-4"/><rect x="2" y="11" width="5" height="7" rx="2"/><rect x="17" y="11" width="5" height="7" rx="2"/></>,
    monitor: <><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></>,
    pad: <><rect x="2" y="6" width="20" height="12" rx="2"/></>,
    layers: <><path d="m2 8 10-6 10 6-10 6z"/><path d="m2 12 10 6 10-6M2 16l10 6 10-6"/></>,
    info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></>,
    support: <><path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v2a2 2 0 0 1-2 2h-4"/><rect x="2" y="11" width="5" height="7" rx="2"/><rect x="17" y="11" width="5" height="7" rx="2"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    moon: <path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z"/>,
    sun: <><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/></>,
    user: <><circle cx="12" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2z"/></>,
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z"/>,
    bag: <><path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></>,
    menu: <path d="M4 6h16M4 12h16M4 18h10"/>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    close: <path d="M18 6 6 18M6 6l12 12"/>,
    shipping: <><rect x="1" y="3" width="15" height="13"/><path d="M16 8h4l3 5v3h-7V8zM5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      {paths[name]}
    </svg>
  );
}

export { Icon };

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(() => localStorage.getItem("nexa_theme") || "dark");
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [topbarHidden, setTopbarHidden] = useState(false);
  const megaRef = useRef(null);

  // Apply theme to <html> element (matching HTML frontend)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nexa_theme", theme);
  }, [theme]);

  // Load cart count
  useEffect(() => {
    if (!user) return setCartCount(0);
    api.get("/cart/").then((cart) => setCartCount(cart.items?.reduce((s, i) => s + i.quantity, 0) || 0)).catch(() => setCartCount(0));
  }, [user]);

  // Lock scroll when menu is open
  useEffect(() => {
    document.body.classList.toggle("menu-is-open", menuOpen);
    return () => document.body.classList.remove("menu-is-open");
  }, [menuOpen]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (q) navigate(`/products?search=${encodeURIComponent(q)}`);
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  // Current route for mobile tabs
  const path = window.location.pathname;
  const mobileTab = path === "/" ? "home" : path.startsWith("/products") ? "shop" : path.startsWith("/cart") ? "cart" : "";

  return (
    <>
      <a className="skip-link" href="#main">Đến nội dung chính</a>

      {/* Top notification bar */}
      {!topbarHidden && (
        <div className="topbar">
          <span>MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN TỪ <b>1.000.000 ₫</b> · HỖ TRỢ KHÁCH HÀNG 24/7</span>
          <button className="topbar-dismiss" aria-label="Ẩn thông báo" onClick={() => setTopbarHidden(true)}>×</button>
        </div>
      )}

      {/* Header */}
      <header className="gear-header">
        <div className="container masthead">
          <button className="gear-menu-button" onClick={() => setMenuOpen(true)} aria-label="Mở danh mục" aria-expanded={menuOpen} aria-controls="ux-mobile-menu">
            <Icon name="menu" />
          </button>

          <Link className="gear-brand" to="/" aria-label="NEXA GEAR – Trang chủ">
            <span className="gear-mark" aria-hidden="true">N</span>
            <span>NEXA<small>ELEVATE YOUR PLAY</small></span>
          </Link>

          <nav className="desktop-links" aria-label="Điều hướng chính">
            <NavLink className={({isActive}) => `nav-home${isActive ? "" : ""}`} to="/" end aria-current={path === "/" ? "page" : undefined}>
              <Icon name="home"/><span>Trang chủ</span>
            </NavLink>

            <details className="gear-mega" ref={megaRef}>
              <summary>
                <Icon name="grid"/>
                <span className="gear-nav-label">Sản phẩm</span>
                <span className="gear-nav-caret" aria-hidden="true">⌄</span>
              </summary>
              <div className="mega-panel">
                <div className="mega-panel-inner">
                  <div className="mega-catalog">
                    <div className="mega-heading">
                      <div>
                        <span className="gear-kicker">KHÁM PHÁ NEXA</span>
                        <strong>Chọn thiết bị theo cách của bạn.</strong>
                      </div>
                      <Link to="/products">Tất cả sản phẩm <span aria-hidden="true">↗</span></Link>
                    </div>
                    <div className="mega-category-groups mega-category-grid">
                      <section className="mega-category-group">
                        <h3>Điều khiển</h3>
                        <Link className="mega-category-link" to="/products?category=ban-phim" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                          <Icon name="keyboard"/><span>Bàn phím</span><small>Xem sản phẩm</small>
                        </Link>
                        <Link className="mega-category-link" to="/products?category=chuot" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                          <Icon name="mouse"/><span>Chuột</span><small>Xem sản phẩm</small>
                        </Link>
                      </section>
                      <section className="mega-category-group">
                        <h3>Âm thanh & hiển thị</h3>
                        <Link className="mega-category-link" to="/products?category=tai-nghe" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                          <Icon name="headset"/><span>Tai nghe</span><small>Xem sản phẩm</small>
                        </Link>
                        <Link className="mega-category-link" to="/products?category=man-hinh" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                          <Icon name="monitor"/><span>Màn hình</span><small>Xem sản phẩm</small>
                        </Link>
                      </section>
                      <section className="mega-category-group">
                        <h3>Hoàn thiện setup</h3>
                        <Link className="mega-category-link" to="/products?category=phu-kien" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                          <Icon name="pad"/><span>Phụ kiện</span><small>Xem sản phẩm</small>
                        </Link>
                      </section>
                    </div>
                  </div>
                  <div className="mega-feature-grid">
                    <Link className="mega-feature" to="/products?category=ban-phim" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                      <span className="mega-feature-image">
                        <img src="/assets/images/categories/keyboards.png" alt="Bàn phím NEXA"/>
                        <b>01</b>
                      </span>
                      <span className="mega-feature-copy">
                        <small>Bàn phím / NEXA SELECT</small>
                        <strong>NEXA KEYBOARD</strong>
                        <span>Khám phá <b>↗</b></span>
                      </span>
                    </Link>
                    <Link className="mega-feature" to="/products?category=chuot" onClick={() => { if(megaRef.current) megaRef.current.removeAttribute("open"); }}>
                      <span className="mega-feature-image">
                        <img src="/assets/images/categories/mouse.png" alt="Chuột gaming"/>
                        <b>02</b>
                      </span>
                      <span className="mega-feature-copy">
                        <small>Chuột / NEXA SELECT</small>
                        <strong>GAMING MOUSE</strong>
                        <span>Khám phá <b>↗</b></span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </details>

            <Link to="/products"><Icon name="layers"/>Công Nghệ</Link>
            <Link to="/products"><Icon name="info"/>Cộng Đồng</Link>
            <Link to="/account"><Icon name="support"/>Hỗ trợ</Link>
          </nav>

          {/* Search */}
          <form className="gear-search" onSubmit={submitSearch}>
            <button type="submit" aria-label="Tìm kiếm"><Icon name="search"/></button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bàn phím, chuột, tai nghe..."
            />
          </form>

          {/* Actions */}
          <div className="gear-actions">
            <button className="gear-theme" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label="Chuyển sáng tối">
              <span className="theme-moon"><Icon name="moon"/></span>
              <span className="theme-sun"><Icon name="sun"/></span>
            </button>

            <div className="desktop-account">
              <Icon name="user"/>
              {user ? (
                <>
                  <Link to="/account">{user.first_name || user.email.split("@")[0]}</Link>
                  <button className="gear-logout" onClick={handleLogout}>Thoát</button>
                </>
              ) : (
                <>
                  <Link className="login-link" to="/login">Đăng nhập</Link>
                  <Link className="register-link" to="/register">Đăng ký</Link>
                </>
              )}
            </div>

            <Link className="gear-icon wishlist-link" to="/wishlist" aria-label="Yêu thích">
              <Icon name="heart"/>
            </Link>

            <Link className="gear-cart" to="/cart" aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}>
              <Icon name="bag"/>
              <span className="cart-label">Giỏ hàng</span>
              {cartCount > 0 && <b className="gear-count">{cartCount}</b>}
            </Link>
          </div>
        </div>

        {/* Mobile full-screen menu */}
        {menuOpen && (
          <nav className="gear-mobile-menu is-entering" id="ux-mobile-menu" aria-label="Menu di động">
            <div className="mobile-menu-top">
              <b>KHÁM PHÁ NEXA</b>
              <button onClick={() => setMenuOpen(false)} aria-label="Đóng menu"><Icon name="close"/></button>
            </div>
            <div className="mobile-auth">
              {user ? (
                <>
                  <Link to="/account" onClick={() => setMenuOpen(false)}>{user.first_name || user.email.split("@")[0]}</Link>
                  <button onClick={() => { setMenuOpen(false); handleLogout(); }}>Đăng xuất</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>Đăng nhập</Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}>Đăng ký</Link>
                </>
              )}
            </div>
            <div className="mobile-category-grid">
              {[
                { label: "Bàn phím", slug: "ban-phim", img: "/assets/images/categories/keyboards.png" },
                { label: "Chuột", slug: "chuot", img: "/assets/images/categories/mouse.png" },
                { label: "Tai nghe", slug: "tai-nghe", img: "/assets/images/categories/headset.png" },
                { label: "Màn hình", slug: "man-hinh", img: "/assets/images/categories/monitor.png" },
                { label: "Lót bàn", slug: "phu-kien", img: "/assets/images/categories/pad.png" },
              ].map((cat) => (
                <Link key={cat.slug} className="menu-category-tile gear-category" to={`/products?category=${cat.slug}`} onClick={() => setMenuOpen(false)}>
                  <img src={cat.img} alt={cat.label}/>
                  <strong>{cat.label}</strong>
                </Link>
              ))}
            </div>
            <Link to="/" onClick={() => setMenuOpen(false)} aria-current={path === "/" ? "page" : undefined}>Trang chủ</Link>
            <Link to="/products" onClick={() => setMenuOpen(false)}>Tất cả sản phẩm</Link>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)}>Danh sách yêu thích</Link>
            <Link to="/orders" onClick={() => setMenuOpen(false)}>Đơn hàng</Link>
            <Link to="/account" onClick={() => setMenuOpen(false)}>Tài khoản</Link>
          </nav>
        )}
      </header>

      {/* Main content */}
      <main className="main-with-mobile" id="main">
        <Outlet context={{ setCartCount }} />
      </main>

      {/* Footer */}
      <footer className="gear-footer">
        <div className="container footer-statement">
          <strong>NEXA</strong>
          <span>Thiết bị phù hợp với cách bạn chơi, làm việc và sáng tạo.</span>
          <Link to="/products">Tìm món gear tiếp theo <Icon name="arrow"/></Link>
        </div>
        <div className="gear-footer-grid">
          <div>
            <Link className="gear-brand" to="/" aria-label="NEXA GEAR – Trang chủ">
              <span className="gear-mark" aria-hidden="true">N</span>
              <span>NEXA<small>ELEVATE YOUR PLAY</small></span>
            </Link>
            <p>Bàn phím, chuột và âm thanh.<br/>Chọn thiết bị theo cách bạn sử dụng.</p>
          </div>
          <div>
            <h3>Khám phá</h3>
            <Link to="/products">Tất cả sản phẩm</Link>
            <Link to="/products?category=ban-phim">Bàn phím</Link>
            <Link to="/products?category=chuot">Chuột & lót bàn</Link>
            <Link to="/wishlist">Danh sách yêu thích</Link>
          </div>
          <div>
            <h3>Hỗ trợ</h3>
            <a href="#shipping">Chính sách giao hàng</a>
            <a href="#faq">Câu hỏi thường gặp</a>
            <a href="#contact">Liên hệ</a>
            <a href="#privacy">Quyền riêng tư</a>
          </div>
          <div>
            <h3>Tài khoản</h3>
            <Link to="/login">Đăng nhập</Link>
            <Link to="/register">Đăng ký</Link>
            <Link to="/orders">Theo dõi đơn hàng</Link>
            {user?.is_staff && <Link to="/admin">Quản trị ↗</Link>}
          </div>
        </div>
        <div className="gear-colophon">
          <span>© 2026 NEXA GEAR</span>
        </div>
      </footer>

      {/* Mobile bottom tabs */}
      <nav className="mobile-tabs" aria-label="Điều hướng di động">
        <button className={mobileTab === "home" ? "active" : ""} onClick={() => navigate("/")}>
          <svg className="tab-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>
          </svg>
          Trang chủ
        </button>
        <button className={mobileTab === "shop" ? "active" : ""} onClick={() => navigate("/products")}>
          <svg className="tab-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
          </svg>
          Danh mục
        </button>
        <button className={mobileTab === "cart" ? "active" : ""} onClick={() => navigate("/cart")}>
          <svg className="tab-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 7h14l1 14H4L5 7Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>
          </svg>
          Giỏ hàng
        </button>
        <button onClick={() => navigate(user ? "/account" : "/login")}>
          <svg className="tab-icon" viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="7" r="4"/><path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2z"/>
          </svg>
          Cá nhân
        </button>
      </nav>
    </>
  );
}
