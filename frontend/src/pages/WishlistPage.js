import { useEffect, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { wishlistService } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import ProductCard from "../components/ProductCard";
import { ErrorBox, Loading, Toast } from "../components/Feedback";

export default function WishlistPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const outlet = useOutletContext() || {};
  const { refreshWishlist } = outlet;

  const [wishlistEntries, setWishlistEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [toastMsg, setToastMsg] = useState("");

  const loadWishlist = async () => {
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
  };

  useEffect(() => {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/wishlist" } } });
      return;
    }
    loadWishlist();
  }, [user]);

  // Remove from wishlist
  const handleRemove = async (product) => {
    try {
      await wishlistService.removeWishlist(product.id);
      setWishlistEntries((prev) => prev.filter((item) => (item.product?.id || item.product) !== product.id));
      setToastMsg(`Đã xóa ${product.name} khỏi danh sách yêu thích.`);
      if (refreshWishlist) refreshWishlist();
    } catch (err) {
      setToastMsg(err.message || "Không thể xóa sản phẩm.");
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

      {/* Hero Header matching wishlist.html */}
      <section className="ux-hero">
        <div>
          <span className="ux-kicker">NEXA / ACCOUNT / FAVORITES</span>
          <h1>Your <em>wishlist.</em></h1>
          <p>
            Những thiết bị bạn quan tâm được lưu trữ trực tiếp trên tài khoản của bạn.
          </p>
        </div>
        <span className="ux-hero-orbit" aria-hidden="true">N</span>
      </section>

      {error && <ErrorBox error={error} onRetry={loadWishlist} />}

      {/* Wishlist Content matching wishlist.html */}
      {wishlistEntries.length === 0 ? (
        <section className="ux-card" style={{ textAlign: "center", padding: "50px 20px" }}>
          <h2>Wishlist đang trống</h2>
          <p style={{ color: "#6e83a6", maxWidth: "380px", margin: "8px auto 20px" }}>
            Chạm ♡ trên một sản phẩm trong cửa hàng để lưu vào danh sách mong muốn.
          </p>
          <button className="btn btn-violet" onClick={() => navigate("/products")}>
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
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
