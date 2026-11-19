import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import * as apiClient from "../api/client";
import ProductCard from "../components/ProductCard";
import AdminLayout from "../components/admin/AdminLayout";
import AdminDashboardPage from "../pages/AdminDashboardPage";
import AdminInventoryPage from "../pages/AdminInventoryPage";
import { AdminAnalyticsPage, AdminUnavailablePage } from "../pages/AdminUnavailablePages";
import CartPage from "../pages/CartPage";
import HomePage from "../pages/HomePage";

let mockAuthState = {
  user: {
    id: 1,
    email: "admin@nexa.vn",
    first_name: "Admin",
    last_name: "NEXA",
    is_staff: true,
    is_superuser: true,
    permissions: [],
  },
  loading: false,
  logout: jest.fn(),
};

jest.mock("../auth/AuthContext", () => ({
  useAuth: () => mockAuthState,
}));

jest.mock("../components/Motion3D", () => ({
  Tilt3DCard: ({ children, as: Component = "div", className = "", to, ...rest }) =>
    Component === "div" ? (
      <div className={className} {...rest}>
        {children}
      </div>
    ) : (
      <Component className={className} to={to} {...rest}>
        {children}
      </Component>
    ),
  QuickViewModal: () => null,
  useLenisSmoothScroll: () => {},
  useGsapGridStagger: () => {},
  useGsapStudioAnimation: () => {},
}));

jest.mock("../api/client", () => {
  const actual = jest.requireActual("../api/client");
  return {
    ...actual,
    adminService: {
      getDashboard: jest.fn(),
      getAnalytics: jest.fn(),
      getOrders: jest.fn(),
      updateOrderStatus: jest.fn(),
      confirmOrderPayment: jest.fn(),
      releaseExpiredReservations: jest.fn(),
      getCustomers: jest.fn(),
      getCustomerDetail: jest.fn(),
      setCustomerStatus: jest.fn(),
      getPromotions: jest.fn(),
      createPromotion: jest.fn(),
      updatePromotion: jest.fn(),
      setPromotionStatus: jest.fn(),
      getReviews: jest.fn(),
      getQuestions: jest.fn(),
      getQuestionAnswers: jest.fn(),
      replyToQuestion: jest.fn(),
      moderateItem: jest.fn(),
      getOutboxEvents: jest.fn(),
      retryOutboxEvent: jest.fn(),
      getProducts: jest.fn(),
      createProduct: jest.fn(),
      updateProduct: jest.fn(),
      createProductVariant: jest.fn(),
      updateProductVariant: jest.fn(),
      createProductImage: jest.fn(),
      updateProductImage: jest.fn(),
      getInventoryBalances: jest.fn(),
      adjustInventory: jest.fn(),
      getInventoryMovements: jest.fn(),
      getAuditLogs: jest.fn(),
    },
    catalogService: {
      getHomeBanners: jest.fn(),
      getCategories: jest.fn(),
      getBrands: jest.fn(),
      getCollections: jest.fn(),
      getProducts: jest.fn(),
      getProductDetail: jest.fn(),
    },
    cartService: {
      getCart: jest.fn(),
      addItem: jest.fn(),
      updateItem: jest.fn(),
      removeItem: jest.fn(),
      applyVoucher: jest.fn(),
      removeVoucher: jest.fn(),
    },
    orderService: {
      getShippingMethods: jest.fn(),
    },
    wishlistService: {
      addWishlist: jest.fn(),
      removeWishlist: jest.fn(),
    },
  };
});

function LocationProbe() {
  const loc = useLocation();
  return <div data-testid="loc-probe">{`${loc.pathname}${loc.search}`}</div>;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.scrollTo = jest.fn();
  mockAuthState = {
    user: {
      id: 1,
      email: "admin@nexa.vn",
      first_name: "Admin",
      last_name: "NEXA",
      is_staff: true,
      is_superuser: true,
      permissions: [],
    },
    loading: false,
    logout: jest.fn(),
  };
});

describe("#17 AdminAnalyticsPage & AdminDashboardPage", () => {
  test("renders VN timezone metrics, definitions, and date filters", async () => {
    apiClient.adminService.getAnalytics.mockResolvedValue({
      timezone: "Asia/Ho_Chi_Minh",
      paid_revenue: "1500000",
      revenue: "1500000",
      gross_order_value: "3200000",
      refund_amount: "200000",
      net_revenue: "1500000",
      orders_count: 3,
      avg_order_value: "1066667",
      customers_count: 10,
      daily_series: [
        {
          day: "2026-11-14",
          orders: 2,
          gross_order_value: "2200000",
          paid_revenue: "1500000",
          refund_amount: "200000",
          net_revenue: "1500000",
          revenue: "1500000",
        },
      ],
      metric_definitions: {
        paid_revenue: "Tổng Payment status=succeeded",
      },
    });

    render(
      <MemoryRouter initialEntries={["/admin/analytics"]}>
        <Routes>
          <Route path="/admin/analytics" element={<AdminAnalyticsPage />} />
        </Routes>
      </MemoryRouter>
    );

    expect(await screen.findByText(/Tổng Payment status=succeeded/)).toBeInTheDocument();
    expect(screen.getAllByText(/Doanh thu đã thanh toán/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Tổng giá trị đơn \(GMV\)/i)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText(/Từ ngày/i), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText(/Đến ngày/i), { target: { value: "2026-11-14" } });
    fireEvent.click(screen.getByRole("button", { name: /^Áp dụng$/i }));

    await waitFor(() =>
      expect(apiClient.adminService.getAnalytics).toHaveBeenCalledWith({
        start_date: "2026-11-01",
        end_date: "2026-11-14",
      })
    );

    fireEvent.change(screen.getByLabelText(/Từ ngày/i), { target: { value: "2026-11-20" } });
    fireEvent.change(screen.getByLabelText(/Đến ngày/i), { target: { value: "2026-11-10" } });
    fireEvent.click(screen.getByRole("button", { name: /^Áp dụng$/i }));

    expect(await screen.findByText(/Ngày bắt đầu không được lớn hơn ngày kết thúc/i)).toBeInTheDocument();
  });

  test("AdminDashboardPage renders cross-links and surfaces analytics API failure", async () => {
    apiClient.adminService.getDashboard.mockResolvedValue({
      revenue: "900000",
      paid_revenue: "900000",
      gross_order_value: "1800000",
      orders_count: 2,
      customers_count: 5,
      low_stock_count: 1,
      orders_by_status: [{ status: "confirmed", count: 2 }],
      recent_orders: [
        {
          public_id: "ord-1",
          order_number: "NX-1001",
          user__email: "khach@nexa.vn",
          status: "confirmed",
          grand_total: "900000",
          created_at: "2026-11-14T10:00:00+07:00",
        },
      ],
      low_stock_items: [
        {
          variant_id: 9,
          sku: "SKU-LOW-9",
          product_name: "Chuột Gaming",
          on_hand: 3,
          reserved: 1,
          available: 2,
          low_stock_threshold: 5,
        },
      ],
    });
    apiClient.adminService.getInventoryBalances.mockResolvedValue({ results: [] });
    apiClient.adminService.getAnalytics.mockRejectedValue(new Error("Thiếu quyền analytics"));

    render(
      <MemoryRouter>
        <AdminDashboardPage />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Thiếu quyền analytics/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /#NX-1001/i })).toHaveAttribute(
      "href",
      "/admin/orders?q=NX-1001"
    );
    expect(screen.getByRole("link", { name: /khach@nexa.vn/i })).toHaveAttribute(
      "href",
      "/admin/customers?q=khach%40nexa.vn"
    );
    expect(screen.getByRole("link", { name: /SKU-LOW-9/i })).toHaveAttribute(
      "href",
      "/admin/inventory?q=SKU-LOW-9"
    );
  });
});

describe("#18 AdminPromotionsPage", () => {
  test("creates, edits, toggles status, and displays DRF 400 errors", async () => {
    apiClient.adminService.getPromotions.mockResolvedValue({
      count: 1,
      results: [
        {
          id: 5,
          code: "SALE10",
          kind: "percent",
          value: "10",
          used_count: 4,
          usage_limit: 50,
          per_user_limit: 1,
          starts_at: "2026-11-01T00:00:00+07:00",
          ends_at: "2026-12-31T23:59:59+07:00",
          is_active: true,
        },
      ],
    });
    apiClient.adminService.setPromotionStatus.mockResolvedValue({ id: 5, is_active: false });
    apiClient.adminService.createPromotion.mockRejectedValueOnce({
      message: "Dữ liệu không hợp lệ",
      payload: { code: ["Mã voucher đã tồn tại."] },
    });
    apiClient.adminService.createPromotion.mockResolvedValueOnce({ id: 6, code: "NEW20" });

    render(
      <MemoryRouter initialEntries={["/admin/promotions"]}>
        <AdminUnavailablePage type="promotions" />
      </MemoryRouter>
    );

    expect(await screen.findByText("SALE10")).toBeInTheDocument();
    expect(screen.getByText("4 / 50")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^Tắt$/i }));
    await waitFor(() =>
      expect(apiClient.adminService.setPromotionStatus).toHaveBeenCalledWith(5, false)
    );

    fireEvent.click(screen.getByRole("button", { name: /Tạo voucher/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Mã voucher/i), { target: { value: "SALE10" } });
    fireEvent.change(within(dialog).getByLabelText(/Ngày kết thúc/i), { target: { value: "2026-12-31" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Tạo voucher$/i }));

    expect(await screen.findAllByText(/Mã voucher đã tồn tại/i)).not.toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText(/Mã voucher/i), { target: { value: "NEW20" } });
    fireEvent.click(within(dialog).getByRole("button", { name: /^Tạo voucher$/i }));
    await waitFor(() =>
      expect(apiClient.adminService.createPromotion).toHaveBeenCalledTimes(2)
    );
  });
});

describe("#19 Moderation Reviews & Support Q&A", () => {
  test("moderates review with explicit reject reason", async () => {
    apiClient.adminService.getReviews.mockResolvedValue({
      count: 1,
      results: [
        {
          id: 11,
          author: "Khách A",
          product_name: "Bàn phím Pro",
          stars: 5,
          body: "Rất tốt",
          status: "pending",
          is_verified_buyer: true,
        },
      ],
    });
    apiClient.adminService.moderateItem.mockResolvedValue({ id: 11, status: "rejected" });

    render(
      <MemoryRouter initialEntries={["/admin/reviews"]}>
        <AdminUnavailablePage type="reviews" />
      </MemoryRouter>
    );

    expect(await screen.findByText("Rất tốt")).toBeInTheDocument();
    const rejectButtons = screen.getAllByRole("button", { name: /^Từ chối$/i });
    fireEvent.click(rejectButtons[rejectButtons.length - 1]);

    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Lý do từ chối/i), {
      target: { value: "Spam quảng cáo" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Xác nhận/i }));

    await waitFor(() =>
      expect(apiClient.adminService.moderateItem).toHaveBeenCalledWith("reviews", 11, {
        status: "rejected",
        reason: "Spam quảng cáo",
      })
    );
  });

  test("opens support question detail, displays staff badge, and posts staff reply", async () => {
    apiClient.adminService.getQuestions.mockResolvedValue({
      count: 1,
      results: [
        {
          id: 21,
          customer: "Minh",
          product_name: "Chuột Ultra",
          body: "Có hỗ trợ macOS không?",
          answers_count: 1,
          pending_answers_count: 1,
          status: "pending",
        },
      ],
    });
    apiClient.adminService.getQuestionAnswers.mockResolvedValue({
      results: [
        {
          id: 31,
          author: "NV Kỹ Thuật",
          is_staff_answer: true,
          body: "Hỗ trợ đầy đủ macOS.",
          status: "published",
        },
      ],
    });
    apiClient.adminService.replyToQuestion.mockResolvedValue({ id: 32, status: "published" });

    render(
      <MemoryRouter initialEntries={["/admin/support"]}>
        <AdminUnavailablePage type="support" />
      </MemoryRouter>
    );

    expect(await screen.findByText(/Có hỗ trợ macOS không/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Chi tiết \/ Trả lời/i }));

    const dialog = await screen.findByRole("dialog");
    expect(await within(dialog).findByText("Nhân viên NEXA")).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/Trả lời chính thức/i), {
      target: { value: "Cắm USB receiver dùng ngay trên macOS." },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Gửi phản hồi/i }));

    await waitFor(() =>
      expect(apiClient.adminService.replyToQuestion).toHaveBeenCalledWith(
        21,
        "Cắm USB receiver dùng ngay trên macOS."
      )
    );
  });
});

describe("#20 AdminCustomersPage", () => {
  test("shows customer detail modal, enforces RBAC/self-lock guards, and locks with reason", async () => {
    mockAuthState.user = {
      id: 1,
      email: "staff@nexa.vn",
      is_staff: true,
      is_superuser: false,
      permissions: ["accounts.view_user", "accounts.change_user", "orders.view_order"],
    };
    apiClient.adminService.getCustomers.mockResolvedValue({
      count: 3,
      results: [
        {
          id: 1,
          email: "staff@nexa.vn",
          full_name: "Chính mình",
          role: "Quản trị / Nhân viên",
          is_staff: true,
          is_superuser: false,
          orders_count: 0,
          customer_paid_total: "0",
          gross_order_value: "0",
          is_active: true,
        },
        {
          id: 2,
          email: "boss@nexa.vn",
          full_name: "Sếp Admin",
          role: "Quản trị / Nhân viên",
          is_staff: true,
          is_superuser: true,
          orders_count: 1,
          customer_paid_total: "100000",
          gross_order_value: "100000",
          is_active: true,
        },
        {
          id: 3,
          email: "buyer@nexa.vn",
          full_name: "Nguyễn Văn Mua",
          role: "Khách hàng thành viên",
          is_staff: false,
          is_superuser: false,
          orders_count: 2,
          customer_paid_total: "850000",
          gross_order_value: "1200000",
          is_active: true,
        },
      ],
    });
    apiClient.adminService.getCustomerDetail.mockResolvedValue({
      id: 3,
      email: "buyer@nexa.vn",
      full_name: "Nguyễn Văn Mua",
      phone: "0909000111",
      is_active: true,
      orders_count: 2,
      customer_paid_total: "850000",
      refunded_total: "0",
      addresses_count: 1,
      recent_orders: [
        {
          public_id: "o-3",
          order_number: "NX-3003",
          status: "delivered",
          grand_total: "850000",
          created_at: "2026-11-12T10:00:00+07:00",
        },
      ],
    });
    apiClient.adminService.setCustomerStatus.mockResolvedValue({
      id: 3,
      is_active: false,
      revoked_refresh_tokens: 2,
    });

    render(
      <MemoryRouter initialEntries={["/admin/customers"]}>
        <AdminUnavailablePage type="customers" />
      </MemoryRouter>
    );

    expect(await screen.findByText("buyer@nexa.vn")).toBeInTheDocument();

    const lockButtons = screen.getAllByRole("button", { name: /^Khóa$/i });
    expect(lockButtons[0]).toBeDisabled(); // self
    expect(lockButtons[1]).toBeDisabled(); // non-superuser vs superuser
    expect(lockButtons[2]).not.toBeDisabled(); // customer

    const detailButtons = screen.getAllByRole("button", { name: /^Chi tiết$/i });
    fireEvent.click(detailButtons[2]);
    expect(await screen.findByText("#NX-3003")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /^Đóng$/i }));

    fireEvent.click(lockButtons[2]);
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Lý do khóa/i), {
      target: { value: "Gian lận đơn hàng" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /Xác nhận khóa/i }));

    await waitFor(() =>
      expect(apiClient.adminService.setCustomerStatus).toHaveBeenCalledWith(3, {
        is_active: false,
        reason: "Gian lận đơn hàng",
      })
    );
  });
});

describe("#24 AdminSettingsLogsPanel", () => {
  test("separates Audit and Outbox tabs with independent pages, surfaces 403/404, and retries failed event", async () => {
    apiClient.adminService.getAuditLogs.mockResolvedValue({
      count: 60,
      next: "?page=2",
      results: [
        {
          id: 1,
          created_at: "2026-11-14T09:00:00+07:00",
          actor_email: "admin@nexa.vn",
          action: "order.confirmed",
          entity_type: "Order",
          entity_id: "12",
          changes: { from: "pending", to: "confirmed" },
        },
      ],
    });
    apiClient.adminService.getOutboxEvents.mockResolvedValue({
      count: 1,
      next: null,
      summary: { pending: 0, processing: 0, sent: 0, failed: 1 },
      results: [
        {
          id: 88,
          created_at: "2026-11-14T09:10:00+07:00",
          topic: "order.confirmed",
          aggregate_id: "NX-88",
          attempts: 5,
          last_error_code: "TimeoutError",
          status: "failed",
        },
      ],
    });
    apiClient.adminService.retryOutboxEvent.mockResolvedValue({ id: 88, status: "pending" });

    render(
      <MemoryRouter initialEntries={["/admin/settings"]}>
        <LocationProbe />
        <AdminUnavailablePage type="settings" />
      </MemoryRouter>
    );

    expect(await screen.findByText(/order\.confirmed/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /Nhật ký & Sự kiện hệ thống/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Sau →/i }));
    await waitFor(() =>
      expect(screen.getByTestId("loc-probe").textContent).toContain("audit_page=2")
    );

    fireEvent.click(screen.getByRole("button", { name: /Hàng đợi Outbox Events/i }));
    expect(await screen.findByText("TimeoutError")).toBeInTheDocument();
    expect(screen.getByTestId("loc-probe").textContent).toContain("tab=outbox");
    expect(screen.getByTestId("loc-probe").textContent).toContain("audit_page=2");

    fireEvent.click(screen.getByRole("button", { name: /Thử gửi lại/i }));
    await waitFor(() =>
      expect(apiClient.adminService.retryOutboxEvent).toHaveBeenCalledWith(88)
    );

    apiClient.adminService.getOutboxEvents.mockRejectedValueOnce({ status: 403, message: "Forbidden 403" });
    fireEvent.click(screen.getByRole("button", { name: /Làm mới từ Database/i }));
    expect(await screen.findByText(/Forbidden 403/i)).toBeInTheDocument();
  });
});

describe("#25 HomePage & ProductCard", () => {
  test("HomePage uses server-side category pagination, picture desktop/mobile keys without -day swaps, and neutral error fallback", async () => {
    apiClient.catalogService.getHomeBanners.mockResolvedValue({
      results: [
        {
          id: 10,
          title: "Chiến dịch Mùa Đông",
          subtitle: "Hiệu năng vượt trội",
          desktop_image_key: "assets/images/banner-custom-desktop.webp",
          mobile_image_key: "assets/images/banner-custom-mobile.webp",
          link_path: "/products",
        },
      ],
    });
    apiClient.catalogService.getCategories.mockResolvedValue({
      results: [{ id: 1, name: "Bàn phím", slug: "ban-phim", product_count: 14 }],
    });
    apiClient.catalogService.getBrands.mockResolvedValue({ results: [] });
    apiClient.catalogService.getCollections.mockResolvedValue({ results: [] });
    apiClient.catalogService.getProducts.mockResolvedValue({
      count: 25,
      results: [
        {
          id: 101,
          slug: "keychron-q1",
          name: "Keychron Q1",
          category: { slug: "ban-phim", name: "Bàn phím" },
          brand: { name: "Keychron" },
          min_price: 4200000,
          cover_image: "assets/images/broken-image.png",
        },
      ],
    });

    const { container } = render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Tất cả (25)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bàn phím (14)" })).toBeInTheDocument();

    expect(apiClient.catalogService.getProducts).toHaveBeenCalledWith({
      page: 1,
      page_size: 15,
      ordering: "-created_at",
      in_stock: "true",
    });

    const sourceEl = container.querySelector("picture source");
    const bannerImg = container.querySelector("picture img");
    expect(sourceEl).toHaveAttribute("srcset", expect.stringContaining("banner-custom-mobile.webp"));
    expect(bannerImg).toHaveAttribute("src", expect.stringContaining("banner-custom-desktop.webp"));

    fireEvent.click(screen.getByRole("button", { name: "Bàn phím (14)" }));
    await waitFor(() =>
      expect(apiClient.catalogService.getProducts).toHaveBeenCalledWith({
        category: "ban-phim",
        page: 1,
        page_size: 15,
        ordering: "-created_at",
        in_stock: "true",
      })
    );

    fireEvent.click(screen.getByRole("button", { name: /Trang tiếp theo/i }));
    await waitFor(() =>
      expect(apiClient.catalogService.getProducts).toHaveBeenCalledWith({
        category: "ban-phim",
        page: 2,
        page_size: 15,
        ordering: "-created_at",
        in_stock: "true",
      })
    );
  });

  test("ProductCard falls back neutrally keeping product alt label on image error", () => {
    render(
      <MemoryRouter>
        <ProductCard
          product={{
            id: 50,
            slug: "mouse-broken",
            name: "Chuột Test Fallback",
            category: { slug: "chuot", name: "Chuột" },
            min_price: 990000,
            cover_image: "assets/images/does-not-exist.png",
          }}
        />
      </MemoryRouter>
    );

    const img = screen.getByAltText("Chuột Test Fallback");
    fireEvent.error(img);
    expect(screen.getByRole("img", { name: "Chuột Test Fallback" })).toHaveClass("image-empty");
  });
});

describe("#26 CartPage shipping progress accuracy", () => {
  test("never shows 100% or free shipping when methods omit free_threshold or while loading", async () => {
    mockAuthState.user = { id: 2, email: "user@nexa.vn" };
    apiClient.cartService.getCart.mockResolvedValue({
      items: [
        {
          id: 1,
          product_name: "Lót chuột",
          product_slug: "lot-chuot",
          variant_sku: "PAD-1",
          unit_price: 200000,
          quantity: 1,
          line_total: 200000,
          available_stock: 10,
        },
      ],
      subtotal: 200000,
      discount_amount: 0,
      total_after_discount: 200000,
      voucher: null,
    });
    apiClient.orderService.getShippingMethods.mockResolvedValue([
      { code: "standard", name: "Tiêu chuẩn", base_fee: 30000, free_threshold: null },
      { code: "express", name: "Hỏa tốc", base_fee: 60000, free_threshold: null },
    ]);

    render(
      <MemoryRouter>
        <CartPage />
      </MemoryRouter>
    );

    expect(await screen.findByText("Tổng tạm tính")).toBeInTheDocument();
    expect(screen.getByText(/Các phương thức giao hàng hiện áp dụng/i)).toBeInTheDocument();
    expect(screen.queryByText(/Miễn phí vận chuyển \(100%\)/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/100%/i)).not.toBeInTheDocument();
  });
});

describe("#27 AdminLayout URL navigation & sidebar label", () => {
  test("renames Settings nav to Nhật ký & Sự kiện and scopes topbar search appropriately", () => {
    render(
      <MemoryRouter initialEntries={["/admin/orders?status=pending"]}>
        <Routes>
          <Route path="/admin" element={<AdminLayout />}>
            <Route path="orders" element={<LocationProbe />} />
            <Route path="customers" element={<LocationProbe />} />
            <Route path="dashboard" element={<LocationProbe />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByRole("link", { name: /Nhật ký & Sự kiện/i })).toHaveAttribute(
      "href",
      "/admin/settings"
    );

    const searchInput = screen.getByLabelText(/Tìm nhanh admin/i);
    fireEvent.change(searchInput, { target: { value: "NX-99" } });
    fireEvent.submit(searchInput.closest("form"));
    expect(screen.getByTestId("loc-probe").textContent).toBe("/admin/orders?status=pending&q=NX-99");
  });
});

describe("AdminInventoryPage request scoping", () => {
  test("loads only the dataset required by the active tab", async () => {
    apiClient.adminService.getInventoryBalances.mockResolvedValue({
      count: 0,
      next: null,
      results: [],
      summary: { total_on_hand: 0, total_reserved: 0, total_available: 0, total_skus: 0 },
    });
    apiClient.adminService.getInventoryMovements.mockResolvedValue({ results: [] });
    apiClient.adminService.getAuditLogs.mockResolvedValue({ results: [] });

    render(
      <MemoryRouter initialEntries={["/admin/inventory"]}>
        <AdminInventoryPage />
      </MemoryRouter>
    );

    await waitFor(() => expect(apiClient.adminService.getInventoryBalances).toHaveBeenCalledTimes(1));
    expect(apiClient.adminService.getInventoryMovements).not.toHaveBeenCalled();
    expect(apiClient.adminService.getAuditLogs).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Lịch sử biến động kho/i }));
    await waitFor(() => expect(apiClient.adminService.getInventoryMovements).toHaveBeenCalledTimes(1));
    expect(apiClient.adminService.getAuditLogs).not.toHaveBeenCalled();
  });
});
