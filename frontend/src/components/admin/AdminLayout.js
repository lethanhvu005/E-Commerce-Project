import { useEffect, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AdminIcon } from "./AdminIcons";
import "../../admin-react.css";

const items = [
  ["dashboard", "dashboard", "Tổng quan"],
  ["products", "products", "Sản phẩm"],
  ["orders", "orders", "Đơn hàng"],
  ["inventory", "inventory", "Tồn kho"],
  ["analytics", "analytics", "Báo cáo"],
  ["customers", "customers", "Khách hàng"],
  ["promotions", "promotions", "Ưu đãi"],
  ["reviews", "reviews", "Đánh giá"],
  ["support", "support", "Hỗ trợ"],
  ["settings", "settings", "Cài đặt"],
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("nexa_theme") || "light");
  const [topSearch, setTopSearch] = useState("");

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    const close = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [theme]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    localStorage.setItem("nexa_theme", next);
  };

  const handleViewStorefront = () => {
    sessionStorage.setItem("nexa_admin_view_storefront", "1");
    setOpen(false);
    navigate("/");
  };

  const handleTopSearch = (e) => {
    e.preventDefault();
    const q = topSearch.trim();
    const querySuffix = q ? `?q=${encodeURIComponent(q)}` : "";
    if (q.toUpperCase().startsWith("NX-")) {
      navigate(`/admin/orders${querySuffix}`);
    } else {
      navigate(`/admin/products${querySuffix}`);
    }
  };

  const handleAdminLogout = async () => {
    sessionStorage.removeItem("nexa_admin_view_storefront");
    await logout();
    navigate("/login");
  };

  const displayName =
    [user?.last_name, user?.first_name].filter(Boolean).join(" ") ||
    user?.first_name ||
    "Quản trị viên";
  const avatarChar = (user?.first_name?.[0] || user?.email?.[0] || "A").toUpperCase();

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar${open ? " open" : ""}`} id="admin-sidebar">
        <div className="admin-logo">
          <span
            className="brand-mark admin-brand-mark"
            style={{ width: 28, height: 28, fontSize: 15, display: "grid", placeItems: "center" }}
          >
            N
          </span>
          <span>CommerceOS</span>
          <span className="admin-logo-badge">PRO</span>
        </div>

        <nav className="admin-menu" aria-label="Điều hướng quản trị">
          {items.map(([path, iconName, label]) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              className={({ isActive }) => `admin-link${isActive ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="ico" aria-hidden="true">
                <AdminIcon name={iconName} size={17} />
              </span>
              <span>{label}</span>
            </NavLink>
          ))}

          <div className="admin-menu-divider" />

          <button
            type="button"
            className="admin-link admin-link-storefront"
            onClick={handleViewStorefront}
          >
            <span className="ico" aria-hidden="true">
              <AdminIcon name="globe" size={17} />
            </span>
            <span>Xem trang web</span>
            <AdminIcon name="external" size={13} className="admin-ext-arrow" />
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-user">
            <span className="admin-avatar">{avatarChar}</span>
            <div className="admin-user-meta">
              <b>{displayName}</b>
              <span>{user?.email || "Quản trị hệ thống"}</span>
            </div>
            <button
              type="button"
              className="admin-logout-mini"
              onClick={handleAdminLogout}
              title="Đăng xuất"
              aria-label="Đăng xuất"
            >
              <AdminIcon name="logout" size={15} />
            </button>
          </div>
        </div>
      </aside>

      {open && (
        <button
          className="admin-veil"
          aria-label="Đóng menu"
          onClick={() => setOpen(false)}
        />
      )}

      <div className="admin-main">
        <header className="admin-top">
          <button
            className="sidebar-toggle"
            onClick={() => setOpen(true)}
            aria-label="Mở menu quản trị"
          >
            <AdminIcon name="menu" size={20} />
          </button>

          <form className="admin-top-search" onSubmit={handleTopSearch}>
            <AdminIcon name="search" size={16} />
            <input
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              placeholder="Tìm sản phẩm, mã đơn hàng, khách hàng..."
              aria-label="Tìm nhanh admin"
            />
          </form>

          <div className="admin-top-right">
            <span className="demo-pill desktop-only">POSTGRESQL LIVE</span>

            <button
              type="button"
              className="admin-view-web-btn"
              onClick={handleViewStorefront}
              title="Chuyển sang giao diện trang web cửa hàng"
            >
              <AdminIcon name="globe" size={15} />
              <span>Xem trang web</span>
              <AdminIcon name="external" size={13} />
            </button>

            <button
              type="button"
              className="icon-btn admin-theme-btn"
              onClick={toggleTheme}
              title={theme === "dark" ? "Chuyển sang giao diện Sáng" : "Chuyển sang giao diện Tối"}
              aria-label="Đổi giao diện sáng tối"
            >
              <AdminIcon name={theme === "dark" ? "sun" : "moon"} size={17} />
            </button>

            <span
              className="admin-avatar"
              style={{ height: 32, width: 32, fontSize: 12 }}
            >
              {avatarChar}
            </span>
            <b className="desktop-only">{displayName}</b>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
