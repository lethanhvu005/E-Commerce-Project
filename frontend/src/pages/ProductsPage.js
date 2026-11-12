import { useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { cartService, catalogService, wishlistService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { Empty, ErrorBox, ProductSkeleton, Toast } from "../components/Feedback";

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  const [searchParams, setSearchParams] = useSearchParams();

  // URL State
  const currentCategory = searchParams.get("category") || searchParams.get("cat") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentOrdering = searchParams.get("ordering") || "-created_at";
  const currentPage = Number(searchParams.get("page") || 1);

  // Data States
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productsData, setProductsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  // Load Filters: Categories & Brands from Backend
  useEffect(() => {
    Promise.allSettled([catalogService.getCategories(), catalogService.getBrands()])
      .then(([catRes, brandRes]) => {
        if (catRes.status === "fulfilled") {
          setCategories(catRes.value.results || catRes.value || []);
        }
        if (brandRes.status === "fulfilled") {
          setBrands(brandRes.value.results || brandRes.value || []);
        }
      });
  }, []);

  // Fetch Products based on URL query
  const loadProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await catalogService.getProducts({
        category: currentCategory,
        brand: currentBrand,
        search: currentSearch,
        ordering: currentOrdering,
        page: currentPage,
        page_size: 12,
      });
      setProductsData(data);
    } catch (err) {
      setError(err);
      setProductsData({ count: 0, results: [] });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProducts();
    // Scroll to top on page or filter change
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [searchParams]);

  // Update URL Query Params
  const updateQuery = (updates) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, val]) => {
      if (val !== undefined && val !== null && val !== "") {
        next.set(key, val);
      } else {
        next.delete(key);
      }
    });
    // Reset page to 1 when filters change (unless updating page itself)
    if (!updates.page && next.has("page")) {
      next.delete("page");
    }
    setSearchParams(next);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  // Wishlist handler
  const handleWishlist = async (product) => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/products", search: searchParams.toString() } } });
      return;
    }
    const isFav = wishlistIds.has(product.id);
    try {
      if (isFav) {
        await wishlistService.removeWishlist(product.id);
        setToastMsg(`Đã xóa ${product.name} khỏi danh sách yêu thích.`);
      } else {
        await wishlistService.addWishlist(product.id);
        setToastMsg(`Đã thêm ${product.name} vào danh sách yêu thích.`);
      }
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      setToastMsg(err.message || "Không thể cập nhật danh sách yêu thích.");
    }
  };

  // Quick add to cart
  const handleAddToCart = async (product) => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/products", search: searchParams.toString() } } });
      return;
    }
    try {
      const detail = await catalogService.getProductDetail(product.slug);
      const variant = (detail.variants || []).find((v) => v.available > 0) || detail.variants?.[0];
      if (!variant) {
        setToastMsg("Sản phẩm tạm thời hết hàng.");
        return;
      }
      await cartService.addItem(variant.id, 1);
      setToastMsg(`Đã thêm ${product.name} vào giỏ hàng.`);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm sản phẩm vào giỏ hàng.");
    }
  };

  const productList = productsData?.results || [];
  const totalCount = productsData?.count ?? productList.length;
  const totalPages = Math.ceil(totalCount / 12) || 1;

  return (
    <div className="container">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      {/* Breadcrumb matching prd.html */}
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › Sản phẩm
      </div>

      <h1 className="page-title">
        {currentCategory ? `Danh mục: ${currentCategory}` : "Tất cả sản phẩm"}
      </h1>
      <p className="muted" style={{ fontSize: "12px", margin: "3px 0 0" }}>
        Thiết bị công nghệ chọn lọc — lựa chọn hoàn hảo cho mọi setup.
      </p>

      <div className="shop-layout">
        {/* Sidebar Filters */}
        <aside className="filters" id="mobile-filters">
          <div className="filter-head">
            <strong>Bộ lọc</strong>
            <button className="text-link" onClick={clearAllFilters} style={{ border: 0, background: "none", color: "var(--accent)", cursor: "pointer", fontSize: "12px" }}>
              Xóa tất cả
            </button>
          </div>

          {/* Search Box inside filter */}
          <div className="filter-section">
            <h4>Tìm kiếm</h4>
            <input
              className="field"
              value={currentSearch}
              onChange={(e) => updateQuery({ search: e.target.value })}
              placeholder="Tên hoặc SKU..."
              style={{ width: "100%", padding: "8px 10px", fontSize: "13px" }}
            />
          </div>

          {/* Category Filter */}
          <div className="filter-section">
            <h4>Danh mục</h4>
            <label className="checkrow">
              <input
                type="radio"
                name="category"
                checked={!currentCategory}
                onChange={() => updateQuery({ category: "" })}
              />
              Tất cả
            </label>
            {categories.map((c) => (
              <label className="checkrow" key={c.id || c.slug}>
                <input
                  type="radio"
                  name="category"
                  checked={currentCategory === c.slug || currentCategory === c.name}
                  onChange={() => updateQuery({ category: c.slug })}
                />
                {c.name}
              </label>
            ))}
          </div>

          {/* Brand Filter */}
          {brands.length > 0 && (
            <div className="filter-section">
              <h4>Thương hiệu</h4>
              <label className="checkrow">
                <input
                  type="radio"
                  name="brand"
                  checked={!currentBrand}
                  onChange={() => updateQuery({ brand: "" })}
                />
                Tất cả
              </label>
              {brands.map((b) => (
                <label className="checkrow" key={b.id || b.slug}>
                  <input
                    type="radio"
                    name="brand"
                    checked={currentBrand === b.slug || currentBrand === b.name}
                    onChange={() => updateQuery({ brand: b.slug })}
                  />
                  {b.name}
                </label>
              ))}
            </div>
          )}
        </aside>

        {/* Catalog Main View */}
        <section className="catalog">
          {/* Toolbar */}
          <div className="catalog-toolbar">
            <div className="catalog-meta">
              <span>Hiển thị <b>{totalCount}</b> sản phẩm</span>
            </div>

            <div className="catalog-sort">
              <label htmlFor="catalog-sort-select" style={{ marginRight: "8px", fontSize: "12px", color: "var(--muted)" }}>
                Sắp xếp
              </label>
              <select
                id="catalog-sort-select"
                className="field"
                value={currentOrdering}
                onChange={(e) => updateQuery({ ordering: e.target.value })}
                style={{ minHeight: "36px", padding: "6px 12px", fontSize: "12px" }}
              >
                <option value="-created_at">Mới nhất</option>
                <option value="price">Giá tăng dần</option>
                <option value="-price">Giá giảm dần</option>
                <option value="name">Tên A-Z</option>
              </select>
            </div>
          </div>

          {error && <ErrorBox error={error} onRetry={loadProducts} />}

          {loading && !productsData && (
            <div className="products-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && productList.length === 0 && (
            <Empty
              title="Không tìm thấy sản phẩm"
              text="Hãy thử bỏ bớt bộ lọc hoặc tìm kiếm với từ khóa khác."
              actionText="Xóa bộ lọc"
              onAction={clearAllFilters}
            />
          )}

          {productList.length > 0 && (
            <div className="products-grid">
              {productList.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={wishlistIds.has(product.id)}
                  onFav={handleWishlist}
                  onAdd={handleAddToCart}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav className="pagination" aria-label="Phân trang" style={{ display: "flex", justifyContent: "center", gap: "10px", marginTop: "32px" }}>
              <button
                className="btn btn-quiet"
                disabled={currentPage <= 1}
                onClick={() => updateQuery({ page: Math.max(1, currentPage - 1) })}
              >
                ← Trang trước
              </button>
              <span style={{ display: "inline-flex", alignItems: "center", fontSize: "12px", color: "var(--muted)" }}>
                Trang {currentPage} / {totalPages}
              </span>
              <button
                className="btn btn-quiet"
                disabled={currentPage >= totalPages}
                onClick={() => updateQuery({ page: currentPage + 1 })}
              >
                Trang sau →
              </button>
            </nav>
          )}
        </section>
      </div>
    </div>
  );
}
