import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { adminService } from "../api/client";
import { dateTime } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading, Toast } from "../components/Feedback";
import { AdminIcon } from "../components/admin/AdminIcons";

export default function AdminInventoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [adjustmentKey, setAdjustmentKey] = useState(null);
  const [adjusting, setAdjusting] = useState(false);

  const [activeTab, setActiveTab] = useState("balances");

  const loadAdminData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [balRes, movRes, audRes] = await Promise.all([
        adminService.getInventoryBalances(),
        adminService.getInventoryMovements().catch(() => ({ results: [] })),
        adminService.getAuditLogs().catch(() => ({ results: [] })),
      ]);

      setBalances(balRes.results || balRes || []);
      setMovements(movRes.results || movRes || []);
      setAuditLogs(audRes.results || audRes || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/admin/inventory" } } });
      return;
    }
    if (!user.is_staff && !user.is_superuser) {
      setError(
        new Error(
          "Tài khoản của bạn không có quyền truy cập cổng Quản trị (yêu cầu is_staff=True)."
        )
      );
      setLoading(false);
      return;
    }
    loadAdminData();
  }, [user, navigate]);

  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedVariant || Number(delta) === 0) return;
    if (!reason.trim()) {
      setToastMsg("Vui lòng nhập lý do điều chỉnh kho.");
      return;
    }

    setAdjusting(true);
    try {
      await adminService.adjustInventory({
        variant_id: selectedVariant.variant_id,
        quantity_delta: Number(delta),
        reason: reason.trim(),
        event_key: adjustmentKey,
      });
      setToastMsg(
        `Đã điều chỉnh kho cho SKU ${selectedVariant.sku} (${Number(delta) > 0 ? "+" : ""}${delta}).`
      );
      setAdjustModal(false);
      setSelectedVariant(null);
      setDelta(0);
      setReason("");
      setAdjustmentKey(null);
      loadAdminData();
    } catch (err) {
      setToastMsg(err.message || "Không thể điều chỉnh tồn kho.");
    } finally {
      setAdjusting(false);
    }
  };

  const totalOnHand = balances.reduce((sum, b) => sum + (Number(b.on_hand) || 0), 0);
  const totalReserved = balances.reduce((sum, b) => sum + (Number(b.reserved) || 0), 0);
  const totalAvailable = balances.reduce((sum, b) => sum + (Number(b.available) || 0), 0);
  const lowStockCount = balances.filter(
    (b) => b.low_stock_threshold != null && Number(b.available) <= Number(b.low_stock_threshold)
  ).length;

  const filteredBalances = balances.filter((b) =>
    !search.trim() || String(b.sku || "").toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <>
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <div className="admin-intro">
        <div>
          <h1>Quản lý tồn kho</h1>
          <p>Theo dõi số lượng tồn thực tế, tồn đang giữ và lịch sử xuất nhập kho từng SKU.</p>
        </div>
        <button className="admin-select admin-refresh-btn" onClick={loadAdminData}>
          <AdminIcon name="refresh" size={14} />
          <span>Đồng bộ dữ liệu</span>
        </button>
      </div>

      {error && <ErrorBox error={error} />}

      <div className="admin-kpis">
        <div className="kpi">
          <small>Tổng tồn thực tế (On Hand)</small>
          <strong>{totalOnHand}</strong>
          <span className="change green">Dữ liệu kiểm kê tại kho</span>
          <span className="kpi-icon green">
            <AdminIcon name="inventory" size={18} />
          </span>
        </div>

        <div className="kpi">
          <small>Tồn khả dụng (Available)</small>
          <strong>{totalAvailable}</strong>
          <span className="change">Sẵn sàng xuất bán ({balances.length} SKU)</span>
          <span className="kpi-icon">
            <AdminIcon name="products" size={18} />
          </span>
        </div>

        <div className="kpi">
          <small>Tồn đang giữ (Reserved)</small>
          <strong>{totalReserved}</strong>
          <span className="change">Đang giữ cho đơn chờ xử lý</span>
          <span className="kpi-icon">
            <AdminIcon name="orders" size={18} />
          </span>
        </div>

        <div className="kpi">
          <small>Sản phẩm sắp hết</small>
          <strong>{lowStockCount}</strong>
          <span className="change down">Dưới ngưỡng cảnh báo tồn kho</span>
          <span className="kpi-icon red">
            <AdminIcon name="alert" size={18} />
          </span>
        </div>
      </div>

      <section className="admin-panel">
        <div className="admin-tabs">
          <button
            type="button"
            className={`admin-tab${activeTab === "balances" ? " active" : ""}`}
            onClick={() => setActiveTab("balances")}
          >
            Danh sách tồn kho theo SKU ({balances.length})
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "movements" ? " active" : ""}`}
            onClick={() => setActiveTab("movements")}
          >
            Lịch sử biến động kho ({movements.length})
          </button>
          <button
            type="button"
            className={`admin-tab${activeTab === "audit" ? " active" : ""}`}
            onClick={() => setActiveTab("audit")}
          >
            Nhật ký Audit ({auditLogs.length})
          </button>
        </div>

        {activeTab === "balances" && (
          <>
            <div className="admin-toolbar">
              <input
                className="field"
                placeholder="Tìm mã SKU..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <span style={{ fontSize: "11.5px", color: "#78869d" }}>
                Hiển thị {filteredBalances.length} / {balances.length} mã SKU
              </span>
            </div>

            {loading ? (
              <Loading label="Đang tải dữ liệu tồn kho..." />
            ) : (
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Mã SKU</th>
                      <th>Tồn thực tế</th>
                      <th>Tồn đang giữ</th>
                      <th>Tồn khả dụng</th>
                      <th>Ngưỡng cảnh báo</th>
                      <th>Trạng thái</th>
                      <th>Cập nhật</th>
                      <th>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredBalances.map((b) => {
                      const isLow =
                        b.low_stock_threshold != null &&
                        Number(b.available) <= Number(b.low_stock_threshold);
                      return (
                        <tr key={b.variant_id}>
                          <td>
                            <div className="mini-product">
                              <span className="mini-img">
                                <AdminIcon name="products" size={17} />
                              </span>
                              <span>
                                <strong>{b.sku}</strong>
                                <small>Variant #{b.variant_id}</small>
                              </span>
                            </div>
                          </td>
                          <td>
                            <strong>{b.on_hand}</strong>
                          </td>
                          <td>{b.reserved}</td>
                          <td>
                            <strong>{b.available}</strong>
                          </td>
                          <td>{b.low_stock_threshold}</td>
                          <td>
                            <span className={`pill ${isLow ? "yellow" : "green"}`}>
                              {isLow ? "Sắp hết" : "Bình thường"}
                            </span>
                          </td>
                          <td>{dateTime(b.updated_at)}</td>
                          <td>
                            <button
                              type="button"
                              className="admin-select"
                              style={{ cursor: "pointer", fontWeight: 700 }}
                              onClick={() => {
                                setSelectedVariant(b);
                                setDelta(0);
                                setReason("");
                                setAdjustmentKey(crypto.randomUUID());
                                setAdjustModal(true);
                              }}
                            >
                              ± Điều chỉnh
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {activeTab === "movements" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>SKU</th>
                  <th>Loại biến động</th>
                  <th>Số lượng thay đổi</th>
                  <th>Lý do</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {movements.map((m, idx) => (
                  <tr key={m.event_key || idx}>
                    <td>
                      <strong>{m.sku}</strong>
                    </td>
                    <td>
                      <span className={`pill ${m.quantity_delta > 0 ? "green" : "blue"}`}>
                        {m.kind === "receipt" ? "Nhập kho" : m.kind === "sale" ? "Xuất bán" : m.kind}
                      </span>
                    </td>
                    <td>
                      <strong style={{ color: m.quantity_delta > 0 ? "#178959" : "#c63f58" }}>
                        {m.quantity_delta > 0 ? `+${m.quantity_delta}` : m.quantity_delta}
                      </strong>
                    </td>
                    <td>{m.reason}</td>
                    <td>{dateTime(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "audit" && (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Thực thể</th>
                  <th>Chi tiết thay đổi</th>
                  <th>Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((a) => (
                  <tr key={a.id}>
                    <td>
                      <strong>{a.actor_email || "Hệ thống"}</strong>
                    </td>
                    <td>
                      <span className="pill blue">{a.action}</span>
                    </td>
                    <td>
                      {a.entity_type} #{a.entity_id}
                    </td>
                    <td>
                      <code>
                        {typeof a.changes === "object"
                          ? JSON.stringify(a.changes)
                          : String(a.changes)}
                      </code>
                    </td>
                    <td>{dateTime(a.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {adjustModal && selectedVariant && (
        <div
          className="modal-back"
          role="presentation"
          onMouseDown={(e) => e.target === e.currentTarget && setAdjustModal(false)}
        >
          <form className="modal admin-editor-modal" onSubmit={handleAdjustStock}>
            <h2>Điều chỉnh tồn kho</h2>
            <p style={{ fontSize: "12.5px", color: "#6b7b94", margin: "0 0 14px" }}>
              SKU: <strong>{selectedVariant.sku}</strong> · Tồn thực tế:{" "}
              <b>{selectedVariant.on_hand}</b> · Khả dụng: <b>{selectedVariant.available}</b>
            </p>

            <label className="field-label" htmlFor="adj-delta">
              Số lượng thay đổi (dương: nhập thêm, âm: xuất bớt)
            </label>
            <input
              id="adj-delta"
              className="field"
              type="number"
              required
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
              placeholder="Ví dụ: 10 hoặc -5"
            />

            <label className="field-label" htmlFor="adj-reason">
              Lý do điều chỉnh (bắt buộc)
            </label>
            <input
              id="adj-reason"
              className="field"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Nhập kho đợt mới, kiểm kê kho..."
            />

            <div className="modal-actions">
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => {
                  setAdjustModal(false);
                  setAdjustmentKey(null);
                }}
              >
                Hủy
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={adjusting || Number(delta) === 0}
              >
                {adjusting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
