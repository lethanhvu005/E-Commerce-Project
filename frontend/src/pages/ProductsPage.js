import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { queryString } from "../api/format";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Empty, ErrorBox, Loading } from "../components/Feedback";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState(null);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [error, setError] = useState(null);

  const filters = {
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    brand: searchParams.get("brand") || "",
    ordering: searchParams.get("ordering") || "-created_at",
    page: searchParams.get("page") || "1",
  };

  useEffect(() => {
    Promise.all([api.get("/categories/"), api.get("/brands/")]).then(([cat, brand]) => {
      setCategories(cat.results || []);
      setBrands(brand.results || []);
    }).catch(setError);
  }, []);

  useEffect(() => {
    setProducts(null);
    setError(null);
    api.get(`/products/?${queryString({ ...filters, page_size: 12 })}`).then(setProducts).catch(setError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const update = (key, value) => {
    const next = Object.fromEntries(searchParams.entries());
    if (value) next[key] = value; else delete next[key];
    if (key !== "page") delete next.page;
    setSearchParams(next);
  };

  const addWish = async (product) => {
    if (!user) return navigate("/login", { state: { from: { pathname: "/products", search: `?${searchParams}` } } });
    try { await api.post("/wishlist/", { product_id: product.id }); }
    catch (e) { setError(e); }
  };

  return (
    <div className="page-container catalog-page">
      <header className="page-heading">
        <span className="eyebrow">NEXA CATALOG</span>
        <h1>Tìm gear đúng chất của bạn.</h1>
        <p>Lọc sản phẩm trực tiếp từ dữ liệu CommerceOS.</p>
      </header>

      <div className="catalog-layout">
        {/* Filters sidebar */}
        <aside className="filter-panel">
          <label>
            Tìm kiếm
            <input
              value={filters.search}
              onChange={(e) => update("search", e.target.value)}
              placeholder="Tên hoặc SKU..."
            />
          </label>
          <label>
            Loại sản phẩm
            <select value={filters.category} onChange={(e) => update("category", e.target.value)}>
              <option value="">Tất cả</option>
              {categories.map((item) => (
                <option value={item.slug} key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Thương hiệu
            <select value={filters.brand} onChange={(e) => update("brand", e.target.value)}>
              <option value="">Tất cả</option>
              {brands.map((item) => (
                <option value={item.slug} key={item.id}>{item.name}</option>
              ))}
            </select>
          </label>
          <label>
            Sắp xếp
            <select value={filters.ordering} onChange={(e) => update("ordering", e.target.value)}>
              <option value="-created_at">Mới nhất</option>
              <option value="price">Giá tăng dần</option>
              <option value="-price">Giá giảm dần</option>
              <option value="name">Tên A-Z</option>
            </select>
          </label>
          <button className="text-button" onClick={() => setSearchParams({})}>Xóa bộ lọc</button>
        </aside>

        {/* Results */}
        <div className="catalog-results">
          {error && <ErrorBox error={error} />}
          {!products && !error && <Loading />}
          {products && !products.results.length && (
            <Empty title="Không tìm thấy sản phẩm" text="Hãy thử bỏ bớt điều kiện lọc." />
          )}
          {products && products.results.length > 0 && (
            <>
              <div className="result-meta">
                <strong>{products.count} sản phẩm</strong>
                <span>Trang {filters.page}</span>
              </div>
              <div className="gear-product-grid product-grid">
                {products.results.map((product) => (
                  <ProductCard key={product.id} product={product} onWish={addWish} />
                ))}
              </div>
              <div className="pagination">
                <button
                  disabled={!products.previous}
                  onClick={() => update("page", Math.max(1, Number(filters.page) - 1))}
                >
                  ← Trang trước
                </button>
                <button
                  disabled={!products.next}
                  onClick={() => update("page", Number(filters.page) + 1)}
                >
                  Trang sau →
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
