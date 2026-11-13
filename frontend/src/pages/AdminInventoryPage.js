import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminService } from "../api/client";
import { dateTime } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

export default function AdminInventoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Data States
  const [balances, setBalances] = useState([]);
  const [movements, setMovements] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Adjustment Modal State
  const [adjustModal, setAdjustModal] = useState(false);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [adjustmentKey, setAdjustmentKey] = useState(null);
  const [adjusting, setAdjusting] = useState(false);

  // Tab State: "balances" | "movements" | "audit"
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
          "Tài khoản của bạn không có quyền truy cập cổng Quản trị (yêu cầu is_staff=True).",
        ),
      );
      setLoading(false);
      return;
    }
    loadAdminData();
  }, [user, navigate]);

  // Handle inventory adjustment submission
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    if (!selectedVariant || delta === 0) return;
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
        `Đã điều chỉnh kho cho SKU ${selectedVariant.sku} (${delta > 0 ? "+" : ""}${delta}).`,
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

  // KPI Calculations from live backend balances
  const totalOnHand = balances.reduce(
    (sum, b) => sum + (Number(b.on_hand) || 0),
    0,
  );
  const totalReserved = balances.reduce(
    (sum, b) => sum + (Number(b.reserved) || 0),
    0,
  );
  const totalAvailable = balances.reduce(
    (sum, b) => sum + (Number(b.available) || 0),
    0,
  );
  const lowStockCount = balances.filter(
    (b) =>
      b.low_stock_threshold != null &&
      Number(b.available) <= Number(b.low_stock_threshold),
  ).length;

  return (
    <div className="admin-inventory-react">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Admin Intro Header */}
      <div
        className="admin-intro"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          flexWrap: "wrap",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        <div>
          <span className="ux-kicker" style={{ color: "var(--action)" }}>
            STAFF MANAGEMENT PORTAL
          </span>
          <h1 className="page-title" style={{ margin: "4px 0" }}>
            Quản lý kho & vận hành
          </h1>
          <p style={{ color: "var(--muted)", fontSize: "13px", margin: 0 }}>
            Dữ liệu tồn kho, biến động điều chỉnh và nhật ký audit thực tế từ
            backend PostgreSQL.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <button className="btn btn-quiet" onClick={loadAdminData}>
            ↻ Đồng bộ dữ liệu
          </button>
          <Link className="btn btn-dark" to="/">
            Xem cửa hàng →
          </Link>
        </div>
      </div>

      {error && <ErrorBox error={error} />}

      {/* Admin KPIs matching admin_inventory.html */}
      <div
        className="admin-kpis"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "16px",
          marginBottom: "28px",
        }}
      >
        <div className="kpi">
          <small style={{ color: "var(--muted)", display: "block" }}>
            Tổng tồn thực tế (On Hand)
          </small>
          <strong
            style={{
              fontSize: "28px",
              color: "var(--ink)",
              display: "block",
              margin: "6px 0",
            }}
          >
            {totalOnHand}
          </strong>
          <span style={{ fontSize: "12px", color: "#169569" }}>
            Dữ liệu kiểm kê kho
          </span>
        </div>

        <div className="kpi">
          <small style={{ color: "var(--muted)", display: "block" }}>
            Tồn đang giữ (Reserved)
          </small>
          <strong
            style={{
              fontSize: "28px",
              color: "#c97714",
              display: "block",
              margin: "6px 0",
            }}
          >
            {totalReserved}
          </strong>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>
            Đang trong giỏ / đơn chờ
          </span>
        </div>

        <div className="kpi">
          <small style={{ color: "var(--muted)", display: "block" }}>
            Khả dụng bán (Available)
          </small>
          <strong
            style={{
              fontSize: "28px",
              color: "var(--action)",
              display: "block",
              margin: "6px 0",
            }}
          >
            {totalAvailable}
          </strong>
          <span style={{ fontSize: "12px", color: "#169569" }}>
            Sẵn sàng xuất kho
          </span>
        </div>

        <div className="kpi">
          <small style={{ color: "var(--muted)", display: "block" }}>
            SKU sắp hết hàng
          </small>
          <strong
            style={{
              fontSize: "28px",
              color: lowStockCount > 0 ? "#d43b62" : "#169569",
              display: "block",
              margin: "6px 0",
            }}
          >
            {lowStockCount}
          </strong>
          <span
            style={{
              fontSize: "12px",
              color: lowStockCount > 0 ? "#d43b62" : "var(--muted)",
            }}
          >
            Ngưỡng dưới mức an toàn
          </span>
        </div>
      </div>

      {/* Admin View Navigation Tabs */}
      <div
        style={{
          display: "flex",
          gap: "10px",
          borderBottom: "1px solid var(--edge)",
          marginBottom: "20px",
        }}
      >
        <button
          className="btn btn-quiet"
          style={{
            borderBottom:
              activeTab === "balances"
                ? "3px solid var(--accent)"
                : "3px solid transparent",
            borderRadius: 0,
            fontWeight: activeTab === "balances" ? 800 : 500,
          }}
          onClick={() => setActiveTab("balances")}
        >
          Tồn kho từng SKU ({balances.length})
        </button>
        <button
          className="btn btn-quiet"
          style={{
            borderBottom:
              activeTab === "movements"
                ? "3px solid var(--accent)"
                : "3px solid transparent",
            borderRadius: 0,
            fontWeight: activeTab === "movements" ? 800 : 500,
          }}
          onClick={() => setActiveTab("movements")}
        >
          Lịch sử biến động kho ({movements.length})
        </button>
        <button
          className="btn btn-quiet"
          style={{
            borderBottom:
              activeTab === "audit"
                ? "3px solid var(--accent)"
                : "3px solid transparent",
            borderRadius: 0,
            fontWeight: activeTab === "audit" ? 800 : 500,
          }}
          onClick={() => setActiveTab("audit")}
        >
          Nhật ký Audit ({auditLogs.length})
        </button>
      </div>

      {/* Tab 1: Balances Table */}
      {activeTab === "balances" && (
        <section className="admin-panel admin-table-wrap">
          {loading ? (
            <Loading label="Đang tải dữ liệu tồn kho..." />
          ) : (
            <table className="admin-table"
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "2px solid #e2eaf5",
                    color: "var(--muted)",
                  }}
                >
                  <th style={{ padding: "12px 10px" }}>ID</th>
                  <th style={{ padding: "12px 10px" }}>Mã SKU</th>
                  <th style={{ padding: "12px 10px" }}>Tồn kho (On Hand)</th>
                  <th style={{ padding: "12px 10px" }}>Đang giữ (Reserved)</th>
                  <th style={{ padding: "12px 10px" }}>Khả dụng (Available)</th>
                  <th style={{ padding: "12px 10px" }}>Ngưỡng tối thiểu</th>
                  <th style={{ padding: "12px 10px" }}>Cập nhật</th>
                  <th style={{ padding: "12px 10px", textAlign: "right" }}>
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody>
                {balances.map((b) => (
                  <tr
                    key={b.variant_id}
                    style={{ borderBottom: "1px solid #edf2f9" }}
                  >
                    <td style={{ padding: "12px 10px", color: "var(--muted)" }}>
                      {b.variant_id}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <strong
                        style={{ color: "var(--ink)", letterSpacing: "0.5px" }}
                      >
                        {b.sku}
                      </strong>
                    </td>
                    <td style={{ padding: "12px 10px", fontWeight: 700 }}>
                      {b.on_hand}
                    </td>
                    <td style={{ padding: "12px 10px", color: "#c97714" }}>
                      {b.reserved}
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span
                        style={{
                          fontWeight: 800,
                          color:
                            b.low_stock_threshold != null &&
                            Number(b.available) <= Number(b.low_stock_threshold)
                              ? "#d43b62"
                              : "var(--action)",
                        }}
                      >
                        {b.available}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--muted)" }}>
                      {b.low_stock_threshold}
                    </td>
                    <td
                      style={{
                        padding: "12px 10px",
                        color: "var(--muted)",
                        fontSize: "11.5px",
                      }}
                    >
                      {dateTime(b.updated_at)}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <button
                        className="btn btn-violet"
                        style={{ padding: "6px 12px", fontSize: "11px" }}
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
                ))}
              </tbody>
            </table>
          )}
        </section>
      )}

      {/* Tab 2: Movements Table */}
      {activeTab === "movements" && (
        <section className="admin-panel admin-table-wrap">
          <table className="admin-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #e2eaf5",
                  color: "var(--muted)",
                }}
              >
                <th style={{ padding: "12px 10px" }}>SKU</th>
                <th style={{ padding: "12px 10px" }}>Loại biến động</th>
                <th style={{ padding: "12px 10px" }}>Thay đổi (Delta)</th>
                <th style={{ padding: "12px 10px" }}>Lý do</th>
                <th style={{ padding: "12px 10px" }}>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m, idx) => (
                <tr
                  key={m.event_key || idx}
                  style={{ borderBottom: "1px solid #edf2f9" }}
                >
                  <td style={{ padding: "12px 10px" }}>
                    <strong>{m.sku}</strong>
                  </td>
                  <td
                    style={{
                      padding: "12px 10px",
                      textTransform: "uppercase",
                      fontSize: "11.5px",
                    }}
                  >
                    {m.kind}
                  </td>
                  <td
                    style={{
                      padding: "12px 10px",
                      fontWeight: 800,
                      color: m.quantity_delta > 0 ? "#169569" : "#d43b62",
                    }}
                  >
                    {m.quantity_delta > 0
                      ? `+${m.quantity_delta}`
                      : m.quantity_delta}
                  </td>
                  <td style={{ padding: "12px 10px", color: "var(--muted)" }}>
                    {m.reason}
                  </td>
                  <td
                    style={{
                      padding: "12px 10px",
                      color: "var(--muted)",
                      fontSize: "11.5px",
                    }}
                  >
                    {dateTime(m.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Tab 3: Audit Logs Table */}
      {activeTab === "audit" && (
        <section className="admin-panel admin-table-wrap">
          <table className="admin-table"
            style={{
              width: "100%",
              borderCollapse: "collapse",
              textAlign: "left",
              fontSize: "13px",
            }}
          >
            <thead>
              <tr
                style={{
                  borderBottom: "2px solid #e2eaf5",
                  color: "var(--muted)",
                }}
              >
                <th style={{ padding: "12px 10px" }}>Người thực hiện</th>
                <th style={{ padding: "12px 10px" }}>Hành động</th>
                <th style={{ padding: "12px 10px" }}>Thực thể</th>
                <th style={{ padding: "12px 10px" }}>Chi tiết thay đổi</th>
                <th style={{ padding: "12px 10px" }}>Thời gian</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((a) => (
                <tr key={a.id} style={{ borderBottom: "1px solid #edf2f9" }}>
                  <td style={{ padding: "12px 10px" }}>
                    <strong>{a.actor_email}</strong>
                  </td>
                  <td style={{ padding: "12px 10px", color: "var(--action)" }}>
                    {a.action}
                  </td>
                  <td style={{ padding: "12px 10px" }}>
                    {a.entity_type} #{a.entity_id}
                  </td>
                  <td
                    style={{
                      padding: "12px 10px",
                      fontSize: "12px",
                      color: "var(--muted)",
                    }}
                  >
                    {typeof a.changes === "object"
                      ? JSON.stringify(a.changes)
                      : String(a.changes)}
                  </td>
                  <td
                    style={{
                      padding: "12px 10px",
                      color: "var(--muted)",
                      fontSize: "11.5px",
                    }}
                  >
                    {dateTime(a.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Modal: Adjust Inventory Dialog */}
      {adjustModal && selectedVariant && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            zIndex: 999,
            display: "grid",
            placeItems: "center",
            padding: "20px",
          }}
        >
          <div
            className="whitebox"
            style={{ width: "100%", maxWidth: "460px", padding: "28px" }}
          >
            <h3 style={{ margin: "0 0 16px" }}>Điều chỉnh tồn kho</h3>
            <p
              style={{
                color: "var(--muted)",
                fontSize: "13px",
                margin: "0 0 16px",
              }}
            >
              SKU:{" "}
              <strong style={{ color: "var(--ink)" }}>
                {selectedVariant.sku}
              </strong>{" "}
              (Hiện có: {selectedVariant.on_hand}, Khả dụng:{" "}
              {selectedVariant.available})
            </p>

            <form onSubmit={handleAdjustStock}>
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

              <label
                className="field-label"
                htmlFor="adj-reason"
                style={{ marginTop: "12px" }}
              >
                Lý do điều chỉnh (bắt buộc)
              </label>
              <input
                id="adj-reason"
                className="field"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Nhập kho đợt mới, xuất mẫu thử, kiểm kê kho..."
              />

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "10px",
                  marginTop: "20px",
                }}
              >
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
                  className="btn btn-violet"
                  disabled={adjusting || delta === 0}
                >
                  {adjusting ? "Đang xử lý..." : "Xác nhận điều chỉnh"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
