import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import { AdminIcon } from "./AdminIcons";
import "../../admin-react.css";

const items = [
  ["dashboard", "dashboard", "Tổng quan", ["orders.view_order", "catalog.view_product", "inventory.view_inventorybalance", "accounts.view_user"]],
  ["products", "products", "Sản phẩm", ["catalog.view_product"]],
  ["orders", "orders", "Đơn hàng", ["orders.view_order"]],
  ["inventory", "inventory", "Tồn kho", ["inventory.view_inventorybalance"]],
  ["analytics", "analytics", "Báo cáo", ["orders.view_order", "payments.view_payment"]],
  ["customers", "customers", "Khách hàng", ["accounts.view_user"]],
  ["promotions", "promotions", "Ưu đãi", ["promotions.view_voucher"]],
  ["reviews", "reviews", "Đánh giá", ["community.view_review"]],
  ["support", "support", "Hỗ trợ", ["community.view_productquestion"]],
  ["settings", "settings", "Nhật ký & Sự kiện", ["operations.view_auditlog"]],
];

const SEARCHABLE_ADMIN_PATHS = new Set([
  "/admin/products",
  "/admin/orders",
  "/admin/inventory",
  "/admin/customers",
  "/admin/promotions",
  "/admin/reviews",
  "/admin/support",
  "/admin/settings",
]);

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [open, setOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem("nexa_theme") || "light");
  const [topSearch, setTopSearch] = useState(() => searchParams.get("q") || "");

  useEffect(() => {
    setTopSearch(searchParams.get("q") || "");
  }, [searchParams]);

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
    if (SEARCHABLE_ADMIN_PATHS.has(location.pathname)) {
      const next = new URLSearchParams(searchParams);
      if (q) next.set("q", q);
      else next.delete("q");
      next.delete("page");
      next.delete("audit_page");
      next.delete("outbox_page");
      setSearchParams(next);
      return;
    }
    const querySuffix = q ? `?q=${encodeURIComponent(q)}` : "";
    if (q.toUpperCase().startsWith("NX-")) {
      navigate(`/admin/orders${querySuffix}`);
    } else if (q.includes("@")) {
      navigate(`/admin/customers${querySuffix}`);
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
          {items
            .filter(([, , , requiredPerms]) => {
              if (!requiredPerms || user?.is_superuser) return true;
              const perms = user?.permissions;
              if (!Array.isArray(perms) || perms.length === 0) return true;
              return requiredPerms.every((p) => perms.includes(p));
            })
            .map(([path, iconName, label]) => (
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

          <button
            type="button"
            className="admin-link admin-link-logout"
            onClick={handleAdminLogout}
          >
            <span className="ico" aria-hidden="true">
              <AdminIcon name="logout" size={17} />
            </span>
            <span>Đăng xuất</span>
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

            <button
              type="button"
              className="admin-logout-top-btn"
              onClick={handleAdminLogout}
              title="Đăng xuất khỏi trang quản trị"
            >
              <AdminIcon name="logout" size={15} />
              <span>Đăng xuất</span>
            </button>
          </div>
        </header>

        <main className="admin-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
