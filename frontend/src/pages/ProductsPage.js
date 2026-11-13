import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { cartService, catalogService, wishlistService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { QuickViewModal } from "../components/Motion3D";
import { Empty, ErrorBox, ProductSkeleton, Toast } from "../components/Feedback";

const PRICE_RANGES = [
  { label: "Mọi mức giá", min: "", max: "" },
  { label: "Dưới 1.000.000 ₫", min: "", max: "1000000" },
  { label: "1.000.000 ₫ – 2.500.000 ₫", min: "1000000", max: "2500000" },
  { label: "Trên 2.500.000 ₫", min: "2500000", max: "" },
];

export default function ProductsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { wishlistIds = new Set(), refreshWishlist, refreshCartCount } = outlet;

  const [searchParams, setSearchParams] = useSearchParams();

  // URL State
  const currentCategory = searchParams.get("category") || searchParams.get("cat") || "";
  const currentBrand = searchParams.get("brand") || "";
  const currentCollection = searchParams.get("collection") || "";
  const currentSearch = searchParams.get("search") || "";
  const currentMinPrice = searchParams.get("min_price") || "";
  const currentMaxPrice = searchParams.get("max_price") || "";
  const currentInStock = searchParams.get("in_stock") || "";
  const currentOrdering = searchParams.get("ordering") || "-created_at";
  const currentPage = Number(searchParams.get("page") || 1);

  // Data States
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [productsData, setProductsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [gridCols, setGridCols] = useState(3); // 3 spacious 3D cards by default inside sidebar layout

  // Load Filters: Categories & Brands from Backend
  useEffect(() => {
    Promise.allSettled([catalogService.getCategories(), catalogService.getBrands()]).then(
      ([catRes, brandRes]) => {
        if (catRes.status === "fulfilled") {
          setCategories(catRes.value.results || catRes.value || []);
        }
        if (brandRes.status === "fulfilled") {
          setBrands(brandRes.value.results || brandRes.value || []);
        }
      }
    );
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await catalogService.getProducts({
        category: currentCategory,
        brand: currentBrand,
        collection: currentCollection,
        search: currentSearch,
        min_price: currentMinPrice,
        max_price: currentMaxPrice,
        in_stock: currentInStock,
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
  }, [
    currentCategory,
    currentBrand,
    currentCollection,
    currentSearch,
    currentMinPrice,
    currentMaxPrice,
    currentInStock,
    currentOrdering,
    currentPage,
  ]);

  useEffect(() => {
    loadProducts();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [loadProducts]);

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
      navigate("/login", {
        state: { from: { pathname: "/products", search: searchParams.toString() } },
      });
      return;
    }
    const isFav = wishlistIds.has(product.id);
    try {
      if (isFav) {
        await wishlistService.removeWishlist(product.id);
        setToastMsg(`Đã xóa ${product.name} khỏi danh sách yêu thích.`);
      } else {
        await wishlistService.addWishlist(product.id);
        setToastMsg(`Đã thêm ${product.name} vào danh sách yêu thích ♥`);
      }
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      setToastMsg(err.message || "Không thể cập nhật danh sách yêu thích.");
    }
  };

  // Quick add to cart
  const handleAddToCart = async (product) => {
    if (!user) {
      navigate("/login", {
        state: { from: { pathname: "/products", search: searchParams.toString() } },
      });
      return;
    }
    try {
      let variantId = product.default_variant_id;
      if (!variantId) {
        const detail = await catalogService.getProductDetail(product.slug);
        const variant =
          (detail.variants || []).find((v) => v.available > 0) || detail.variants?.[0];
        variantId = variant?.id;
      }
      if (!variantId) {
        setToastMsg("Sản phẩm tạm thời hết hàng.");
        return;
      }
      await cartService.addItem(variantId, 1);
      setToastMsg(`Đã thêm ${product.name} vào giỏ hàng!`);
      if (refreshCartCount) refreshCartCount();
    } catch (err) {
      setToastMsg(err.message || "Không thể thêm sản phẩm vào giỏ hàng.");
    }
  };

  const productList = productsData?.results || [];
  const totalCount = productsData?.count ?? productList.length;
  const totalPages = Math.ceil(totalCount / 12) || 1;

  const activeCategoryName =
    categories.find((c) => c.slug === currentCategory)?.name || currentCategory;
  const activeBrandName = brands.find((b) => b.slug === currentBrand)?.name || currentBrand;
  const hasActiveFilters = Boolean(
    currentCategory ||
      currentBrand ||
      currentCollection ||
      currentSearch ||
      currentMinPrice ||
      currentMaxPrice ||
      currentInStock
  );

  return (
    <div className="container">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onAdd={handleAddToCart}
        onFav={handleWishlist}
        isFavorite={quickViewProduct ? wishlistIds.has(quickViewProduct.id) : false}
      />

      {/* Breadcrumb */}
      <div className="crumb">
        <Link to="/">Trang chủ</Link> › Sản phẩm
        {activeCategoryName && ` › ${activeCategoryName}`}
      </div>

      {/* Enhanced Catalog Header */}
      <div className="nexa-catalog-hero">
        <div>
          <span className="gear-kicker">NEXA HARDWARE CATALOG</span>
          <h1 className="page-title" style={{ margin: "6px 0 4px" }}>
            {activeCategoryName
              ? `Thiết bị: ${activeCategoryName}`
              : activeBrandName
              ? `Thương hiệu: ${activeBrandName}`
              : "Tất cả sản phẩm"}
          </h1>
          <p className="muted" style={{ fontSize: "13px", margin: 0 }}>
            Thiết bị công nghệ chọn lọc — hiệu năng thực chiến cho mọi góc máy.
          </p>
        </div>

        {/* Quick Category Bar */}
        {categories.length > 0 && (
          <div className="nexa-quick-cats">
            <button
              type="button"
              className={!currentCategory ? "active" : ""}
              onClick={() => updateQuery({ category: "" })}
            >
              Tất cả
            </button>
            {categories.map((c) => (
              <button
                type="button"
                key={c.id || c.slug}
                className={currentCategory === c.slug ? "active" : ""}
                onClick={() => updateQuery({ category: c.slug })}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="shop-layout">
        {/* Sidebar Filters */}
        <aside className="filters nexa-filters-panel" id="mobile-filters">
          <div className="filter-head">
            <strong>Bộ lọc thông minh</strong>
            {hasActiveFilters && (
              <button
                type="button"
                className="text-link"
                onClick={clearAllFilters}
                style={{
                  border: 0,
                  background: "none",
                  color: "var(--action)",
                  cursor: "pointer",
                  fontSize: "12px",
                }}
              >
                Đặt lại
              </button>
            )}
          </div>

          {/* Search Box inside filter */}
          <div className="filter-section">
            <h4>Tìm kiếm nhanh</h4>
            <input
              className="field"
              value={currentSearch}
              onChange={(e) => updateQuery({ search: e.target.value })}
              placeholder="Tên sản phẩm, mã SKU..."
              style={{ width: "100%", padding: "9px 12px", fontSize: "13px" }}
            />
          </div>

          {/* Availability Toggle */}
          <div className="filter-section">
            <h4>Tình trạng kho</h4>
            <label className="checkrow">
              <input
                type="checkbox"
                checked={currentInStock === "1"}
                onChange={(e) => updateQuery({ in_stock: e.target.checked ? "1" : "" })}
              />
              Chỉ hiện sản phẩm sẵn hàng
            </label>
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
              Tất cả danh mục
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

          {/* Price Range Filter */}
          <div className="filter-section">
            <h4>Khoảng giá</h4>
            {PRICE_RANGES.map((range) => {
              const checked =
                currentMinPrice === range.min && currentMaxPrice === range.max;
              return (
                <label className="checkrow" key={range.label}>
                  <input
                    type="radio"
                    name="price_range"
                    checked={checked}
                    onChange={() =>
                      updateQuery({ min_price: range.min, max_price: range.max })
                    }
                  />
                  {range.label}
                </label>
              );
            })}
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
                Tất cả thương hiệu
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
          <div className="catalog-toolbar nexa-catalog-toolbar">
            <div className="catalog-meta">
              <span>
                Tìm thấy <b>{totalCount}</b> thiết bị
              </span>
            </div>

            <div className="nexa-toolbar-right">
              <div className="nexa-grid-switcher" role="group" aria-label="Chế độ lưới">
                <button
                  type="button"
                  className={gridCols === 3 ? "active" : ""}
                  onClick={() => setGridCols(3)}
                  title="Lưới 3 cột 3D rộng rãi"
                >
                  ⊞ 3 Cột
                </button>
                <button
                  type="button"
                  className={gridCols === 4 ? "active" : ""}
                  onClick={() => setGridCols(4)}
                  title="Lưới 4 cột"
                >
                  [::] 4 Cột
                </button>
              </div>

              <div className="catalog-sort">
                <label
                  htmlFor="catalog-sort-select"
                  style={{ marginRight: "8px", fontSize: "12px", color: "var(--muted)" }}
                >
                  Sắp xếp
                </label>
                <select
                  id="catalog-sort-select"
                  className="field"
                  value={currentOrdering}
                  onChange={(e) => updateQuery({ ordering: e.target.value })}
                  style={{ minHeight: "36px", padding: "6px 12px", fontSize: "12px", width: "auto" }}
                >
                  <option value="-created_at">Mới nhất</option>
                  <option value="price">Giá thấp đến cao</option>
                  <option value="-price">Giá cao đến thấp</option>
                  <option value="name">Tên A – Z</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasActiveFilters && (
            <div className="nexa-active-chips">
              {currentCategory && (
                <button
                  type="button"
                  className="nexa-chip"
                  onClick={() => updateQuery({ category: "" })}
                >
                  Danh mục: {activeCategoryName} <span>×</span>
                </button>
              )}
              {currentBrand && (
                <button
                  type="button"
                  className="nexa-chip"
                  onClick={() => updateQuery({ brand: "" })}
                >
                  Hãng: {activeBrandName} <span>×</span>
                </button>
              )}
              {currentCollection && (
                <button
                  type="button"
                  className="nexa-chip"
                  onClick={() => updateQuery({ collection: "" })}
                >
                  Bộ sưu tập: {currentCollection} <span>×</span>
                </button>
              )}
              {(currentMinPrice || currentMaxPrice) && (
                <button
                  type="button"
                  className="nexa-chip"
                  onClick={() => updateQuery({ min_price: "", max_price: "" })}
                >
                  Lọc theo giá <span>×</span>
                </button>
              )}
              {currentInStock === "1" && (
                <button
                  type="button"
                  className="nexa-chip"
                  onClick={() => updateQuery({ in_stock: "" })}
                >
                  Sẵn hàng <span>×</span>
                </button>
              )}
              {currentSearch && (
                <button
                  type="button"
                  className="nexa-chip"
                  onClick={() => updateQuery({ search: "" })}
                >
                  Từ khóa: "{currentSearch}" <span>×</span>
                </button>
              )}
            </div>
          )}

          {error && <ErrorBox error={error} onRetry={loadProducts} />}

          {loading && !productsData && (
            <div className={`products-grid cols-${gridCols}`}>
              {Array.from({ length: 6 }).map((_, i) => (
                <ProductSkeleton key={i} />
              ))}
            </div>
          )}

          {!loading && productList.length === 0 && (
            <Empty
              title="Không tìm thấy sản phẩm phù hợp"
              text="Hãy thử bỏ bớt bộ lọc hoặc tìm kiếm với từ khóa khác."
              actionText="Xóa toàn bộ bộ lọc"
              onAction={clearAllFilters}
            />
          )}

          {productList.length > 0 && (
            <div className={`products-grid nexa-stagger-grid cols-${gridCols}`}>
              {productList.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  isFavorite={wishlistIds.has(product.id)}
                  onFav={handleWishlist}
                  onAdd={handleAddToCart}
                  onQuickView={setQuickViewProduct}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <nav
              className="pagination nexa-pagination"
              aria-label="Phân trang"
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "10px",
                marginTop: "36px",
              }}
            >
              <button
                type="button"
                className="btn btn-quiet"
                disabled={currentPage <= 1}
                onClick={() => updateQuery({ page: Math.max(1, currentPage - 1) })}
              >
                ← Trang trước
              </button>
              <span className="nexa-page-indicator">
                Trang <b>{currentPage}</b> / {totalPages}
              </span>
              <button
                type="button"
                className="btn btn-quiet"
                disabled={currentPage >= totalPages}
                onClick={() => updateQuery({ page: Math.min(totalPages, currentPage + 1) })}
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
