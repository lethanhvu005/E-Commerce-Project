import { useEffect, useState } from "react";
import { api } from "../api/client";
import ProductCard from "../components/ProductCard";
import { Empty, ErrorBox, Loading } from "../components/Feedback";

export default function WishlistPage() {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get("/wishlist/").then((data) => setEntries(data.results || [])).catch(setError);
  }, []);

  const remove = async (product) => {
    try {
      await api.delete(`/wishlist/${product.id}/`);
      setEntries((prev) => prev.filter((e) => e.product.id !== product.id));
    } catch (e) { setError(e); }
  };

  return (
    <div className="page-container">
      <header className="page-heading compact">
        <span className="eyebrow">WISHLIST</span>
        <h1>Danh sách yêu thích.</h1>
      </header>

      {error && <ErrorBox error={error} />}
      {!entries && !error && <Loading />}
      {entries?.length === 0 && <Empty title="Chưa có sản phẩm yêu thích" />}

      {entries && entries.length > 0 && (
        <div className="gear-product-grid product-grid">
          {entries.map((entry) => (
            <ProductCard key={entry.product.id} product={entry.product} onWish={() => remove(entry.product)} />
          ))}
        </div>
      )}
    </div>
  );
}
