import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { adminService, catalogService } from "../api/client";
import { money, productImage } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import { AdminIcon } from "../components/admin/AdminIcons";

const emptyForm = { category_id: "", brand_id: "", name: "", slug: "", short_name: "", summary: "", status: "draft", warranty_months: 0 };
const statusLabelMap = { active: "Đang bán", draft: "Bản nháp", archived: "Đã lưu trữ" };

export default function AdminProductsPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const status = searchParams.get("status") || "";
  const page = Math.max(1, Number.parseInt(searchParams.get("page") || "1", 10) || 1);

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState(urlQuery);
  const [count, setCount] = useState(0);
  const [hasNext, setHasNext] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editModal, setEditModal] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const permissions = useMemo(() => new Set(user?.permissions || []), [user]);
  const canAdd = Boolean(user?.is_superuser || (user?.is_staff && permissions.has("catalog.add_product")));
  const canChange = Boolean(user?.is_superuser || (user?.is_staff && permissions.has("catalog.change_product")));

  const updateParams = useCallback(
    (patch, replace = false) => {
      const next = new URLSearchParams(searchParams);
      Object.entries(patch).forEach(([k, v]) => {
        if (v === undefined || v === null || v === "" || (k === "page" && Number(v) <= 1)) {
          next.delete(k);
        } else {
          next.set(k, String(v));
        }
      });
      setSearchParams(next, { replace });
    },
    [searchParams, setSearchParams]
  );

  useEffect(() => {
    setSearch(urlQuery);
  }, [urlQuery]);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await adminService.getProducts({ search: urlQuery, status, page });
      setProducts(result.results || []);
      setCount(result.count || 0);
      setHasNext(Boolean(result.next));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, urlQuery, status]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const normalized = search.trim();
    if (normalized === urlQuery) return undefined;
    const timer = setTimeout(() => {
      updateParams({ q: normalized, page: 1 }, true);
    }, 250);
    return () => clearTimeout(timer);
  }, [search, urlQuery, updateParams]);

  useEffect(() => {
    Promise.all([catalogService.getCategories(), catalogService.getBrands()]).then(([cats, brandList]) => {
      setCategories(cats.results || []); setBrands(brandList.results || []);
    }).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await adminService.createProduct({ ...form, category_id: Number(form.category_id), brand_id: Number(form.brand_id), warranty_months: Number(form.warranty_months) });
      setModal(false); setForm(emptyForm); updateParams({ page: 1 }); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const changeStatus = async (product, nextStatus) => {
    setError("");
    try { await adminService.updateProduct(product.id, { status: nextStatus }); await load(); }
    catch (err) { setError(err.message); }
  };

  const openEditModal = (product) => {
    const primaryVariant = product.variants?.[0] || null;
    const coverImg = product.images?.find((img) => img.is_cover) || product.images?.[0] || null;
    setEditForm({
      id: product.id,
      category_id: product.category_id,
      brand_id: product.brand_id,
      name: product.name || "",
      slug: product.slug || "",
      short_name: product.short_name || "",
      summary: product.summary || "",
      description: product.description || "",
      status: product.status || "active",
      warranty_months: product.warranty_months ?? 24,
      specifications_json: JSON.stringify(product.specifications || {}, null, 2),
      variant_id: primaryVariant?.id || null,
      sku: primaryVariant?.sku || "",
      option_key: primaryVariant?.option_key || "standard",
      price: primaryVariant?.price ?? 0,
      compare_at_price: primaryVariant?.compare_at_price ?? "",
      color: primaryVariant?.color || "",
      switch_type: primaryVariant?.switch_type || "",
      connection: primaryVariant?.connection || "",
      layout: primaryVariant?.layout || "",
      image_id: coverImg?.id || null,
      image_object_key: coverImg?.object_key || "",
    });
    setEditModal(true);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editForm) return;
    setSaving(true);
    setError("");
    try {
      let specs = {};
      if (editForm.specifications_json.trim()) {
        try {
          specs = JSON.parse(editForm.specifications_json);
        } catch {
          throw new Error("Thông số kỹ thuật (JSON) không hợp lệ.");
        }
      }
      await adminService.updateProduct(editForm.id, {
        category_id: Number(editForm.category_id),
        brand_id: Number(editForm.brand_id),
        name: editForm.name,
        slug: editForm.slug,
        short_name: editForm.short_name,
        summary: editForm.summary,
        description: editForm.description,
        status: editForm.status,
        warranty_months: Number(editForm.warranty_months),
        specifications: specs,
      });

      if (editForm.sku.trim()) {
        const variantPayload = {
          sku: editForm.sku.trim(),
          option_key: editForm.option_key || "standard",
          price: Number(editForm.price || 0),
          compare_at_price: editForm.compare_at_price !== "" ? Number(editForm.compare_at_price) : null,
          color: editForm.color,
          switch_type: editForm.switch_type,
          connection: editForm.connection,
          layout: editForm.layout,
          is_active: true,
        };
        if (editForm.variant_id) {
          await adminService.updateProductVariant(editForm.id, editForm.variant_id, variantPayload);
        } else {
          await adminService.createProductVariant(editForm.id, variantPayload);
        }
      }

      if (editForm.image_object_key.trim()) {
        const imgPayload = {
          object_key: editForm.image_object_key.trim(),
          alt_text: editForm.name,
          width: 1024,
          height: 1024,
          is_cover: true,
        };
        if (editForm.image_id) {
          await adminService.updateProductImage(editForm.id, editForm.image_id, imgPayload);
        } else {
          await adminService.createProductImage(editForm.id, imgPayload);
        }
      }

      setEditModal(false);
      setEditForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return <>
    <div className="admin-intro"><div><h1>Quản lý sản phẩm</h1><p>Quản lý catalog, trạng thái và giá bán trực tiếp từ PostgreSQL.</p></div>{canAdd && <button className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: "6px" }} onClick={() => setModal(true)}><AdminIcon name="plus" size={15} /><span>Thêm sản phẩm</span></button>}</div>
    {error && <div className="admin-hero-note admin-error" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px" }}><span>⚠ {error}</span><button type="button" className="btn btn-quiet" onClick={load}>Thử lại</button></div>}
    <section className="admin-panel">
      <div className="admin-tabs">{[["", "Tất cả"], ["active", "Đang bán"], ["draft", "Bản nháp"], ["archived", "Đã lưu trữ"]].map(([value, label]) => <button key={label} className={`admin-tab${status === value ? " active" : ""}`} onClick={() => updateParams({ status: value, page: 1 })}>{label}</button>)}</div>
      <div className="admin-toolbar"><input className="field" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm tên, slug hoặc SKU..." /><span>{count} sản phẩm</span></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá bán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="6" className="admin-empty">Đang tải dữ liệu...</td></tr> : products.length ? products.map((product) => <tr key={product.id}><td><div className="mini-product"><span className="mini-img"><img src={productImage(product)} alt={product.name} className="admin-mini-thumb" /></span><span><strong>{product.name}</strong><small>{brands.find((item) => item.id === product.brand_id)?.name || product.slug}</small></span></div></td><td><strong>{product.variants?.[0]?.sku || "—"}</strong></td><td>{categories.find((item) => item.id === product.category_id)?.name || product.category_id}</td><td><strong>{product.variants?.length ? money(product.variants[0].price) : "—"}</strong></td><td><span className={`pill ${product.status === "active" ? "green" : product.status === "draft" ? "yellow" : "blue"}`}>{statusLabelMap[product.status] || product.status}</span></td><td>{canChange ? <div style={{ display: "flex", gap: "6px", alignItems: "center" }}><select className="select" value={product.status} onChange={(e) => changeStatus(product, e.target.value)}><option value="draft">Bản nháp</option><option value="active">Đang bán</option><option value="archived">Đã lưu trữ</option></select><button type="button" className="admin-select" style={{ cursor: "pointer", fontWeight: 700, whiteSpace: "nowrap" }} onClick={() => openEditModal(product)}>Sửa</button></div> : "Chỉ xem"}</td></tr>) : <tr><td colSpan="6" className="admin-empty">Không có sản phẩm phù hợp.</td></tr>}
      </tbody></table></div>
      <div className="admin-pagination"><button disabled={page <= 1} onClick={() => updateParams({ page: page - 1 })}>← Trước</button><span>Trang {page}</span><button disabled={!hasNext} onClick={() => updateParams({ page: page + 1 })}>Sau →</button></div>
    </section>
    {modal && <div className="modal-back" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setModal(false)}><form className="modal admin-editor-modal" onSubmit={submit}><h2>Thêm sản phẩm</h2>
      <label className="field-label">Tên sản phẩm</label><input className="field" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
      <label className="field-label">Slug</label><input className="field" required value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })} />
      <label className="field-label">Tên ngắn</label><input className="field" required value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
      <label className="field-label">Danh mục</label><select className="select" required value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}><option value="">Chọn danh mục</option>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <label className="field-label">Thương hiệu</label><select className="select" required value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })}><option value="">Chọn thương hiệu</option>{brands.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
      <label className="field-label">Mô tả ngắn</label><textarea className="field" value={form.summary} onChange={(e) => setForm({ ...form, summary: e.target.value })} />
      <div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={() => setModal(false)}>Hủy</button><button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Tạo sản phẩm"}</button></div>
    </form></div>}
    {editModal && editForm && <div className="modal-back" role="presentation" onMouseDown={(e) => e.target === e.currentTarget && setEditModal(false)}><form className="modal admin-editor-modal" style={{ maxHeight: "88vh", overflowY: "auto" }} onSubmit={submitEdit}><h2>Chỉnh sửa sản phẩm & biến thể</h2>
      <label className="field-label">Tên sản phẩm</label><input className="field" required value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div><label className="field-label">Slug</label><input className="field" required value={editForm.slug} onChange={(e) => setEditForm({ ...editForm, slug: e.target.value })} /></div>
        <div><label className="field-label">Tên ngắn</label><input className="field" required value={editForm.short_name} onChange={(e) => setEditForm({ ...editForm, short_name: e.target.value })} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div><label className="field-label">Danh mục</label><select className="select" required value={editForm.category_id} onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}>{categories.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
        <div><label className="field-label">Thương hiệu</label><select className="select" required value={editForm.brand_id} onChange={(e) => setEditForm({ ...editForm, brand_id: e.target.value })}>{brands.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div><label className="field-label">Mã SKU biến thể</label><input className="field" value={editForm.sku} onChange={(e) => setEditForm({ ...editForm, sku: e.target.value })} placeholder="VD: NEXA-X75" /></div>
        <div><label className="field-label">Bảo hành (tháng)</label><input className="field" type="number" min="0" value={editForm.warranty_months} onChange={(e) => setEditForm({ ...editForm, warranty_months: e.target.value })} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div><label className="field-label">Giá bán (VND)</label><input className="field" type="number" min="0" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} /></div>
        <div><label className="field-label">Giá gốc so sánh (VND)</label><input className="field" type="number" min="0" value={editForm.compare_at_price} onChange={(e) => setEditForm({ ...editForm, compare_at_price: e.target.value })} /></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
        <div><label className="field-label">Màu sắc / Phiên bản</label><input className="field" value={editForm.color} onChange={(e) => setEditForm({ ...editForm, color: e.target.value })} /></div>
        <div><label className="field-label">Kết nối</label><input className="field" value={editForm.connection} onChange={(e) => setEditForm({ ...editForm, connection: e.target.value })} /></div>
      </div>
      <label className="field-label">Đường dẫn ảnh đại diện (object_key)</label><input className="field" value={editForm.image_object_key} onChange={(e) => setEditForm({ ...editForm, image_object_key: e.target.value })} placeholder="assets/images/categories/keyboards.png" />
      <label className="field-label">Mô tả ngắn</label><input className="field" value={editForm.summary} onChange={(e) => setEditForm({ ...editForm, summary: e.target.value })} />
      <label className="field-label">Mô tả chi tiết</label><textarea className="field" rows="2" value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
      <label className="field-label">Thông số kỹ thuật (JSON)</label><textarea className="field" rows="3" value={editForm.specifications_json} onChange={(e) => setEditForm({ ...editForm, specifications_json: e.target.value })} />
      <div className="modal-actions"><button type="button" className="btn btn-quiet" onClick={() => setEditModal(false)}>Hủy</button><button className="btn btn-primary" disabled={saving}>{saving ? "Đang lưu..." : "Lưu thay đổi"}</button></div>
    </form></div>}
  </>;
}
