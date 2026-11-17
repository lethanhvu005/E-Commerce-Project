/**
 * CommerceOS API Client
 * - Concurrency-safe JWT Refresh with Token Rotation
 * - Standardized Error Handling matching Django REST Framework
 * - Service modules for all backend domains
 */

const API_ROOT = process.env.REACT_APP_API_URL || process.env.VITE_API_BASE_URL || "/api";
const TOKEN_KEY = "commerceos_tokens";

// Token Storage
export function getTokens() {
  try {
    const raw = sessionStorage.getItem(TOKEN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveTokens(tokens) {
  if (tokens && tokens.access) {
    const prev = getTokens() || {};
    const updated = {
      access: tokens.access,
      refresh: tokens.refresh || prev.refresh,
    };
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify(updated));
  }
}

export function clearTokens() {
  sessionStorage.removeItem(TOKEN_KEY);
}

// DRF Error Message Formatter
export function formatErrorMessage(payload, status) {
  if (!payload) return `Yêu cầu thất bại (${status || "Lỗi mạng"}).`;
  if (typeof payload === "string") {
    const trimmed = payload.trim();
    if (/^<(?:!doctype|html|head|body)\b/i.test(trimmed) || /<html[\s>]/i.test(trimmed)) {
      if (status >= 500) {
        return `Máy chủ đang gặp sự cố tạm thời (HTTP ${status}). Vui lòng thử lại sau hoặc kiểm tra migration database trên server.`;
      }
      return `Máy chủ trả về phản hồi không hợp lệ (HTTP ${status || "Lỗi"}).`;
    }
    return trimmed;
  }
  if (payload.detail) return payload.detail;
  if (payload.message) return payload.message;
  if (payload.error) return payload.error;
  if (typeof payload === "object") {
    const entries = Object.entries(payload);
    if (entries.length > 0) {
      const [field, value] = entries[0];
      const text = Array.isArray(value) ? value.join(", ") : String(value);
      return field === "non_field_errors" ? text : `${field}: ${text}`;
    }
  }
  return `Yêu cầu thất bại (${status}).`;
}

// Concurrency-safe token refresh singleton
let refreshPromise = null;

async function refreshAccessToken() {
  const tokens = getTokens();
  if (!tokens?.refresh) {
    clearTokens();
    return null;
  }

  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    try {
      const response = await fetch(`${API_ROOT}/auth/token/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh: tokens.refresh }),
      });

      if (!response.ok) {
        clearTokens();
        return null;
      }

      const nextTokens = await response.json();
      saveTokens(nextTokens);
      return nextTokens.access;
    } catch {
      clearTokens();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// Main fetch function with single-retry on 401
export async function apiFetch(path, options = {}, retry = true) {
  const { skipAuth = false, ...fetchOptions } = options;
  const tokens = getTokens();
  const headers = new Headers(fetchOptions.headers || {});

  if (fetchOptions.body && !(fetchOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!skipAuth && tokens?.access) {
    headers.set("Authorization", `Bearer ${tokens.access}`);
  }

  const normalizedPath = path.startsWith("http") ? path : `${API_ROOT}${path.startsWith("/") ? "" : "/"}${path}`;

  let response;
  try {
    response = await fetch(normalizedPath, { ...fetchOptions, headers });
  } catch (netErr) {
    const error = new Error("Không thể kết nối đến máy chủ backend (127.0.0.1:8000). Vui lòng kiểm tra backend server.");
    error.status = 0;
    throw error;
  }

  // Handle 401 Unauthorized by refreshing token
  if (!skipAuth && response.status === 401 && retry && tokens?.refresh) {
    const nextAccess = await refreshAccessToken();
    if (nextAccess) {
      return apiFetch(path, options, false);
    }
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const error = new Error(formatErrorMessage(payload, response.status));
    error.status = response.status;
    error.payload = payload;
    throw error;
  }

  return payload;
}

// Core API Methods
export const api = {
  get: (path) => apiFetch(path),
  publicGet: (path) => apiFetch(path, { skipAuth: true }),
  post: (path, body) => apiFetch(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  patch: (path, body) => apiFetch(path, { method: "PATCH", body: body ? JSON.stringify(body) : undefined }),
  delete: (path, body) => apiFetch(path, {
    method: "DELETE",
    body: body ? JSON.stringify(body) : undefined,
  }),
};

// Domain Services

export const authService = {
  login: (credentials) => api.post("/auth/login/", credentials),
  adminLogin: (credentials) => api.post("/admin/auth/login/", credentials),
  loginWithGoogle: (payload) => api.post("/auth/google/", payload),
  getFacebookConfig: () => api.publicGet("/auth/facebook/config/"),
  loginWithFacebook: (payload) => api.post("/auth/facebook/", payload),
  register: (payload) => api.post("/auth/register/", payload),
  logout: (refreshToken) => api.post("/auth/logout/", { refresh: refreshToken }),
  getProfile: () => api.get("/accounts/me/"),
  updateProfile: (profile) => api.patch("/accounts/me/", profile),
  requestEmailOtp: (email) => api.post("/accounts/me/email-otp/request/", { email }),
  verifyEmailOtp: ({ email, otp }) => api.post("/accounts/me/email-otp/verify/", { email, otp }),
  getAddresses: () => api.get("/accounts/me/addresses/"),
  addAddress: (addr) => api.post("/accounts/me/addresses/", addr),
  updateAddress: (id, addr) => api.patch(`/accounts/me/addresses/${id}/`, addr),
  deleteAddress: (id) => api.delete(`/accounts/me/addresses/${id}/`),
  submitSupportContact: (payload) => api.post("/accounts/support-contact/", payload),
};

export const catalogService = {
  getHomeBanners: () => api.publicGet("/home-banners/"),
  getCategories: () => api.publicGet("/categories/"),
  getBrands: () => api.publicGet("/brands/"),
  getCollections: () => api.publicGet("/collections/"),
  getCollectionProducts: (slug) => api.publicGet(`/collections/${slug}/products/`),
  getProducts: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== "") qs.set(k, v);
    });
    return api.publicGet(`/products/?${qs.toString()}`);
  },
  getProductDetail: (slug) => api.publicGet(`/products/${slug}/`),
  getProductVariants: (slug) => api.publicGet(`/products/${slug}/variants/`),
};

export const cartService = {
  getCart: () => api.get("/cart/"),
  addItem: (variantId, quantity = 1) => api.post("/cart/items/", { variant_id: variantId, quantity }),
  updateItem: (itemId, quantity) => api.patch(`/cart/items/${itemId}/`, { quantity }),
  removeItem: (itemId) => api.delete(`/cart/items/${itemId}/`),
  applyVoucher: (code) => api.post("/cart/voucher/", { code }),
  removeVoucher: () => api.delete("/cart/voucher/"),
  clearCart: () => api.delete("/cart/items/"),
};

export const wishlistService = {
  getWishlist: () => api.get("/wishlist/"),
  addWishlist: (productId) => api.post("/wishlist/", { product_id: productId }),
  removeWishlist: (productId) => api.delete(`/wishlist/${productId}/`),
};

export const orderService = {
  getShippingMethods: () => api.publicGet("/shipping-methods/"),
  checkoutPreview: (payload) => api.post("/checkout/preview/", payload),
  createOrder: (payload) => api.post("/orders/", payload),
  getOrders: (params = {}) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") qs.set(key, value);
    });
    const query = qs.toString();
    return api.get(`/orders/${query ? `?${query}` : ""}`);
  },
  getOrderDetail: (publicId) => api.get(`/orders/${publicId}/`),
  getOrderHistory: (publicId) => api.get(`/orders/${publicId}/history/`),
  cancelOrder: (publicId, reason) => api.post(`/orders/${publicId}/cancel/`, { reason }),
  getOrderPayments: (publicId) => api.get(`/orders/${publicId}/payments/`),
};

export const paymentService = {
  getConfig: () => api.publicGet("/payments/config/"),
  createVnpayUrl: (payload) => api.post("/payments/vnpay/create/", payload),
  verifyVnpayReturn: (params) => api.post("/payments/vnpay/verify-return/", { params }),
};

export const promotionService = {
  getVouchers: () => api.publicGet("/vouchers/"),
};

export const communityService = {
  // The endpoint remains public, but an access token (when available) lets the
  // server return purchase-based review eligibility for the current customer.
  getProductReviews: (slug) => api.get(`/products/${slug}/reviews/`),
  createProductReview: (slug, data) => api.post(`/products/${slug}/reviews/`, data),
  updateReview: (reviewId, data) => api.patch(`/reviews/${reviewId}/`, data),
  deleteReview: (reviewId) => api.delete(`/reviews/${reviewId}/`),
  getReviewReplies: (reviewId) => api.get(`/reviews/${reviewId}/replies/`),
  createReviewReply: (reviewId, data) => api.post(`/reviews/${reviewId}/replies/`, data),
  getProductQuestions: (slug) => api.publicGet(`/products/${slug}/questions/`),
  createProductQuestion: (slug, data) => api.post(`/products/${slug}/questions/`, data),
  getQuestionAnswers: (questionId) => api.publicGet(`/questions/${questionId}/answers/`),
  createQuestionAnswer: (questionId, data) => api.post(`/questions/${questionId}/answers/`, data),
};

function buildAdminQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") qs.set(key, value);
  });
  const query = qs.toString();
  return query ? `?${query}` : "";
}

export const adminService = {
  getDashboard: () => api.get("/admin/dashboard/"),
  getAnalytics: (params = {}) => api.get(`/admin/analytics/${buildAdminQuery(params)}`),
  getOrders: (params) => api.get(`/admin/orders/${buildAdminQuery(params)}`),
  updateOrderStatus: (publicId, payload) => api.post(`/admin/orders/${publicId}/status/`, payload),
  confirmOrderPayment: (publicId, payload = {}) => api.post(`/admin/orders/${publicId}/confirm-payment/`, payload),
  releaseExpiredReservations: () => api.post("/admin/reservations/release-expired/", {}),
  getCustomers: (params) => api.get(`/admin/customers/${buildAdminQuery(params)}`),
  getCustomerDetail: (userId) => api.get(`/admin/customers/${userId}/`),
  setCustomerStatus: (userId, payload) => api.post(`/admin/customers/${userId}/status/`, payload),
  getPromotions: (params) => api.get(`/admin/promotions/${buildAdminQuery(params)}`),
  createPromotion: (payload) => api.post("/admin/promotions/", payload),
  updatePromotion: (voucherId, payload) => api.patch(`/admin/promotions/${voucherId}/`, payload),
  setPromotionStatus: (voucherId, isActive) => api.post(`/admin/promotions/${voucherId}/status/`, { is_active: isActive }),
  getReviews: (params) => api.get(`/admin/reviews/${buildAdminQuery(params)}`),
  getQuestions: (params) => api.get(`/admin/questions/${buildAdminQuery(params)}`),
  getQuestionAnswers: (questionId) => api.get(`/admin/questions/${questionId}/answers/`),
  replyToQuestion: (questionId, body) => api.post(`/admin/questions/${questionId}/reply/`, { body }),
  moderateItem: (kind, objectId, payload) => api.post(`/admin/moderation/${kind}/${objectId}/`, payload),
  getOutboxEvents: (params) => api.get(`/admin/outbox-events/${buildAdminQuery(params)}`),
  retryOutboxEvent: (eventId) => api.post(`/admin/outbox-events/${eventId}/retry/`, {}),
  getProducts: (params = {}) => api.get(`/admin/products/${buildAdminQuery(params)}`),
  createProduct: (payload) => api.post("/admin/products/", payload),
  updateProduct: (productId, payload) => api.patch(`/admin/products/${productId}/`, payload),
  createProductVariant: (productId, payload) => api.post(`/admin/products/${productId}/variants/`, payload),
  updateProductVariant: (productId, variantId, payload) => api.patch(`/admin/products/${productId}/variants/${variantId}/`, payload),
  createProductImage: (productId, payload) => api.post(`/admin/products/${productId}/images/`, payload),
  updateProductImage: (productId, imageId, payload) => api.patch(`/admin/products/${productId}/images/${imageId}/`, payload),
  getInventoryBalances: (params) => api.get(`/admin/inventory/${buildAdminQuery(params)}`),
  adjustInventory: (payload) => api.post("/admin/inventory/", payload),
  getInventoryMovements: (params) => api.get(`/admin/inventory/movements/${buildAdminQuery(params)}`),
  getAuditLogs: (params) => api.get(`/admin/audit-logs/${buildAdminQuery(params)}`),
};
