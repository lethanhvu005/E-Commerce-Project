import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AuthPage from "./pages/AuthPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import WishlistPage from "./pages/WishlistPage";
import AccountPage from "./pages/AccountPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./styles.css";

const protectedPage = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />
            <Route path="login" element={<AuthPage />} />
            <Route path="register" element={<AuthPage mode="register" />} />
            <Route path="cart" element={protectedPage(<CartPage />)} />
            <Route path="checkout" element={protectedPage(<CheckoutPage />)} />
            <Route path="wishlist" element={protectedPage(<WishlistPage />)} />
            <Route path="account" element={protectedPage(<AccountPage />)} />
            <Route path="orders" element={protectedPage(<OrdersPage />)} />
            <Route path="orders/:id" element={protectedPage(<OrderDetailPage />)} />
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
