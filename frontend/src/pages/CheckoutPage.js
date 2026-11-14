import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import { authService, cartService, orderService } from "../api/client";
import { fallbackProductImage, money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { Empty, ErrorBox, Loading, Toast } from "../components/Feedback";

function generateCheckoutUUID() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CheckoutPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { refreshCartCount } = outlet;

  // Checkout Key UUID for idempotency
  const checkoutKeyRef = useRef(generateCheckoutUUID());

  // Data States
  const [cart, setCart] = useState(null);
  const [addresses, setAddresses] = useState([]);
  const [shippingMethods, setShippingMethods] = useState([]);
  const [selectedAddressId, setSelectedAddressId] = useState("");
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);

  // Add Address Form Modal / Inline State
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [newAddress, setNewAddress] = useState({
    recipient: "",
    phone: "",
    address: "",
    ward: "",
    province: "",
    is_default: true,
  });

  // Flow & Feedback States
  const [loading, setLoading] = useState(true);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Load Cart, Addresses, Shipping Methods
  const initCheckout = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cartData, addressData, methodData] = await Promise.all([
        cartService.getCart(),
        authService.getAddresses(),
        orderService.getShippingMethods(),
      ]);

      if (!cartData.items || cartData.items.length === 0) {
        navigate("/cart");
        return;
      }

      setCart(cartData);

      const addrList = addressData.results || addressData || [];
      setAddresses(addrList);
      const defaultAddr = addrList.find((a) => a.is_default) || addrList[0];
      if (defaultAddr) setSelectedAddressId(String(defaultAddr.id));

      const methods = methodData.results || methodData || [];
      setShippingMethods(methods);
      if (methods.length > 0) setSelectedMethodId(String(methods[0].id));
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/checkout" } } });
      return;
    }
    initCheckout();
  }, [user, navigate, initCheckout]);

  // Call Checkout Preview whenever address or shipping method changes
  useEffect(() => {
    if (!selectedAddressId || !selectedMethodId) return;

    let isMounted = true;
    setPreviewLoading(true);

    orderService.checkoutPreview({
      address_id: Number(selectedAddressId),
      shipping_method_id: Number(selectedMethodId),
      note: "",
    })
      .then((data) => {
        if (isMounted) setPreview(data);
      })
      .catch((err) => {
        if (isMounted) setError(err);
      })
      .finally(() => {
        if (isMounted) setPreviewLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedAddressId, selectedMethodId]);

  // Handle Create Address
  const handleCreateAddress = async (e) => {
    e.preventDefault();
    try {
      const created = await authService.addAddress(newAddress);
      setAddresses((prev) => [created, ...prev]);
      setSelectedAddressId(String(created.id));
      setShowAddAddress(false);
      setNewAddress({ recipient: "", phone: "", address: "", ward: "", province: "", is_default: false });
      setToastMsg("Đã thêm địa chỉ giao hàng mới.");
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm địa chỉ.");
    }
  };

  // Handle Place Order
  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!selectedAddressId) {
      setToastMsg("Vui lòng chọn hoặc thêm địa chỉ nhận hàng.");
      return;
    }
    if (!selectedMethodId) {
      setToastMsg("Vui lòng chọn phương thức vận chuyển.");
      return;
    }

    setPlacingOrder(true);
    setError(null);

    try {
      const order = await orderService.createOrder({
        address_id: Number(selectedAddressId),
        shipping_method_id: Number(selectedMethodId),
        note: note.trim(),
        checkout_key: checkoutKeyRef.current,
      });

      // Order created successfully!
      if (refreshCartCount) refreshCartCount();
      navigate(`/orders/success?order_id=${order.public_id || order.id}&order_number=${order.order_number}`);
    } catch (err) {
      if (err.status === 409) {
        // Idempotency conflict: regenerate checkout key for retry
        checkoutKeyRef.current = generateCheckoutUUID();
        setError(new Error("Yêu cầu bị xung đột hoặc đã được gửi. Đã tạo mã phiên mới, vui lòng nhấn Đặt hàng lại."));
      } else {
        setError(err);
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <div className="container" style={{ padding: "50px 0" }}>
        <Loading label="Đang chuẩn bị trang thanh toán..." />
      </div>
    );
  }

  const items = cart?.items || [];

  return (
    <div className="container" style={{ paddingBottom: "60px" }}>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Breadcrumb */}
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › <Link to="/cart">Giỏ hàng</Link> › Thanh toán
      </div>

      <h1 className="page-title">Hoàn tất đơn hàng</h1>

      {/* Checkout steps header */}
      <nav className="checkout-steps" aria-label="Tiến trình thanh toán">
        <span className="current">
          <b>1</b> Thông tin nhận hàng
        </span>
        <i />
        <span className="current">
          <b>2</b> Vận chuyển
        </span>
        <i />
        <span className="current">
          <b>3</b> Thanh toán
        </span>
      </nav>

      {error && <ErrorBox error={error} variant="inline" />}

      <div
        className="checkout-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 380px",
          gap: "24px",
          alignItems: "start",
        }}
      >
        {/* Left Form Column */}
        <form onSubmit={handlePlaceOrder}>
          {/* Step 1: Delivery Address */}
          <section className="whitebox" style={{ marginBottom: "20px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
              <h3 style={{ margin: 0 }}>1. Địa chỉ nhận hàng</h3>
              <button
                type="button"
                className="btn btn-quiet"
                style={{ fontSize: "11.5px", padding: "6px 10px" }}
                onClick={() => setShowAddAddress(!showAddAddress)}
              >
                {showAddAddress ? "Đóng" : "＋ Thêm địa chỉ mới"}
              </button>
            </div>

            {/* Inline Add Address Form */}
            {showAddAddress && (
              <div className="nexa-inline-subpanel" style={{ borderRadius: "12px", padding: "16px", marginBottom: "16px" }}>
                <h4 style={{ margin: "0 0 12px" }}>Thêm địa chỉ giao hàng</h4>
                <div className="form-grid">
                  <div>
                    <label className="field-label">Họ tên người nhận</label>
                    <input
                      className="field"
                      required
                      value={newAddress.recipient}
                      onChange={(e) => setNewAddress({ ...newAddress, recipient: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Số điện thoại</label>
                    <input
                      className="field"
                      required
                      value={newAddress.phone}
                      onChange={(e) => setNewAddress({ ...newAddress, phone: e.target.value })}
                    />
                  </div>
                </div>
                <label className="field-label">Địa chỉ (số nhà, tên đường)</label>
                <input
                  className="field"
                  required
                  value={newAddress.address}
                  onChange={(e) => setNewAddress({ ...newAddress, address: e.target.value })}
                />
                <div className="form-grid">
                  <div>
                    <label className="field-label">Phường / Xã</label>
                    <input
                      className="field"
                      required
                      value={newAddress.ward}
                      onChange={(e) => setNewAddress({ ...newAddress, ward: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="field-label">Tỉnh / Thành phố</label>
                    <input
                      className="field"
                      required
                      value={newAddress.province}
                      onChange={(e) => setNewAddress({ ...newAddress, province: e.target.value })}
                    />
                  </div>
                </div>
                <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                  <button type="button" className="btn btn-primary" onClick={handleCreateAddress}>
                    Lưu địa chỉ
                  </button>
                  <button type="button" className="btn btn-quiet" onClick={() => setShowAddAddress(false)}>
                    Hủy
                  </button>
                </div>
              </div>
            )}

            {/* Address Selection List */}
            {addresses.length === 0 ? (
              <Empty
                title="Chưa có địa chỉ nào"
                text="Vui lòng bấm 'Thêm địa chỉ mới' ở trên để nhập thông tin giao nhận."
              />
            ) : (
              <div className="address-options">
                {addresses.map((addr) => (
                  <label className="radio-card" key={addr.id}>
                    <div style={{ display: "flex", gap: "10px", alignItems: "flex-start" }}>
                      <input
                        type="radio"
                        name="delivery_address"
                        value={addr.id}
                        checked={String(selectedAddressId) === String(addr.id)}
                        onChange={(e) => setSelectedAddressId(e.target.value)}
                      />
                      <div>
                        <strong>{addr.recipient} · {addr.phone}</strong>
                        <div style={{ color: "#6e7f98", fontSize: "12px", marginTop: "2px" }}>
                          {addr.address}, {addr.ward}, {addr.province}
                        </div>
                        {addr.is_default && (
                          <span style={{ display: "inline-block", background: "#eaf2ff", color: "var(--action)", fontSize: "10px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", marginTop: "4px" }}>
                            Mặc định
                          </span>
                        )}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            )}
          </section>

          {/* Step 2: Shipping Methods */}
          <section className="whitebox" style={{ marginBottom: "20px" }}>
            <h3>2. Phương thức vận chuyển</h3>
            {shippingMethods.map((m) => (
              <label className="radio-card" key={m.id}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <input
                    type="radio"
                    name="shipping_method"
                    value={m.id}
                    checked={String(selectedMethodId) === String(m.id)}
                    onChange={(e) => setSelectedMethodId(e.target.value)}
                  />
                  <div>
                    <strong>{m.name}</strong>
                    <div style={{ color: "#6e7f98", fontSize: "11.5px" }}>
                      Dự kiến giao hàng trong {m.min_days}–{m.max_days} ngày làm việc
                    </div>
                  </div>
                </div>
                <strong style={{ color: "var(--action)" }}>{money(m.base_fee)}</strong>
              </label>
            ))}
          </section>

          {/* Step 3: Payment Method & Notes */}
          <section className="whitebox" style={{ marginBottom: "20px" }}>
            <h3>3. Phương thức thanh toán</h3>
            <label className="radio-card">
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <input type="radio" name="payment_method" value="cod" defaultChecked />
                <div>
                  <strong>Thanh toán khi nhận hàng (COD)</strong>
                  <div style={{ color: "#6e7f98", fontSize: "11.5px" }}>
                    Nhận hàng kiểm tra thiết bị rồi mới thanh toán tiền mặt
                  </div>
                </div>
              </div>
              <span className="demo-pill">HỖ TRỢ CHÍNH THỨC</span>
            </label>

            <label className="field-label" htmlFor="order-note" style={{ marginTop: "16px" }}>
              Ghi chú cho đơn hàng (tùy chọn)
            </label>
            <textarea
              id="order-note"
              className="field"
              rows="3"
              maxLength={500}
              placeholder="Ghi chú thêm cho shipper (ví dụ: giao vào giờ hành chính, gọi trước khi đến...)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </section>
        </form>

        {/* Right Sidebar Column: Order Summary & Place Order */}
        <aside className="whitebox" style={{ position: "sticky", top: "90px" }}>
          <h3>Đơn hàng của bạn</h3>

          {/* Cart items list */}
          <div style={{ maxHeight: "240px", overflowY: "auto", borderBottom: "1px solid #e6ecf5", paddingBottom: "12px" }}>
            {items.map((item) => (
              <div key={item.id} style={{ display: "flex", gap: "10px", alignItems: "center", padding: "8px 0" }}>
                <div className="cart-image" style={{ width: "52px", height: "46px", flexShrink: 0 }}>
                  <img
                    src={productImage(item)}
                    alt={item.product_name}
                    onError={(e) => {
                      e.currentTarget.onerror = null;
                      e.currentTarget.src = fallbackProductImage(item);
                    }}
                  />
                </div>
                <div style={{ flex: 1, minWidth: 0, fontSize: "12px" }}>
                  <b style={{ display: "block", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                    {item.product_name}
                  </b>
                  <span style={{ color: "#7c8ba1" }}>SL: {item.quantity}</span>
                </div>
                <strong style={{ fontSize: "12.5px" }}>{money(item.line_total)}</strong>
              </div>
            ))}
          </div>

          {/* Price Breakdown from Checkout Preview API */}
          {previewLoading ? (
            <div style={{ padding: "16px 0", textAlign: "center" }}>
              <div className="spinner" style={{ margin: "0 auto 6px" }} />
              <small style={{ color: "var(--muted)" }}>Đang tính phí vận chuyển và giảm giá...</small>
            </div>
          ) : preview ? (
            <div style={{ marginTop: "14px" }}>
              <div className="summary-row">
                <span>Tạm tính</span>
                <strong>{money(preview.subtotal)}</strong>
              </div>
              <div className="summary-row">
                <span>Phí vận chuyển</span>
                <strong>{money(preview.shipping_fee)}</strong>
              </div>
              {Number(preview.shipping_discount || 0) > 0 && (
                <div className="summary-row" style={{ color: "#169569" }}>
                  <span>Miễn phí vận chuyển</span>
                  <strong>− {money(preview.shipping_discount)}</strong>
                </div>
              )}
              {Number(preview.discount_total || 0) > 0 && (
                <div className="summary-row" style={{ color: "#169569" }}>
                  <span>Giảm giá voucher</span>
                  <strong>− {money(preview.discount_total)}</strong>
                </div>
              )}
              <div className="summary-row total">
                <span>Tổng thanh toán</span>
                <strong>{money(preview.grand_total || preview.total)}</strong>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: "14px" }}>
              <div className="summary-row">
                <span>Tạm tính</span>
                <strong>{money(cart.subtotal)}</strong>
              </div>
              <div className="summary-row total">
                <span>Tổng cộng</span>
                <strong>{money(cart.total)}</strong>
              </div>
            </div>
          )}

          <button
            type="button"
            className="btn btn-violet full"
            style={{ width: "100%", marginTop: "20px", padding: "15px", fontSize: "14px" }}
            disabled={placingOrder || !selectedAddressId || !selectedMethodId || previewLoading}
            onClick={handlePlaceOrder}
          >
            {placingOrder ? "Đang xử lý đặt hàng..." : `Đặt hàng · ${money(preview?.grand_total || cart.total)} ↗`}
          </button>

          <p style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", marginTop: "12px", lineHeight: "1.4" }}>
            Bằng việc nhấn đặt hàng, bạn đồng ý với Điều khoản mua sắm và Chính sách vận chuyển của NEXA.
          </p>
        </aside>
      </div>
    </div>
  );
}
