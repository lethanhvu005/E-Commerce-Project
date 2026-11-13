import { useEffect, useState } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../auth/AuthContext";
import "../../admin-react.css";

const items = [
  ["dashboard", "◫", "Tổng quan"],
  ["products", "⬡", "Sản phẩm"],
  ["orders", "▤", "Đơn hàng"],
  ["inventory", "▣", "Tồn kho"],
  ["analytics", "▥", "Báo cáo"],
  ["customers", "♙", "Khách hàng"],
  ["promotions", "◈", "Ưu đãi"],
  ["reviews", "★", "Đánh giá"],
  ["support", "☎", "Hỗ trợ"],
  ["settings", "⚙", "Cài đặt"],
];

export default function AdminLayout() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", localStorage.getItem("nexa_theme") || "dark");
    const close = (event) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, []);

  const toggleTheme = () => {
    const root = document.documentElement;
    const dark = root.getAttribute("data-theme") === "dark";
    const next = dark ? "light" : "dark";
    root.setAttribute("data-theme", next);
    localStorage.setItem("nexa_theme", next);
  };

  return (
    <div className="admin-app">
      <aside className={`admin-sidebar${open ? " open" : ""}`} id="admin-sidebar">
        <div className="admin-logo">
          <span className="brand-mark admin-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 38 38" width="20" height="20" fill="none">
              <path
                d="M19 2.5L33.5 9.8V28.2L19 35.5L4.5 28.2V9.8L19 2.5Z"
                stroke="#6eb4ff"
                strokeWidth="2"
                fill="rgba(21, 88, 201, 0.22)"
              />
              <path
                d="M11.5 26.5V11.5L16.2 11.5L22.8 20.6V11.5H26.5V26.5H21.8L15.2 17.4V26.5H11.5Z"
                fill="#ffffff"
              />
            </svg>
          </span>
          <span>NEXA Admin</span>
        </div>
        <nav className="admin-menu" aria-label="Điều hướng quản trị">
          {items.map(([path, icon, label]) => (
            <NavLink
              key={path}
              to={`/admin/${path}`}
              className={({ isActive }) => `admin-link${isActive ? " active" : ""}`}
              onClick={() => setOpen(false)}
            >
              <span className="ico" aria-hidden="true">{icon}</span>{label}
            </NavLink>
          ))}
          <Link className="admin-link" to="/">
            <span className="ico" aria-hidden="true">↗</span>Xem cửa hàng
          </Link>
        </nav>
        <div className="sidebar-bottom">
          <div className="admin-user">
            <span className="admin-avatar">{(user?.first_name || user?.email || "A")[0].toUpperCase()}</span>
            <div><b>{user?.first_name || "Admin"}</b><br /><span>{user?.email}</span></div>
          </div>
        </div>
      </aside>
      {open && <button className="admin-veil" aria-label="Đóng menu" onClick={() => setOpen(false)} />}
      <div className="admin-main">
        <header className="admin-top">
          <button className="sidebar-toggle" onClick={() => setOpen(true)} aria-label="Mở menu quản trị">☰</button>
          <label className="admin-top-search">⌕<input placeholder="Tìm sản phẩm, đơn hàng, khách hàng..." aria-label="Tìm nhanh admin" /></label>
          <div className="admin-top-right">
            <button className="icon-btn" onClick={toggleTheme} title="Đổi giao diện sáng tối">◐</button>
            <Link className="icon-btn" to="/" title="Xem cửa hàng">↗</Link>
            <span className="admin-avatar">{(user?.first_name || user?.email || "A")[0].toUpperCase()}</span>
            <b className="desktop-only">Admin</b>
          </div>
        </header>
        <main className="admin-content"><Outlet /></main>
      </div>
    </div>
  );
}
