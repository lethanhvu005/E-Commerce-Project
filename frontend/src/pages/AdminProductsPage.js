import { useCallback, useEffect, useMemo, useState } from "react";
import { adminService, catalogService } from "../api/client";
import { money } from "../api/format";
import { useAuth } from "../auth/AuthContext";

const emptyForm = { category_id: "", brand_id: "", name: "", slug: "", short_name: "", summary: "", status: "draft", warranty_months: 0 };

export default function AdminProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const permissions = useMemo(() => new Set(user?.permissions || []), [user]);
  const canAdd = user?.is_staff && (permissions.has("catalog.add_product") || permissions.size === 0);
  const canChange = user?.is_staff && (permissions.has("catalog.change_product") || permissions.size === 0);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const result = await adminService.getProducts({ search, status, page });
      setProducts(result.results || []); setCount(result.count || 0);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [page, search, status]);

  useEffect(() => { const timer = setTimeout(load, 250); return () => clearTimeout(timer); }, [load]);
  useEffect(() => {
    Promise.all([catalogService.getCategories(), catalogService.getBrands()]).then(([cats, brandList]) => {
      setCategories(cats.results || []); setBrands(brandList.results || []);
    }).catch(() => {});
  }, []);

  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      await adminService.createProduct({ ...form, category_id: Number(form.category_id), brand_id: Number(form.brand_id), warranty_months: Number(form.warranty_months) });
      setModal(false); setForm(emptyForm); setPage(1); await load();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  const changeStatus = async (product, nextStatus) => {
    setError("");
    try { await adminService.updateProduct(product.id, { status: nextStatus }); await load(); }
    catch (err) { setError(err.message); }
  };

  return <>
    <div className="admin-intro"><div><h1>Quản lý sản phẩm</h1><p>Quản lý catalog, trạng thái và giá bán từ PostgreSQL.</p></div>{canAdd && <button className="btn btn-primary" onClick={() => setModal(true)}>+ Thêm sản phẩm</button>}</div>
    {error && <div className="admin-hero-note">⚠ {error}</div>}
    <section className="admin-panel">
      <div className="admin-tabs">{[["", "Tất cả"], ["active", "Đang bán"], ["draft", "Bản nháp"], ["archived", "Đã lưu trữ"]].map(([value, label]) => <button key={label} className={`admin-tab${status === value ? " active" : ""}`} onClick={() => { setStatus(value); setPage(1); }}>{label}</button>)}</div>
      <div className="admin-toolbar"><input className="field" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} placeholder="⌕ Tìm tên, slug hoặc SKU..." /><span>{count} sản phẩm</span></div>
      <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá bán</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>
        {loading ? <tr><td colSpan="6" className="admin-empty">Đang tải dữ liệu...</td></tr> : products.length ? products.map((product) => <tr key={product.id}><td><strong>{product.name}</strong><small>{brands.find((item) => item.id === product.brand_id)?.name || product.slug}</small></td><td>{product.variants?.[0]?.sku || "—"}</td><td>{categories.find((item) => item.id === product.category_id)?.name || product.category_id}</td><td>{product.variants?.length ? money(product.variants[0].price) : "—"}</td><td><span className={`pill ${product.status === "active" ? "green" : product.status === "draft" ? "yellow" : "blue"}`}>{product.status}</span></td><td>{canChange ? <select className="select" value={product.status} onChange={(e) => changeStatus(product, e.target.value)}><option value="draft">Draft</option><option value="active">Active</option><option value="archived">Archived</option></select> : "Chỉ xem"}</td></tr>) : <tr><td colSpan="6" className="admin-empty">Không có sản phẩm phù hợp.</td></tr>}
      </tbody></table></div>
      <div className="admin-pagination"><button disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>← Trước</button><span>Trang {page}</span><button disabled={page * 20 >= count} onClick={() => setPage((p) => p + 1)}>Sau →</button></div>
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
  </>;
}
