import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import { money } from "../api/format";
import { Empty, ErrorBox, Loading } from "../components/Feedback";

export default function CheckoutPage() {
  const navigate = useNavigate();
  const [addresses, setAddresses] = useState([]);
  const [methods, setMethods] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [methodId, setMethodId] = useState("");
  const [note, setNote] = useState("");
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([api.get("/accounts/me/addresses/"), api.get("/shipping-methods/")])
      .then(([addrData, methodData]) => {
        const a = addrData.results || [];
        const m = methodData.results || [];
        setAddresses(a);
        setMethods(m);
        setAddressId(String(a.find((x) => x.is_default)?.id || a[0]?.id || ""));
        setMethodId(String(m[0]?.id || ""));
      }).catch(setError);
  }, []);

  useEffect(() => {
    if (!addressId || !methodId) return;
    api.post("/checkout/preview/", {
      address_id: Number(addressId),
      shipping_method_id: Number(methodId),
      note,
    }).then(setPreview).catch(setError);
  }, [addressId, methodId, note]);

  const placeOrder = async () => {
    setBusy(true);
    setError(null);
    try {
      const order = await api.post("/orders/", {
        address_id: Number(addressId),
        shipping_method_id: Number(methodId),
        note,
        checkout_key: crypto.randomUUID(),
      });
      navigate(`/orders/${order.public_id}`, { replace: true });
    } catch (e) { setError(e); }
    finally { setBusy(false); }
  };

  if (!addresses.length && !error) return <Loading />;

  return (
    <div className="page-container">
      <header className="page-heading compact">
        <span className="eyebrow">CHECKOUT</span>
        <h1>Hoàn tất đơn hàng.</h1>
      </header>

      {error && <ErrorBox error={error} />}

      {addresses.length === 0 ? (
        <Empty
          title="Chưa có địa chỉ giao hàng"
          text="Vào trang tài khoản để thêm địa chỉ trước khi thanh toán."
        />
      ) : (
        <div className="checkout-layout">
          <section className="checkout-form">
            <h2>1. Địa chỉ nhận hàng</h2>
            {addresses.map((addr) => (
              <label
                key={addr.id}
                className={String(addr.id) === addressId ? "option-card selected" : "option-card"}
              >
                <input
                  type="radio"
                  name="address"
                  value={addr.id}
                  checked={String(addr.id) === addressId}
                  onChange={(e) => setAddressId(e.target.value)}
                />
                <span>
                  <strong>{addr.recipient} · {addr.phone}</strong>
                  <small>{addr.address}, {addr.ward}, {addr.province}</small>
                </span>
              </label>
            ))}

            <h2>2. Phương thức giao hàng</h2>
            {methods.map((method) => (
              <label
                key={method.id}
                className={String(method.id) === methodId ? "option-card selected" : "option-card"}
              >
                <input
                  type="radio"
                  name="method"
                  value={method.id}
                  checked={String(method.id) === methodId}
                  onChange={(e) => setMethodId(e.target.value)}
                />
                <span>
                  <strong>{method.name} · {money(method.base_fee)}</strong>
                  <small>Dự kiến {method.min_days}–{method.max_days} ngày</small>
                </span>
              </label>
            ))}

            <label className="field-label">
              Ghi chú
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                placeholder="Lưu ý cho đơn vị giao hàng..."
              />
            </label>
          </section>

          <aside className="summary-card">
            <h2>Thông tin thanh toán</h2>
            {preview ? (
              <>
                {Object.entries(preview)
                  .filter(([, v]) => typeof v === "number" || /^\d+(\.\d+)?$/.test(String(v)))
                  .map(([key, value]) => (
                    <div key={key}>
                      <span>{key.replaceAll("_", " ")}</span>
                      <strong>{money(value)}</strong>
                    </div>
                  ))
                }
              </>
            ) : (
              <Loading label="Đang tính phí..." />
            )}
            <button
              className="btn btn-primary full-button"
              disabled={busy || !preview}
              onClick={placeOrder}
            >
              {busy ? "Đang tạo đơn..." : "Đặt hàng"}
            </button>
            <small>Bằng việc đặt hàng, bạn xác nhận thông tin giao nhận là chính xác.</small>
          </aside>
        </div>
      )}
    </div>
  );
}
