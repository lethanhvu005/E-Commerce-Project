import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { authService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

export default function AccountPage() {
  const { user, reloadUser, logout } = useAuth();
  const navigate = useNavigate();

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    first_name: "",
    last_name: "",
    phone: "",
  });

  // Addresses State
  const [addresses, setAddresses] = useState([]);
  const [loadingAddr, setLoadingAddr] = useState(true);
  const [showAddAddress, setShowAddAddress] = useState(false);
  const [addressForm, setAddressForm] = useState({
    recipient: "",
    phone: "",
    address: "",
    ward: "",
    province: "",
    is_default: false,
  });

  // Status & Feedback
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Sync profileForm with user data
  useEffect(() => {
    if (user) {
      setProfileForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  // Load Addresses
  const loadAddresses = async () => {
    setLoadingAddr(true);
    try {
      const data = await authService.getAddresses();
      setAddresses(data.results || data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingAddr(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/account" } } });
      return;
    }
    loadAddresses();
  }, [user, navigate]);

  // Handle Profile Update
  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authService.updateProfile({
        first_name: profileForm.first_name.trim(),
        last_name: profileForm.last_name.trim(),
        phone: profileForm.phone.trim(),
      });
      await reloadUser();
      setEditingProfile(false);
      setToastMsg("Đã cập nhật thông tin hồ sơ thành công!");
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  // Handle Add Address
  const handleAddAddress = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await authService.addAddress(addressForm);
      setAddressForm({ recipient: "", phone: "", address: "", ward: "", province: "", is_default: false });
      setShowAddAddress(false);
      setToastMsg("Đã lưu địa chỉ mới.");
      loadAddresses();
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  };

  // Handle Delete Address
  const handleDeleteAddress = async (id) => {
    try {
      await authService.deleteAddress(id);
      setToastMsg("Đã xóa địa chỉ.");
      loadAddresses();
    } catch (err) {
      setToastMsg(err.message || "Không thể xóa địa chỉ.");
    }
  };

  // Handle Set Default Address
  const handleSetDefaultAddress = async (addr) => {
    try {
      await authService.updateAddress(addr.id, { is_default: true });
      setToastMsg("Đã đặt làm địa chỉ mặc định.");
      loadAddresses();
    } catch (err) {
      setToastMsg(err.message || "Không thể đặt làm mặc định.");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="container" style={{ padding: "50px 0" }}>
        <Loading label="Đang kiểm tra thông tin tài khoản..." />
      </div>
    );
  }

  const displayName = [user.last_name, user.first_name].filter(Boolean).join(" ") || user.email.split("@")[0];
  const avatarLetter = (user.first_name?.[0] || user.last_name?.[0] || user.email?.[0] || "N").toUpperCase();

  return (
    <div className="container ux-page">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Hero Header matching profile.html */}
      <section className="ux-hero">
        <div>
          <span className="ux-kicker">ACCOUNT / PROFILE</span>
          <h1>Không gian <em>của bạn.</em></h1>
          <p>Quản lý thông tin cá nhân, đơn hàng và danh sách yêu thích.</p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">N</span>
      </section>

      {error && <ErrorBox error={error} />}

      {/* Two Column Section matching profile.html */}
      <div className="ux-two">
        {/* Left Card: Account Profile */}
        <div className="ux-card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <h2 style={{ margin: 0 }}>Thông tin tài khoản</h2>
            <button
              className="btn btn-quiet"
              style={{ fontSize: "12px", padding: "6px 12px" }}
              onClick={() => setEditingProfile(!editingProfile)}
            >
              {editingProfile ? "Hủy sửa" : "Chỉnh sửa hồ sơ"}
            </button>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "20px" }}>
            <div
              style={{
                width: "56px",
                height: "56px",
                borderRadius: "50%",
                background: "var(--action)",
                color: "#fff",
                fontSize: "24px",
                fontWeight: 800,
                display: "grid",
                placeItems: "center",
              }}
            >
              {avatarLetter}
            </div>
            <div>
              <strong style={{ fontSize: "18px", color: "var(--ink)", display: "block" }}>{displayName}</strong>
              <span style={{ color: "var(--muted)", fontSize: "13px" }}>{user.email}</span>
            </div>
          </div>

          {editingProfile ? (
            <form onSubmit={handleUpdateProfile}>
              <div className="form-grid">
                <div>
                  <label htmlFor="p-last">Họ</label>
                  <input
                    id="p-last"
                    className="field"
                    value={profileForm.last_name}
                    onChange={(e) => setProfileForm({ ...profileForm, last_name: e.target.value })}
                  />
                </div>
                <div>
                  <label htmlFor="p-first">Tên</label>
                  <input
                    id="p-first"
                    className="field"
                    value={profileForm.first_name}
                    onChange={(e) => setProfileForm({ ...profileForm, first_name: e.target.value })}
                  />
                </div>
              </div>

              <label htmlFor="p-phone">Số điện thoại</label>
              <input
                id="p-phone"
                className="field"
                value={profileForm.phone}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                placeholder="0901234567"
              />

              <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
                <button type="submit" className="btn btn-primary" disabled={busy}>
                  {busy ? "Đang lưu..." : "Lưu thay đổi"}
                </button>
                <button type="button" className="btn btn-quiet" onClick={() => setEditingProfile(false)}>
                  Hủy
                </button>
              </div>
            </form>
          ) : (
            <div style={{ borderTop: "1px solid #e8edf3", paddingTop: "14px" }}>
              <div style={{ padding: "8px 0" }}>
                <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>HỌ VÀ TÊN</small>
                <strong>{displayName}</strong>
              </div>
              <div style={{ padding: "8px 0" }}>
                <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>ĐỊA CHỈ EMAIL</small>
                <strong>{user.email}</strong>
              </div>
              <div style={{ padding: "8px 0" }}>
                <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>SỐ ĐIỆN THOẠI</small>
                <strong>{user.phone || "Chưa cập nhật"}</strong>
              </div>
              <div style={{ padding: "8px 0" }}>
                <small style={{ color: "var(--muted)", display: "block", fontSize: "11px" }}>NGÀY THAM GIA</small>
                <span>{new Date(user.date_joined).toLocaleDateString("vi-VN")}</span>
              </div>

              <button
                type="button"
                className="btn btn-quiet"
                style={{ marginTop: "18px", color: "#d43b62" }}
                onClick={handleLogout}
              >
                Đăng xuất tài khoản
              </button>
            </div>
          )}
        </div>

        {/* Right Card: Quick Navigation Links matching profile.html */}
        <div className="ux-card">
          <h2>Truy cập nhanh</h2>
          <div className="ux-action-list" style={{ display: "grid", gap: "12px", marginTop: "16px" }}>
            <Link
              to="/orders"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--edge)", borderRadius: "10px", fontWeight: 600 }}
            >
              <span>▱ Theo dõi đơn hàng</span>
              <b>↗</b>
            </Link>
            <Link
              to="/wishlist"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--edge)", borderRadius: "10px", fontWeight: 600 }}
            >
              <span>♡ Danh sách yêu thích</span>
              <b>↗</b>
            </Link>
            <Link
              to="/vouchers"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--edge)", borderRadius: "10px", fontWeight: 600 }}
            >
              <span>◈ Kho voucher ưu đãi</span>
              <b>↗</b>
            </Link>
            <Link
              to="/reviews"
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "var(--bg2)", border: "1px solid var(--edge)", borderRadius: "10px", fontWeight: 600 }}
            >
              <span>★ Đánh giá của cộng đồng</span>
              <b>↗</b>
            </Link>
            {user?.is_staff && (
              <Link
                to="/admin/inventory"
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 18px", background: "#edf4ff", border: "1px solid #1558c933", color: "var(--action)", borderRadius: "10px", fontWeight: 700 }}
              >
                <span>⚡ Quản trị kho (Staff Portal)</span>
                <b>↗</b>
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Address Book Section */}
      <section className="ux-card" style={{ marginTop: "24px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0 }}>Sổ địa chỉ nhận hàng ({addresses.length})</h2>
          <button
            className="btn btn-primary"
            style={{ fontSize: "12px", padding: "8px 14px" }}
            onClick={() => setShowAddAddress(!showAddAddress)}
          >
            {showAddAddress ? "Đóng form" : "＋ Thêm địa chỉ mới"}
          </button>
        </div>

        {/* Add Address Form */}
        {showAddAddress && (
          <form onSubmit={handleAddAddress} style={{ background: "var(--bg2)", border: "1px solid var(--edge)", borderRadius: "12px", padding: "20px", marginBottom: "20px" }}>
            <h3 style={{ margin: "0 0 14px" }}>Thêm địa chỉ giao nhận</h3>
            <div className="form-grid">
              <div>
                <label className="field-label">Người nhận</label>
                <input
                  className="field"
                  required
                  value={addressForm.recipient}
                  onChange={(e) => setAddressForm({ ...addressForm, recipient: e.target.value })}
                  placeholder="Nguyễn Văn An"
                />
              </div>
              <div>
                <label className="field-label">Số điện thoại</label>
                <input
                  className="field"
                  required
                  value={addressForm.phone}
                  onChange={(e) => setAddressForm({ ...addressForm, phone: e.target.value })}
                  placeholder="0901234567"
                />
              </div>
            </div>

            <label className="field-label">Địa chỉ (số nhà, tên đường)</label>
            <input
              className="field"
              required
              value={addressForm.address}
              onChange={(e) => setAddressForm({ ...addressForm, address: e.target.value })}
              placeholder="123 Lê Lợi..."
            />

            <div className="form-grid">
              <div>
                <label className="field-label">Phường / Xã</label>
                <input
                  className="field"
                  required
                  value={addressForm.ward}
                  onChange={(e) => setAddressForm({ ...addressForm, ward: e.target.value })}
                  placeholder="Hải Châu"
                />
              </div>
              <div>
                <label className="field-label">Tỉnh / Thành phố</label>
                <input
                  className="field"
                  required
                  value={addressForm.province}
                  onChange={(e) => setAddressForm({ ...addressForm, province: e.target.value })}
                  placeholder="Đà Nẵng"
                />
              </div>
            </div>

            <label className="ux-check" style={{ marginTop: "14px", display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={addressForm.is_default}
                onChange={(e) => setAddressForm({ ...addressForm, is_default: e.target.checked })}
              />
              Đặt làm địa chỉ giao hàng mặc định
            </label>

            <div style={{ marginTop: "16px", display: "flex", gap: "10px" }}>
              <button type="submit" className="btn btn-violet" disabled={busy}>
                {busy ? "Đang lưu..." : "Lưu địa chỉ"}
              </button>
              <button type="button" className="btn btn-quiet" onClick={() => setShowAddAddress(false)}>
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* Address Cards List */}
        {loadingAddr ? (
          <Loading label="Đang tải danh sách địa chỉ..." />
        ) : addresses.length === 0 ? (
          <p style={{ color: "var(--muted)" }}>Chưa có địa chỉ nào được lưu. Hãy thêm địa chỉ để thanh toán nhanh chóng hơn!</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
            {addresses.map((addr) => (
              <div
                key={addr.id}
                style={{
                  border: "1px solid var(--edge)",
                  borderRadius: "12px",
                  padding: "16px",
                  background: addr.is_default ? "var(--bg2)" : "transparent",
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <strong>{addr.recipient}</strong>
                  {addr.is_default && (
                    <span style={{ background: "#eaf2ff", color: "var(--action)", fontSize: "10px", fontWeight: 700, padding: "2px 8px", borderRadius: "10px" }}>
                      Mặc định
                    </span>
                  )}
                </div>
                <div style={{ color: "var(--muted)", fontSize: "12px", margin: "4px 0" }}>{addr.phone}</div>
                <div style={{ color: "var(--ink)", fontSize: "13px" }}>
                  {addr.address}, {addr.ward}, {addr.province}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "12px", borderTop: "1px solid #edf1f7", paddingTop: "10px" }}>
                  {!addr.is_default && (
                    <button
                      type="button"
                      onClick={() => handleSetDefaultAddress(addr)}
                      style={{ border: 0, background: "none", color: "var(--action)", fontSize: "12px", cursor: "pointer", padding: 0 }}
                    >
                      Đặt mặc định
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(addr.id)}
                    style={{ border: 0, background: "none", color: "#d43b62", fontSize: "12px", cursor: "pointer", padding: 0 }}
                  >
                    Xóa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
