import { useEffect, useState } from "react";
import { api } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox } from "../components/Feedback";

const emptyAddress = { recipient: "", phone: "", address: "", ward: "", province: "", is_default: false };

export default function AccountPage() {
  const { user, reloadUser } = useAuth();
  const [profile, setProfile] = useState({
    first_name: user?.first_name || "",
    last_name: user?.last_name || "",
    phone: user?.phone || "",
  });
  const [addresses, setAddresses] = useState([]);
  const [address, setAddress] = useState(emptyAddress);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(null);

  const loadAddresses = () =>
    api.get("/accounts/me/addresses/").then((data) => setAddresses(data.results || [])).catch(setError);

  useEffect(loadAddresses, []);

  const updateProfile = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.patch("/accounts/me/", profile);
      await reloadUser();
      setMessage("Đã cập nhật hồ sơ.");
    } catch (e) { setError(e); }
  };

  const addAddress = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      await api.post("/accounts/me/addresses/", address);
      setAddress(emptyAddress);
      setMessage("Đã thêm địa chỉ.");
      loadAddresses();
    } catch (e) { setError(e); }
  };

  const removeAddress = async (id) => {
    try { await api.delete(`/accounts/me/addresses/${id}/`); loadAddresses(); }
    catch (e) { setError(e); }
  };

  const setDefault = async (id) => {
    try { await api.patch(`/accounts/me/addresses/${id}/`, { is_default: true }); loadAddresses(); }
    catch (e) { setError(e); }
  };

  return (
    <div className="page-container">
      <header className="page-heading compact">
        <span className="eyebrow">MY NEXA</span>
        <h1>Tài khoản của bạn.</h1>
        <p>{user?.email}</p>
      </header>

      {error && <ErrorBox error={error} />}
      {message && <p className="success-message">✔ {message}</p>}

      <div className="account-grid">
        {/* Profile form */}
        <form className="panel-card" onSubmit={updateProfile}>
          <h2>Hồ sơ</h2>
          <div className="form-row">
            <label>
              Họ
              <input value={profile.last_name} onChange={(e) => setProfile({ ...profile, last_name: e.target.value })} />
            </label>
            <label>
              Tên
              <input value={profile.first_name} onChange={(e) => setProfile({ ...profile, first_name: e.target.value })} />
            </label>
          </div>
          <label>
            Số điện thoại
            <input value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} />
          </label>
          <button className="btn btn-primary">Lưu hồ sơ</button>
        </form>

        {/* Add address form */}
        <form className="panel-card" onSubmit={addAddress}>
          <h2>Thêm địa chỉ</h2>
          <div className="form-row">
            <label>
              Người nhận
              <input required value={address.recipient} onChange={(e) => setAddress({ ...address, recipient: e.target.value })} />
            </label>
            <label>
              Điện thoại
              <input required value={address.phone} onChange={(e) => setAddress({ ...address, phone: e.target.value })} />
            </label>
          </div>
          <label>
            Địa chỉ
            <input required value={address.address} onChange={(e) => setAddress({ ...address, address: e.target.value })} />
          </label>
          <div className="form-row">
            <label>
              Phường/Xã
              <input required value={address.ward} onChange={(e) => setAddress({ ...address, ward: e.target.value })} />
            </label>
            <label>
              Tỉnh/Thành
              <input required value={address.province} onChange={(e) => setAddress({ ...address, province: e.target.value })} />
            </label>
          </div>
          <label className="checkbox-label">
            <input type="checkbox" checked={address.is_default} onChange={(e) => setAddress({ ...address, is_default: e.target.checked })} />
            Đặt làm mặc định
          </label>
          <button className="btn btn-primary">Thêm địa chỉ</button>
        </form>
      </div>

      {/* Saved addresses */}
      <section className="address-section">
        <h2>Địa chỉ đã lưu</h2>
        <div className="address-grid">
          {addresses.map((item) => (
            <article className="address-card" key={item.id}>
              <div>
                <strong>{item.recipient}</strong>
                {item.is_default && <span>Mặc định</span>}
              </div>
              <p>{item.phone}</p>
              <p>{item.address}, {item.ward}, {item.province}</p>
              <div style={{ display: "flex", gap: "8px", marginTop: "12px" }}>
                {!item.is_default && (
                  <button onClick={() => setDefault(item.id)}>Đặt mặc định</button>
                )}
                <button onClick={() => removeAddress(item.id)}>Xóa</button>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
