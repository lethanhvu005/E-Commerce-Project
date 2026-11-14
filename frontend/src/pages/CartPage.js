import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { cartService } from "../api/client";
import { fallbackProductImage, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

const FREE_SHIPPING_THRESHOLD = 1000000;

export default function CartPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { refreshCartCount } = outlet;

  const [cart, setCart] = useState(null);
  const [voucherCode, setVoucherCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [busyItem, setBusyItem] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const loadCart = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await cartService.getCart();
      setCart(data);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [refreshCartCount]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/cart" } } });
      return;
    }
    loadCart();
  }, [user, navigate, loadCart]);

  const handleUpdateQuantity = async (item, newQty) => {
    if (newQty < 1) return;
    setBusyItem(item.id);
    try {
      const updated = await cartService.updateItem(item.id, newQty);
      setCart(updated);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể cập nhật số lượng.");
    } finally {
      setBusyItem(null);
    }
  };

  const handleRemoveItem = async (item) => {
    setBusyItem(item.id);
    try {
      const updated = await cartService.removeItem(item.id);
      setCart(updated);
      setToastMsg(`Đã xóa ${item.product_name} khỏi giỏ hàng.`);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể xóa sản phẩm khỏi giỏ.");
    } finally {
      setBusyItem(null);
    }
  };

  const handleClearCart = async () => {
    try {
      const updated = await cartService.clearCart();
      setCart(updated || { items: [], subtotal: 0, discount_total: 0, total: 0 });
      setToastMsg("Đã làm trống giỏ hàng.");
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể xóa giỏ hàng.");
    }
  };

  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    const code = voucherCode.trim();
    if (!code) return;
    try {
      const updated = await cartService.applyVoucher(code);
      setCart((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              items: updated.items ?? prev.items,
              voucher: updated.voucher ?? (updated.voucher_code ? { code: updated.voucher_code } : null),
            }
          : updated
      );
      setToastMsg(`Áp dụng mã ${code} thành công!`);
      setVoucherCode("");
    } catch (err) {
      setToastMsg(err.message || "Mã ưu đãi không hợp lệ hoặc chưa đủ điều kiện.");
    }
  };

  const handleRemoveVoucher = async () => {
    try {
      const updated = await cartService.removeVoucher();
      setCart((prev) =>
        prev
          ? {
              ...prev,
              ...updated,
              items: updated.items ?? prev.items,
              voucher: null,
              voucher_code: null,
            }
          : updated
      );
      setToastMsg("Đã gỡ mã ưu đãi.");
    } catch (err) {
      setToastMsg(err.message || "Không thể gỡ mã ưu đãi.");
    }
  };

  if (loading && !cart) {
    return (
      <div className="container" style={{ padding: "40px 0" }}>
        <Loading label="Đang tải giỏ hàng..." />
      </div>
    );
  }

  const items = cart?.items || [];
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotalNum = Number(cart?.subtotal || 0);
  const shipProgress = Math.min(100, Math.round((subtotalNum / FREE_SHIPPING_THRESHOLD) * 100));
  const remainingForFreeShip = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotalNum);

  return (
    <div className="container">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <div className="crumb">
        <Link to="/">Trang chủ</Link> › Giỏ hàng
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "12px" }}>
        <h1 className="page-title">
          Giỏ hàng của bạn{" "}
          <span style={{ fontSize: "14px", color: "var(--muted)", fontWeight: 500 }}>
            ({itemCount} sản phẩm)
          </span>
        </h1>
        {items.length > 0 && (
          <button
            type="button"
            className="btn btn-quiet"
            style={{ fontSize: "12px", padding: "6px 12px" }}
            onClick={handleClearCart}
          >
            Làm trống giỏ hàng
          </button>
        )}
      </div>

      {error && <ErrorBox error={error} onRetry={loadCart} />}

      {items.length === 0 ? (
        <div className="empty" style={{ margin: "23px 0 50px" }}>
          <div style={{ fontSize: "52px" }}>🛒</div>
          <h2>Giỏ hàng đang trống</h2>
          <p>Bắt đầu khám phá những món gaming gear hiệu năng cao bạn yêu thích.</p>
          <button className="btn btn-violet nexa-btn-3d" onClick={() => navigate("/products")}>
            Khám phá sản phẩm ngay →
          </button>
        </div>
      ) : (
        <div className="cart-layout nexa-cart-grid">
          {/* Left: Cart Items List */}
          <section className="whitebox">
            {/* Free Shipping Progress Bar */}
            <div className="nexa-freeship-bar">
              <div className="nexa-freeship-text">
                {remainingForFreeShip === 0 ? (
                  <span>🎉 Đơn hàng của bạn đã đủ điều kiện hưởng ưu đãi <b>Miễn phí vận chuyển</b>!</span>
                ) : (
                  <span>
                    Mua thêm <b>{money(remainingForFreeShip)}</b> để đạt mốc ưu đãi vận chuyển 1.000.000 ₫
                  </span>
                )}
                <b>{shipProgress}%</b>
              </div>
              <div className="nexa-freeship-track">
                <div className="nexa-freeship-fill" style={{ width: `${shipProgress}%` }} />
              </div>
            </div>

            <h3>Danh sách sản phẩm ({items.length})</h3>
            <div className="cart-lines">
              {items.map((item) => (
                <article
                  className="cart-line nexa-cart-line"
                  key={item.id}
                  style={{ opacity: busyItem === item.id ? 0.5 : 1 }}
                >
                  <Link
                    className="cart-image"
                    to={item.product_slug ? `/products/${item.product_slug}` : "/products"}
                  >
                    <img
                      src={productImage(item)}
                      alt={item.product_name}
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        e.currentTarget.src = fallbackProductImage(item);
                      }}
                    />
                  </Link>

                  <div>
                    <strong>
                      <Link to={item.product_slug ? `/products/${item.product_slug}` : "/products"}>
                        {item.product_name}
                      </Link>
                    </strong>
                    <div style={{ color: "var(--muted)", fontSize: "12px", margin: "4px 0" }}>
                      SKU: {item.sku}
                      {item.option_summary ? ` · ${item.option_summary}` : ""}
                    </div>
                    <div className="price">{money(item.unit_price)}</div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <div className="nexa-qty-control">
                      <button
                        type="button"
                        disabled={item.quantity <= 1 || busyItem === item.id}
                        onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                        aria-label="Giảm số lượng"
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        disabled={busyItem === item.id}
                        onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                        aria-label="Tăng số lượng"
                      >
                        ＋
                      </button>
                    </div>

                    <div className="nexa-line-total">{money(item.line_total)}</div>

                    <button
                      type="button"
                      className="remove"
                      onClick={() => handleRemoveItem(item)}
                      disabled={busyItem === item.id}
                    >
                      Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Right: Order Summary Box */}
          <aside className="whitebox" style={{ height: "fit-content", position: "sticky", top: "94px" }}>
            <h3>Tóm tắt đơn hàng</h3>

            <div className="summary-row">
              <span>Tạm tính ({itemCount} món)</span>
              <strong>{money(cart.subtotal)}</strong>
            </div>

            {Number(cart.discount_total || 0) > 0 && (
              <div className="summary-row" style={{ color: "#16b882" }}>
                <span>Giảm giá Voucher</span>
                <strong>− {money(cart.discount_total)}</strong>
              </div>
            )}

            {/* Voucher Coupon Input Form */}
            {cart.voucher?.code || cart.voucher_code ? (
              <div className="nexa-applied-voucher">
                <div>
                  <span>MÃ ƯU ĐÃI ĐANG ÁP DỤNG</span>
                  <strong>{cart.voucher?.code || cart.voucher_code}</strong>
                </div>
                <button type="button" onClick={handleRemoveVoucher}>
                  Gỡ mã
                </button>
              </div>
            ) : (
              <form className="coupon" onSubmit={handleApplyVoucher}>
                <input
                  className="field"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Nhập mã voucher..."
                  style={{ textTransform: "uppercase" }}
                />
                <button type="submit" className="btn btn-dark" style={{ whiteSpace: "nowrap" }}>
                  Áp dụng
                </button>
              </form>
            )}

            <div style={{ margin: "6px 0 12px", textAlign: "right" }}>
              <Link to="/vouchers" style={{ fontSize: "11.5px", color: "var(--accent)", fontWeight: 600 }}>
                🎟️ Xem kho mã ưu đãi hiện có →
              </Link>
            </div>

            <div className="summary-row total">
              <span>Tổng cộng</span>
              <strong>{money(cart.total)}</strong>
            </div>

            <button
              type="button"
              className="btn btn-violet full nexa-btn-3d"
              style={{ width: "100%", marginTop: "16px", padding: "14px", fontSize: "14px" }}
              onClick={() => navigate("/checkout")}
            >
              Tiến hành thanh toán →
            </button>

            <Link
              to="/products"
              style={{
                display: "block",
                textAlign: "center",
                marginTop: "14px",
                color: "var(--muted)",
                fontSize: "12px",
              }}
            >
              ← Tiếp tục mua sắm
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
