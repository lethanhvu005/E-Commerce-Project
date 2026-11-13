import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { cartService, catalogService, wishlistService } from "../api/client";

function NexaLogoMark() {
  const uid = useId();
  const logoGradId = `nexaLogoGrad-${uid}`;
  const wingGradId = `nexaWingGrad-${uid}`;
  return (
    <span className="gear-mark nexa-logo-mark" aria-hidden="true">
      <svg viewBox="0 0 38 38" width="24" height="24" fill="none">
        <defs>
          <linearGradient id={logoGradId} x1="4" y1="4" x2="34" y2="34" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#6eb4ff" />
            <stop offset="50%" stopColor="#2868e8" />
            <stop offset="100%" stopColor="#43e6e3" />
          </linearGradient>
          <linearGradient id={wingGradId} x1="8" y1="8" x2="30" y2="30" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="100%" stopColor="#9cc6ff" />
          </linearGradient>
        </defs>
        {/* Outer precision hex-shield */}
        <path
          d="M19 2.5L33.5 9.8V28.2L19 35.5L4.5 28.2V9.8L19 2.5Z"
          stroke={`url(#${logoGradId})`}
          strokeWidth="1.75"
          fill="rgba(21, 88, 201, 0.16)"
        />
        {/* Dynamic N geometric wing */}
        <path
          d="M11.5 26.5V11.5L16.2 11.5L22.8 20.6V11.5H26.5V26.5H21.8L15.2 17.4V26.5H11.5Z"
          fill={`url(#${wingGradId})`}
        />
        {/* Cyber cyan accent slash */}
        <path
          d="M24.2 8.2L29.2 11.1L26.5 13.2L24.2 8.2Z"
          fill="#43e6e3"
        />
      </svg>
    </span>
  );
}

function Icon({ name, className }) {
  const paths = {
    home: <path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z" />,
    grid: (
      <>
        <rect x="3" y="3" width="6" height="6" rx="1" />
        <rect x="15" y="3" width="6" height="6" rx="1" />
        <rect x="3" y="15" width="6" height="6" rx="1" />
        <rect x="15" y="15" width="6" height="6" rx="1" />
      </>
    ),
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
    layers: (
      <>
        <path d="m2 8 10-6 10 6-10 6z" />
        <path d="m2 12 10 6 10-6M2 16l10 6 10-6" />
      </>
    ),
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 11v6M12 7h.01" />
      </>
    ),
    support: (
      <>
        <path d="M4 14v-3a8 8 0 0 1 16 0v3M20 17v2a2 2 0 0 1-2 2h-4" />
        <rect x="2" y="11" width="5" height="7" rx="2" />
        <rect x="17" y="11" width="5" height="7" rx="2" />
      </>
    ),
    search: (
      <>
        <circle cx="10.5" cy="10.5" r="6.5" />
        <path d="m16 16 5 5" />
      </>
    ),
    moon: <path d="M20 15A9 9 0 0 1 9 3a9 9 0 1 0 11 12Z" />,
    sun: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
      </>
    ),
    user: (
      <>
        <circle cx="12" cy="7" r="4" />
        <path d="M3 21v-2a7 7 0 0 1 7-7h4a7 7 0 0 1 7 7v2z" />
      </>
    ),
    heart: <path d="M20 5c-3-3-7-1-8 1-1-2-5-4-8-1-4 4 1 9 8 15 7-6 12-11 8-15Z" />,
    bag: (
      <>
        <path d="M5 7h14l1 14H4L5 7Z" />
        <path d="M9 8V6a3 3 0 0 1 6 0v2" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h10" />,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
    close: <path d="M18 6 6 18M6 6l12 12" />,
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
      className={className}
    >
      {paths[name] || paths.arrow}
    </svg>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [theme, setTheme] = useState(() => localStorage.getItem("nexa_theme") || "dark");
  const [search, setSearch] = useState("");
  const [cartCount, setCartCount] = useState(0);
  const [wishlistIds, setWishlistIds] = useState(new Set());
  const [menuOpen, setMenuOpen] = useState(false);
  const [topbarDismissed, setTopbarDismissed] = useState(false);
  const [categories, setCategories] = useState([]);
  const [showBackTop, setShowBackTop] = useState(false);
  const megaRef = useRef(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("nexa_theme", theme);
  }, [theme]);

  useEffect(() => {
    catalogService
      .getCategories()
      .then((data) => {
        setCategories(data.results || data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const onScroll = () => {
      setShowBackTop(window.scrollY > 420);
    };
    const onDocClick = (e) => {
      if (megaRef.current && megaRef.current.hasAttribute("open")) {
        if (!megaRef.current.contains(e.target) || e.target.closest(".mega-panel a")) {
          megaRef.current.removeAttribute("open");
        }
      }
    };
    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (megaRef.current) megaRef.current.removeAttribute("open");
        setMenuOpen(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("scroll", onScroll);
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const refreshCartCount = useCallback(async () => {
    if (!user) {
      setCartCount(0);
      return;
    }
    try {
      const cart = await cartService.getCart();
      const count = (cart.items || []).reduce((sum, item) => sum + item.quantity, 0);
      setCartCount(count);
    } catch {
      setCartCount(0);
    }
  }, [user]);

  const refreshWishlist = useCallback(async () => {
    if (!user) {
      setWishlistIds(new Set());
      return;
    }
    try {
      const data = await wishlistService.getWishlist();
      const items = data.results || data || [];
      setWishlistIds(new Set(items.map((entry) => entry.product?.id || entry.product)));
    } catch {
      setWishlistIds(new Set());
    }
  }, [user]);

  useEffect(() => {
    refreshCartCount();
    refreshWishlist();
  }, [refreshCartCount, refreshWishlist]);

  useLayoutEffect(() => {
    if (megaRef.current) {
      megaRef.current.removeAttribute("open");
    }
    setMenuOpen(false);

    if (location.hash) {
      const targetId = location.hash.replace(/^#/, "");
      const targetEl = document.getElementById(targetId);
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
    }

    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";
    window.scrollTo(0, 0);
    root.scrollTop = 0;
    document.body.scrollTop = 0;
    requestAnimationFrame(() => {
      root.style.scrollBehavior = prevBehavior;
    });
  }, [location.pathname, location.search, location.hash, location.key]);

  const submitSearch = (e) => {
    e.preventDefault();
    const q = search.trim();
    if (q) {
      navigate(`/products?search=${encodeURIComponent(q)}`);
    } else {
      navigate("/products");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  const pathname = location.pathname;
  const isHome = pathname === "/";
  const isShop = pathname.startsWith("/products");
  const isCart = pathname.startsWith("/cart");
  const isAccount =
    pathname.startsWith("/account") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/orders");

  // Internal pages use the adaptive .light-area container (styled in both light.css and detail-dark.css)
  const isLightArea = [
    "/cart",
    "/checkout",
    "/orders",
    "/wishlist",
    "/account",
    "/profile",
    "/products",
    "/login",
    "/register",
    "/vouchers",
    "/reviews",
    "/about",
    "/contact",
    "/faq",
    "/shipping",
    "/privacy",
    "/tracking",
  ].some((p) => pathname === p || (p !== "/products" && pathname.startsWith(p)));

  return (
    <>
      <a className="skip-link" href="#main">
        Đến nội dung chính
      </a>

      {/* Topbar Announcement */}
      {!topbarDismissed && (
        <div className="topbar">
          <span>
            MIỄN PHÍ VẬN CHUYỂN CHO ĐƠN TỪ <b>1.000.000 ₫</b> · BẢO HÀNH CHÍNH HÃNG 24 THÁNG · HỖ TRỢ 24/7
          </span>
          <button
            className="topbar-dismiss"
            aria-label="Ẩn thông báo"
            onClick={() => setTopbarDismissed(true)}
          >
            ×
          </button>
        </div>
      )}

      {/* Sticky Glassmorphic Header */}
      <header className="gear-header nexa-glass-header">
        <div className="container masthead">
          <button
            className="gear-menu-button"
            onClick={() => setMenuOpen(true)}
            aria-label="Mở danh mục"
            aria-expanded={menuOpen}
          >
            <Icon name="menu" />
          </button>

          <Link className="gear-brand nexa-brand-redesign" to="/" aria-label="NEXA GEAR — Trang chủ">
            <NexaLogoMark />
            <span className="nexa-brand-text">
              <strong className="nexa-wordmark">
                NEXA<i className="nexa-wordmark-dot" />
              </strong>
              <small>GAMING GEAR</small>
            </span>
          </Link>

          <nav className="desktop-links" aria-label="Điều hướng chính">
            <NavLink className="nav-home" to="/" end>
              <Icon name="home" />
              <span>Trang chủ</span>
            </NavLink>

            <details className="gear-mega" ref={megaRef}>
              <summary>
                <Icon name="grid" />
                <span className="gear-nav-label">Sản phẩm</span>
                <span className="gear-nav-caret" aria-hidden="true">
                  ⌄
                </span>
              </summary>
              <div className="mega-panel">
                <div className="mega-panel-inner">
                  <div className="mega-catalog">
                    <div className="mega-heading">
                      <div>
                        <span className="gear-kicker">DANH MỤC SẢN PHẨM</span>
                        <strong>Thiết bị chính hãng cho góc máy của bạn</strong>
                      </div>
                      <Link to="/products">
                        Tất cả sản phẩm <span aria-hidden="true">↗</span>
                      </Link>
                    </div>

                    <div className="mega-category-groups mega-category-grid">
                      <section className="mega-category-group">
                        <h3>Điều khiển chính xác</h3>
                        <Link className="mega-category-link" to="/products?category=ban-phim">
                          <Icon name="keyboard" />
                          <span>Bàn phím cơ</span>
                          <small>Custom & Rapid Trigger</small>
                        </Link>
                        <Link className="mega-category-link" to="/products?category=chuot">
                          <Icon name="mouse" />
                          <span>Chuột Gaming</span>
                          <small>Siêu nhẹ & 8KHz Polling</small>
                        </Link>
                      </section>

                      <section className="mega-category-group">
                        <h3>Âm thanh & Hiển thị</h3>
                        <Link className="mega-category-link" to="/products?category=tai-nghe">
                          <Icon name="headset" />
                          <span>Tai nghe eSports</span>
                          <small>Spatial 7.1 & Không dây</small>
                        </Link>
                        <Link className="mega-category-link" to="/products?category=man-hinh">
                          <Icon name="monitor" />
                          <span>Màn hình tần số cao</span>
                          <small>240Hz – 360Hz Fast IPS</small>
                        </Link>
                      </section>

                      <section className="mega-category-group">
                        <h3>Hoàn thiện Góc Setup</h3>
                        <Link className="mega-category-link" to="/products?category=phu-kien">
                          <Icon name="pad" />
                          <span>Pad & Phụ kiện</span>
                          <small>Bề mặt tốc độ & Control</small>
                        </Link>
                        <Link className="mega-category-link" to="/products?category=ghe-gaming">
                          <Icon name="chair" />
                          <span>Ghế Công thái học</span>
                          <small>Nâng đỡ cột sống chuẩn</small>
                        </Link>
                      </section>
                    </div>
                  </div>

                  <div className="mega-feature-grid">
                    <Link className="mega-feature" to="/products?category=ban-phim">
                      <span className="mega-feature-image">
                        <img src="/assets/images/categories/keyboards.png" alt="Bàn phím NEXA" />
                        <b>01</b>
                      </span>
                      <span className="mega-feature-copy">
                        <small>Bàn phím / NEXA SELECT</small>
                        <strong>NEXA KEYBOARD</strong>
                        <span>
                          Khám phá <b>↗</b>
                        </span>
                      </span>
                    </Link>
                    <Link className="mega-feature" to="/products?category=chuot">
                      <span className="mega-feature-image">
                        <img src="/assets/images/categories/mouse.png" alt="Chuột gaming" />
                        <b>02</b>
                      </span>
                      <span className="mega-feature-copy">
                        <small>Chuột / NEXA SELECT</small>
                        <strong>GAMING MOUSE</strong>
                        <span>
                          Khám phá <b>↗</b>
                        </span>
                      </span>
                    </Link>
                  </div>
                </div>
              </div>
            </details>

            <NavLink to="/products">
              <Icon name="layers" />
              Cửa Hàng
            </NavLink>
            <NavLink to="/reviews">
              <Icon name="info" />
              Cộng Đồng
            </NavLink>
            <NavLink to="/vouchers">
              <Icon name="support" />
              Kho Voucher
            </NavLink>
          </nav>

          {/* Search Form */}
          <form className="gear-search" onSubmit={submitSearch}>
            <button type="submit" aria-label="Tìm kiếm">
              <Icon name="search" />
            </button>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm bàn phím, chuột, tai nghe..."
            />
            {search && (
              <button
                type="button"
                className="nexa-search-clear"
                onClick={() => setSearch("")}
                aria-label="Xóa tìm kiếm"
              >
                ×
              </button>
            )}
          </form>

          {/* Action Icons */}
          <div className="gear-actions">
            <button
              className="gear-theme"
              onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
              aria-label="Chuyển giao diện sáng tối"
              title={theme === "dark" ? "Chuyển sang Chế độ Sáng" : "Chuyển sang Chế độ Tối"}
            >
              <span className="theme-moon">
                <Icon name="moon" />
              </span>
              <span className="theme-sun">
                <Icon name="sun" />
              </span>
            </button>

            <div className="desktop-account">
              <Icon name="user" />
              {user ? (
                <>
                  <Link to="/account">{user.first_name || user.email.split("@")[0]}</Link>
                  <button
                    className="gear-logout"
                    onClick={handleLogout}
                    style={{
                      border: 0,
                      background: "none",
                      color: "var(--muted)",
                      marginLeft: "4px",
                    }}
                  >
                    Thoát
                  </button>
                </>
              ) : (
                <>
                  <Link className="login-link" to="/login">
                    Đăng nhập
                  </Link>
                  <Link className="register-link" to="/register">
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            <Link
              className="gear-icon wishlist-link"
              to="/wishlist"
              aria-label="Danh sách yêu thích"
              style={{ position: "relative" }}
            >
              <Icon name="heart" />
              {wishlistIds.size > 0 && (
                <span className="nexa-wish-badge">{wishlistIds.size}</span>
              )}
            </Link>

            <Link
              className="gear-cart"
              to="/cart"
              aria-label={`Giỏ hàng, ${cartCount} sản phẩm`}
            >
              <Icon name="bag" />
              <span className="cart-label">Giỏ hàng</span>
              {cartCount > 0 && <b className="gear-count">{cartCount}</b>}
            </Link>
          </div>
        </div>

        {/* Mobile Full Screen Menu */}
        {menuOpen && (
          <nav
            className="gear-mobile-menu is-entering"
            id="ux-mobile-menu"
            aria-label="Menu di động"
          >
            <div className="mobile-menu-top">
              <b>KHÁM PHÁ NEXA</b>
              <button onClick={() => setMenuOpen(false)} aria-label="Đóng menu">
                <Icon name="close" />
              </button>
            </div>

            <div className="mobile-auth">
              {user ? (
                <>
                  <Link to="/account" onClick={() => setMenuOpen(false)}>
                    {user.first_name || user.email}
                  </Link>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenuOpen(false)}>
                    Đăng nhập
                  </Link>
                  <Link to="/register" onClick={() => setMenuOpen(false)}>
                    Đăng ký
                  </Link>
                </>
              )}
            </div>

            <div className="mobile-category-grid">
              {(categories.length > 0
                ? categories
                : [
                    {
                      name: "Bàn phím",
                      slug: "ban-phim",
                      image: "/assets/images/categories/keyboards.png",
                    },
                    {
                      name: "Chuột",
                      slug: "chuot",
                      image: "/assets/images/categories/mouse.png",
                    },
                    {
                      name: "Tai nghe",
                      slug: "tai-nghe",
                      image: "/assets/images/categories/headset.png",
                    },
                    {
                      name: "Màn hình",
                      slug: "man-hinh",
                      image: "/assets/images/categories/monitor.png",
                    },
                  ]
              ).map((c) => (
                <Link
                  key={c.id || c.slug}
                  className="menu-category-tile gear-category"
                  to={`/products?category=${c.slug}`}
                  onClick={() => setMenuOpen(false)}
                >
                  <img
                    src={c.image || `/assets/images/categories/${c.code || "keyboards"}.png`}
                    alt={c.name}
                  />
                  <strong>{c.name}</strong>
                </Link>
              ))}
            </div>

            <Link to="/" onClick={() => setMenuOpen(false)}>
              Trang chủ
            </Link>
            <Link to="/products" onClick={() => setMenuOpen(false)}>
              Tất cả sản phẩm
            </Link>
            <Link to="/wishlist" onClick={() => setMenuOpen(false)}>
              Yêu thích ({wishlistIds.size})
            </Link>
            <Link to="/orders" onClick={() => setMenuOpen(false)}>
              Đơn hàng
            </Link>
            <Link to="/vouchers" onClick={() => setMenuOpen(false)}>
              Kho Voucher
            </Link>
            <Link to="/tracking" onClick={() => setMenuOpen(false)}>
              Theo dõi vận chuyển
            </Link>
            <Link to="/account" onClick={() => setMenuOpen(false)}>
              Tài khoản
            </Link>
            {user?.is_staff && (
              <Link to="/admin/inventory" onClick={() => setMenuOpen(false)}>
                Quản trị kho ↗
              </Link>
            )}
          </nav>
        )}
      </header>

      {/* Main Container */}
      <main
        className={`main-with-mobile ${isLightArea ? "light-area" : ""}`}
        id="main"
        tabIndex="-1"
      >
        <Outlet
          context={{
            theme,
            setTheme,
            cartCount,
            setCartCount,
            refreshCartCount,
            wishlistIds,
            setWishlistIds,
            refreshWishlist,
          }}
        />
      </main>

      {/* Floating Back to Top Button */}
      {showBackTop && (
        <button
          type="button"
          className="nexa-back-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Lên đầu trang"
          title="Lên đầu trang"
        >
          ↑
        </button>
      )}

      {/* Footer */}
      <footer className="gear-footer">
        <div className="container">
          <div className="footer-statement">
            <span>
              Thiết kế tinh gọn.
              <br />
              <em>Trải nghiệm trọn vẹn.</em>
            </span>
            <Link to="/products">
              Tìm món gear tiếp theo <Icon name="arrow" />
            </Link>
          </div>

          <div className="gear-footer-grid">
            <div>
              <Link className="gear-brand nexa-brand-redesign" to="/" aria-label="NEXA GEAR — Trang chủ">
                <NexaLogoMark />
                <span className="nexa-brand-text">
                  <strong className="nexa-wordmark">
                    NEXA<i className="nexa-wordmark-dot" />
                  </strong>
                  <small>GAMING GEAR</small>
                </span>
              </Link>
              <p>
                Chuyên bàn phím cơ, chuột gaming, tai nghe và phụ kiện chính hãng.
                <br />
                Bảo hành 24 tháng, giao nhanh toàn quốc.
              </p>
            </div>

            <div>
              <h3>Khám phá</h3>
              <Link to="/products">Tất cả sản phẩm</Link>
              <Link to="/products?category=ban-phim">Bàn phím</Link>
              <Link to="/products?category=chuot">Chuột & lót bàn</Link>
              <Link to="/wishlist">Danh sách yêu thích</Link>
              <Link to="/vouchers">Kho Voucher</Link>
            </div>

            <div>
              <h3>Hỗ trợ</h3>
              <Link to="/shipping">Chính sách giao hàng</Link>
              <Link to="/faq">Câu hỏi thường gặp</Link>
              <Link to="/contact">Liên hệ</Link>
              <Link to="/privacy">Quyền riêng tư</Link>
              <Link to="/about">Về NEXA</Link>
            </div>

            <div>
              <h3>Tài khoản & Vận đơn</h3>
              <Link to="/login">Đăng nhập</Link>
              <Link to="/register">Đăng ký</Link>
              <Link to="/orders">Đơn hàng của tôi</Link>
              <Link to="/tracking">Theo dõi vận chuyển</Link>
              {user?.is_staff && <Link to="/admin">Quản trị CommerceOS ↗</Link>}
            </div>
          </div>

          <div className="gear-colophon">
            <span>© 2026 NEXA GEAR · COMMERCEOS 3D EDITION</span>
            <span>Dữ liệu thời gian thực từ PostgreSQL · Bảo mật JWT</span>
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Tabs */}
      <nav className="mobile-tabs" aria-label="Điều hướng di động">
        <button className={isHome ? "active" : ""} onClick={() => navigate("/")}>
          <Icon name="home" className="tab-icon" />
          Trang chủ
        </button>
        <button className={isShop ? "active" : ""} onClick={() => navigate("/products")}>
          <Icon name="grid" className="tab-icon" />
          Danh mục
        </button>
        <button className={isCart ? "active" : ""} onClick={() => navigate("/cart")}>
          <Icon name="bag" className="tab-icon" />
          Giỏ hàng {cartCount > 0 ? `(${cartCount})` : ""}
        </button>
        <button
          className={isAccount ? "active" : ""}
          onClick={() => navigate(user ? "/account" : "/login")}
        >
          <Icon name="user" className="tab-icon" />
          Cá nhân
        </button>
      </nav>
    </>
  );
}
