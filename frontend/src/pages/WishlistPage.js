import { useCallback, useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { cartService, catalogService, wishlistService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { QuickViewModal } from "../components/Motion3D";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

export default function WishlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { refreshWishlist, refreshCartCount } = outlet;

  const [wishlistEntries, setWishlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");
  const [quickViewProduct, setQuickViewProduct] = useState(null);

  const loadWishlist = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await wishlistService.getWishlist();
      setWishlistEntries(data.results || data || []);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/wishlist" } } });
      return;
    }
    loadWishlist();
  }, [user, navigate, loadWishlist]);

  const handleRemove = async (product) => {
    try {
      await wishlistService.removeWishlist(product.id);
      setWishlistEntries((prev) =>
        prev.filter((item) => (item.product?.id || item.product) !== product.id)
      );
      setToastMsg(`Đã xóa ${product.name} khỏi danh sách yêu thích.`);
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      setToastMsg(err.message || "Không thể xóa sản phẩm.");
    }
  };

  const handleAddToCart = async (product) => {
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
      setToastMsg(err.message || "Không thể thêm vào giỏ hàng.");
    }
  };

  if (loading && wishlistEntries.length === 0) {
    return (
      <div className="container" style={{ padding: "40px 0" }}>
        <Loading label="Đang tải danh sách yêu thích..." />
      </div>
    );
  }

  return (
    <div className="container ux-page">
      <Toast message={toastMsg} onClose={() => setToastMsg("")} />

      <QuickViewModal
        product={quickViewProduct}
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        onAdd={handleAddToCart}
        onFav={handleRemove}
        isFavorite={true}
      />

      <section className="ux-hero nexa-hero-glow">
        <div>
          <span className="ux-kicker">NEXA / ACCOUNT / FAVORITES</span>
          <h1>
            Your <em>wishlist.</em>
          </h1>
          <p>
            Những thiết bị bạn quan tâm được lưu trữ trực tiếp trên tài khoản của bạn.
          </p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">
          N
        </span>
      </section>

      {error && <ErrorBox error={error} onRetry={loadWishlist} />}

      {wishlistEntries.length === 0 ? (
        <section className="ux-card" style={{ textAlign: "center", padding: "50px 20px" }}>
          <h2>Wishlist đang trống</h2>
          <p style={{ color: "var(--muted)", maxWidth: "380px", margin: "8px auto 20px" }}>
            Chạm ♡ trên một sản phẩm trong cửa hàng để lưu vào danh sách mong muốn.
          </p>
          <button className="btn btn-violet nexa-btn-3d" onClick={() => navigate("/products")}>
            Khám phá sản phẩm →
          </button>
        </section>
      ) : (
        <div className="products-grid" style={{ marginTop: "24px" }}>
          {wishlistEntries.map((entry) => {
            const product = entry.product || entry;
            return (
              <ProductCard
                key={entry.id || product.id}
                product={product}
                isFavorite={true}
                onFav={() => handleRemove(product)}
                onAdd={handleAddToCart}
                onQuickView={setQuickViewProduct}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
