import { useEffect, useState } from "react";
import { Link, useOutletContext } from "react-router-dom";
import { api } from "../api/client";
import { money, productImage } from "../api/format";
import { Empty, ErrorBox, Loading } from "../components/Feedback";

export default function CartPage() {
  const outlet = useOutletContext();
  const [cart, setCart] = useState(null);
  const [voucher, setVoucher] = useState("");
  const [error, setError] = useState(null);

  const load = () => api.get("/cart/").then(setCart).catch(setError);
  useEffect(load, []);

  const syncCount = (next) => outlet?.setCartCount(next.items?.reduce((s, i) => s + i.quantity, 0) || 0);

  const updateQuantity = async (item, quantity) => {
    try { const next = await api.patch(`/cart/items/${item.id}/`, { quantity }); setCart(next); syncCount(next); }
    catch (e) { setError(e); }
  };

  const remove = async (item) => {
    try { const next = await api.delete(`/cart/items/${item.id}/`); setCart(next); syncCount(next); }
    catch (e) { setError(e); }
  };

  const applyVoucher = async (e) => {
    e.preventDefault();
    try { const next = await api.post("/cart/voucher/", { code: voucher }); setCart(next); }
    catch (e) { setError(e); }
  };

  if (!cart && !error) return <Loading />;

  return (
    <div className="page-container">
      <header className="page-heading compact">
        <span className="eyebrow">GIỎ HÀNG</span>
        <h1>Những món bạn đã chọn.</h1>
      </header>

      {error && <ErrorBox error={error} />}

      {cart && !cart.items?.length ? (
        <Empty title="Giỏ hàng đang trống" text="Khám phá catalog và chọn gear phù hợp với bạn." />
      ) : cart && (
        <div className="cart-layout">
          {/* Cart items */}
          <div className="cart-items">
            {cart.items.map((item) => (
              <article className="cart-item" key={item.id}>
                <div className="cart-item-icon">
                  {item.cover_image
                    ? <img src={productImage({ cover_image: item.cover_image, category: item.category })} alt={item.product_name}/>
                    : <span>N</span>
                  }
                </div>
                <div>
                  <h3>{item.product_name}</h3>
                  <span>{item.sku}</span>
                  <strong>{money(item.unit_price)}</strong>
                </div>
                <div className="quantity">
                  <button disabled={item.quantity <= 1} onClick={() => updateQuantity(item, item.quantity - 1)}>−</button>
                  <span>{item.quantity}</span>
                  <button onClick={() => updateQuantity(item, item.quantity + 1)}>＋</button>
                </div>
                <strong>{money(item.line_total)}</strong>
                <button className="remove-button" onClick={() => remove(item)} aria-label="Xóa sản phẩm">×</button>
              </article>
            ))}
          </div>

          {/* Summary */}
          <aside className="summary-card">
            <h2>Tóm tắt đơn hàng</h2>
            <div><span>Tạm tính</span><strong>{money(cart.subtotal)}</strong></div>
            <div><span>Giảm giá</span><strong>− {money(cart.discount_total)}</strong></div>
            <form className="voucher-form" onSubmit={applyVoucher}>
              <input value={voucher} onChange={(e) => setVoucher(e.target.value)} placeholder="Mã ưu đãi" />
              <button type="submit">Áp dụng</button>
            </form>
            <div className="summary-total">
              <span>Tổng cộng</span>
              <strong>{money(cart.total)}</strong>
            </div>
            <Link className="btn btn-primary full-button" to="/checkout">Tiến hành thanh toán →</Link>
            <Link className="continue-link" to="/products">← Tiếp tục mua sắm</Link>
          </aside>
        </div>
      )}
    </div>
  );
}
