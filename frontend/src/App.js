import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth/AuthContext";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import HomePage from "./pages/HomePage";
import ProductsPage from "./pages/ProductsPage";
import ProductDetailPage from "./pages/ProductDetailPage";
import AuthPage from "./pages/AuthPage";
import CartPage from "./pages/CartPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccessPage from "./pages/OrderSuccessPage";
import OrdersPage from "./pages/OrdersPage";
import OrderDetailPage from "./pages/OrderDetailPage";
import WishlistPage from "./pages/WishlistPage";
import VouchersPage from "./pages/VouchersPage";
import ReviewsPage from "./pages/ReviewsPage";
import AccountPage from "./pages/AccountPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminInventoryPage from "./pages/AdminInventoryPage";
import AdminProductsPage from "./pages/AdminProductsPage";
import AdminLayout from "./components/admin/AdminLayout";
import { AdminAnalyticsPage, AdminUnavailablePage } from "./pages/AdminUnavailablePages";
import {
  AboutPage,
  ContactPage,
  FaqPage,
  PrivacyPage,
  ShippingPage,
  TrackingPage,
} from "./pages/InfoPages";
import NotFoundPage from "./pages/NotFoundPage";
import "./styles.css";

const protectedPage = (element) => <ProtectedRoute>{element}</ProtectedRoute>;

export default function App() {
  return (
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <AuthProvider>
        <Routes>
          <Route element={<Layout />}>
            {/* Main Catalog & Home */}
            <Route index element={<HomePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="products/:slug" element={<ProductDetailPage />} />

            {/* Auth */}
            <Route path="login" element={<AuthPage />} />
            <Route path="register" element={<AuthPage mode="register" />} />

            {/* Commerce / Shopping */}
            <Route path="cart" element={protectedPage(<CartPage />)} />
            <Route path="checkout" element={protectedPage(<CheckoutPage />)} />
            <Route path="orders/success" element={protectedPage(<OrderSuccessPage />)} />
            <Route path="orders" element={protectedPage(<OrdersPage />)} />
            <Route path="orders/:id" element={protectedPage(<OrderDetailPage />)} />

            {/* Engagement & Rewards */}
            <Route path="wishlist" element={protectedPage(<WishlistPage />)} />
            <Route path="vouchers" element={<VouchersPage />} />
            <Route path="reviews" element={<ReviewsPage />} />

            {/* User Account */}
            <Route path="account" element={protectedPage(<AccountPage />)} />
            <Route path="profile" element={protectedPage(<AccountPage />)} />

            {/* Tracking & Info Pages */}
            <Route path="tracking" element={<TrackingPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="faq" element={<FaqPage />} />
            <Route path="shipping" element={<ShippingPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            <Route path="forbidden" element={<div className="container" style={{ padding: "80px 0" }}><h1 className="page-title">Không có quyền truy cập</h1><p>Tài khoản này không có quyền nhân viên để mở khu vực quản trị.</p></div>} />

            {/* Fallback */}
            <Route path="*" element={<NotFoundPage />} />
          </Route>
          <Route path="admin/login" element={<AdminLoginPage />} />
          <Route path="admin" element={<ProtectedRoute requireStaff><AdminLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="products" element={<AdminProductsPage />} />
            <Route path="orders" element={<AdminUnavailablePage type="orders" />} />
            <Route path="inventory" element={<AdminInventoryPage />} />
            <Route path="analytics" element={<AdminAnalyticsPage />} />
            <Route path="customers" element={<AdminUnavailablePage type="customers" />} />
            <Route path="promotions" element={<AdminUnavailablePage type="promotions" />} />
            <Route path="reviews" element={<AdminUnavailablePage type="reviews" />} />
            <Route path="support" element={<AdminUnavailablePage type="support" />} />
            <Route path="settings" element={<AdminUnavailablePage type="settings" />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
