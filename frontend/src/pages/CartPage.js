import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { cartService } from "../api/client";
import { money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

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

  const loadCart = async () => {
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
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/cart" } } });
      return;
    }
    loadCart();
  }, [user]);

  // Update item quantity
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

  // Remove item from cart
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

  // Apply voucher
  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    const code = voucherCode.trim();
    if (!code) return;
    try {
      const updated = await cartService.applyVoucher(code);
      setCart(updated);
      setToastMsg(`Áp dụng mã ${code} thành công!`);
      setVoucherCode("");
    } catch (err) {
      setToastMsg(err.message || "Mã ưu đãi không hợp lệ hoặc đã hết lượt.");
    }
  };

  // Remove applied voucher
  const handleRemoveVoucher = async () => {
    try {
      const updated = await cartService.removeVoucher();
      setCart(updated);
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

  return (
    <div className="container">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Breadcrumb */}
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › Giỏ hàng
      </div>

      <h1 className="page-title">
        Giỏ hàng{" "}
        <span style={{ fontSize: "14px", color: "#8a96ac", fontWeight: 500 }}>
          ({itemCount} sản phẩm)
        </span>
      </h1>

      {error && <ErrorBox error={error} onRetry={loadCart} />}

      {/* Empty State matching cart.html */}
      {items.length === 0 ? (
        <div className="empty" style={{ margin: "23px 0 50px" }}>
          <div style={{ fontSize: "52px" }}>🛒</div>
          <h2>Giỏ hàng đang trống</h2>
          <p>Bắt đầu khám phá những món gaming gear bạn yêu thích.</p>
          <button className="btn btn-violet" onClick={() => navigate("/products")}>
            Khám phá sản phẩm
          </button>
        </div>
      ) : (
        <div
          className="cart-layout"
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 360px",
            gap: "24px",
            padding: "20px 0 60px",
          }}
        >
          {/* Left: Cart Items List */}
          <section className="whitebox">
            <h3>Danh sách sản phẩm ({items.length})</h3>
            <div className="cart-lines">
              {items.map((item) => (
                <article className="cart-line" key={item.id} style={{ opacity: busyItem === item.id ? 0.5 : 1 }}>
                  {/* Item Image */}
                  <div className="cart-image">
                    <img
                      src={productImage({ cover_image: item.cover_image, category: item.category })}
                      alt={item.product_name}
                    />
                  </div>

                  {/* Item Info */}
                  <div>
                    <strong>{item.product_name}</strong>
                    <div style={{ color: "#7c8ba1", fontSize: "12px", margin: "3px 0" }}>
                      SKU: {item.sku}
                    </div>
                    <div className="price">{money(item.unit_price)}</div>
                  </div>

                  {/* Quantity & Remove Button */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "8px" }}>
                    <div className="qty" style={{ display: "inline-flex", border: "1px solid #d5e0f0", borderRadius: "8px", overflow: "hidden" }}>
                      <button
                        type="button"
                        style={{ border: 0, padding: "4px 10px", background: "#eff4fb", cursor: "pointer" }}
                        disabled={item.quantity <= 1 || busyItem === item.id}
                        onClick={() => handleUpdateQuantity(item, item.quantity - 1)}
                      >
                        −
                      </button>
                      <span style={{ padding: "4px 12px", minWidth: "30px", textAlign: "center", fontVariantNumeric: "tabular-nums" }}>
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        style={{ border: 0, padding: "4px 10px", background: "#eff4fb", cursor: "pointer" }}
                        disabled={busyItem === item.id}
                        onClick={() => handleUpdateQuantity(item, item.quantity + 1)}
                      >
                        ＋
                      </button>
                    </div>

                    <div style={{ fontWeight: 700, fontSize: "14.5px", color: "var(--price-color, #0f2347)" }}>
                      {money(item.line_total)}
                    </div>

                    <button
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
          <aside className="whitebox" style={{ height: "fit-content", position: "sticky", top: "90px" }}>
            <h3>Tóm tắt đơn hàng</h3>

            <div className="summary-row">
              <span>Tạm tính</span>
              <strong>{money(cart.subtotal)}</strong>
            </div>

            {Number(cart.discount_total || 0) > 0 && (
              <div className="summary-row" style={{ color: "#169569" }}>
                <span>Giảm giá</span>
                <strong>− {money(cart.discount_total)}</strong>
              </div>
            )}

            {/* Voucher Coupon Input Form */}
            {cart.voucher ? (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "#edf4ff", padding: "10px 14px", borderRadius: "10px", margin: "14px 0" }}>
                <div>
                  <span style={{ fontSize: "11px", color: "#617b9f", display: "block" }}>MÃ ƯU ĐÃI ĐÃ DÙNG</span>
                  <strong style={{ color: "var(--action)", letterSpacing: "1px" }}>{cart.voucher.code}</strong>
                </div>
                <button
                  type="button"
                  onClick={handleRemoveVoucher}
                  style={{ border: 0, background: "none", color: "#d43b62", fontWeight: 700, cursor: "pointer", fontSize: "12px" }}
                >
                  Gỡ mã
                </button>
              </div>
            ) : (
              <form className="coupon" onSubmit={handleApplyVoucher}>
                <input
                  className="field"
                  value={voucherCode}
                  onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                  placeholder="Mã voucher..."
                  style={{ textTransform: "uppercase" }}
                />
                <button type="submit" className="btn btn-dark" style={{ whiteSpace: "nowrap" }}>
                  Áp dụng
                </button>
              </form>
            )}

            <div className="summary-row total">
              <span>Tổng cộng</span>
              <strong>{money(cart.total)}</strong>
            </div>

            <button
              className="btn btn-violet full"
              style={{ width: "100%", marginTop: "16px", padding: "14px", fontSize: "14px" }}
              onClick={() => navigate("/checkout")}
            >
              Tiến hành thanh toán →
            </button>

            <Link
              to="/products"
              style={{ display: "block", textAlign: "center", marginTop: "14px", color: "var(--muted)", fontSize: "12px" }}
            >
              ← Tiếp tục mua sắm
            </Link>
          </aside>
        </div>
      )}
    </div>
  );
}
