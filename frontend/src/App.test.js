import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
import AccountPage from "./pages/AccountPage";
import AuthPage from "./pages/AuthPage";

beforeEach(() => {
  window.scrollTo = jest.fn();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    status: 200,
    headers: { get: () => "application/json" },
    json: async () => ({ results: [], count: 0 }),
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("renders the NEXA storefront shell", async () => {
  render(<App />);
  expect(screen.getAllByRole("link", { name: /nexa/i }).length).toBeGreaterThan(0);
  expect(await screen.findByText(/chưa có banner/i)).toBeInTheDocument();
});

test("disables Google and Facebook OAuth buttons when client IDs are not configured", () => {
  const prevGoogle = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  const prevFacebook = process.env.REACT_APP_FACEBOOK_APP_ID;
  delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
  delete process.env.REACT_APP_FACEBOOK_APP_ID;
  try {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AuthPage mode="login" />
        </MemoryRouter>
      </AuthProvider>
    );
    const googleBtn = screen.getByRole("button", { name: /google \(sắp mở\)/i });
    const facebookBtn = screen.getByRole("button", { name: /facebook \(sắp mở\)/i });
    expect(googleBtn).toBeDisabled();
    expect(facebookBtn).toBeDisabled();
  } finally {
    if (prevGoogle !== undefined) process.env.REACT_APP_GOOGLE_CLIENT_ID = prevGoogle;
    if (prevFacebook !== undefined) process.env.REACT_APP_FACEBOOK_APP_ID = prevFacebook;
  }
});

test("enables Google OAuth button when REACT_APP_GOOGLE_CLIENT_ID is configured", () => {
  const prevGoogle = process.env.REACT_APP_GOOGLE_CLIENT_ID;
  process.env.REACT_APP_GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
  try {
    render(
      <AuthProvider>
        <MemoryRouter>
          <AuthPage mode="login" />
        </MemoryRouter>
      </AuthProvider>
    );
    const googleBtn = screen.getByRole("button", { name: /^google$/i });
    expect(googleBtn).not.toBeDisabled();
  } finally {
    if (prevGoogle !== undefined) {
      process.env.REACT_APP_GOOGLE_CLIENT_ID = prevGoogle;
    } else {
      delete process.env.REACT_APP_GOOGLE_CLIENT_ID;
    }
  }
});

test("Facebook login without email prompts for Gmail and verifies 6-digit OTP", async () => {
  window.FB = {
    init: jest.fn(),
    login: jest.fn((cb) => cb({ authResponse: { accessToken: "fb-token-no-email" } })),
  };

  let currentProfile = {
    id: 99,
    email: null,
    first_name: "Minh",
    last_name: "Le",
    can_edit_email: true,
    is_staff: false,
  };

  global.fetch = jest.fn(async (url) => {
    const u = String(url);
    if (u.includes("/auth/facebook/config/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ app_id: "1531548092145319", enabled: true }),
      };
    }
    if (u.includes("/auth/facebook/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          access: "jwt-access-token",
          refresh: "jwt-refresh-token",
          user: currentProfile,
          requires_email_verification: true,
        }),
      };
    }
    if (u.includes("/accounts/me/email-otp/request/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          detail: "Đã gửi mã xác thực gồm 6 chữ số đến minh.fb@gmail.com.",
          email: "minh.fb@gmail.com",
          expires_in: 600,
          dev_otp: "654321",
        }),
      };
    }
    if (u.includes("/accounts/me/email-otp/verify/")) {
      currentProfile = {
        ...currentProfile,
        email: "minh.fb@gmail.com",
        email_verified_at: "2026-11-17T07:00:00Z",
      };
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          detail: "Đã xác thực và thêm Gmail thành công!",
          user: currentProfile,
        }),
      };
    }
    if (u.includes("/accounts/me/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => currentProfile,
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ results: [], count: 0 }),
    };
  });

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthPage mode="login" />
      </MemoryRouter>
    </AuthProvider>
  );

  const fbBtn = await screen.findByRole("button", { name: /^facebook$/i });
  fireEvent.click(fbBtn);

  // Step 1: Prompts for Gmail
  expect(await screen.findByRole("heading", { name: /bổ sung địa chỉ gmail/i })).toBeInTheDocument();
  const emailInput = screen.getByLabelText(/địa chỉ gmail/i);
  fireEvent.change(emailInput, { target: { value: "minh.fb@gmail.com" } });
  fireEvent.click(screen.getByRole("button", { name: /gửi mã xác thực/i }));

  // Step 2: Prompts for 6-digit OTP
  expect(await screen.findByRole("heading", { name: /xác thực mã otp/i })).toBeInTheDocument();
  const otpInput = screen.getByLabelText(/mã xác thực \(6 chữ số\)/i);
  fireEvent.change(otpInput, { target: { value: "654321" } });
  fireEvent.click(screen.getByRole("button", { name: /xác nhận & hoàn tất/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/accounts/me/email-otp/verify/"),
      expect.anything()
    );
  });
});

test("profile email change requests OTP to old Gmail, then login requires OTP to new Gmail", async () => {
  localStorage.setItem("nexa_tokens", JSON.stringify({ access: "tok-1", refresh: "ref-1" }));
  let currentProfile = {
    id: 55,
    email: "old.user@gmail.com",
    first_name: "Lan",
    last_name: "Tran",
    phone: "0947243014",
    can_edit_email: true,
    requires_email_login_otp: false,
    is_staff: false,
  };

  global.fetch = jest.fn(async (url, init) => {
    const u = String(url);
    if (u.includes("/accounts/me/email-change/request/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          detail: "Đã gửi mã xác nhận gồm 6 chữ số đến Gmail cũ (old.user@gmail.com) để xác nhận đổi sang new.user@gmail.com.",
          old_email: "old.user@gmail.com",
          new_email: "new.user@gmail.com",
        }),
      };
    }
    if (u.includes("/accounts/me/email-change/verify/")) {
      currentProfile = {
        ...currentProfile,
        email: "new.user@gmail.com",
        email_verified_at: null,
        requires_email_login_otp: true,
      };
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({
          detail: "Đã đổi email sang new.user@gmail.com thành công!",
          user: currentProfile,
        }),
      };
    }
    if (u.includes("/accounts/me/addresses/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ results: [] }),
      };
    }
    if (u.includes("/accounts/me/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => currentProfile,
      };
    }
    return {
      ok: true,
      status: 200,
      headers: { get: () => "application/json" },
      json: async () => ({ results: [], count: 0 }),
    };
  });

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/account"]}>
        <AccountPage />
      </MemoryRouter>
    </AuthProvider>
  );

  const editBtn = await screen.findByRole("button", { name: /chỉnh sửa hồ sơ/i });
  fireEvent.click(editBtn);

  fireEvent.change(screen.getByLabelText(/địa chỉ gmail \/ email/i), {
    target: { value: "new.user@gmail.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: /lưu thay đổi/i }));

  expect(await screen.findByText(/đã gửi mã xác nhận gồm 6 chữ số đến gmail cũ/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/mã xác nhận gửi về gmail cũ/i), {
    target: { value: "112233" },
  });
  fireEvent.click(screen.getByRole("button", { name: /xác nhận đổi gmail/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/accounts/me/email-change/verify/"),
      expect.anything()
    );
  });

  // Clean up for next login check
  localStorage.clear();
});

test("login prompts for new-email OTP after email change and forgot password flow resets password", async () => {
  localStorage.clear();
  global.fetch = jest.fn(async (url, init) => {
    const u = String(url);
    const body = init?.body ? JSON.parse(init.body) : {};
    if (u.includes("/auth/facebook/config/")) {
      return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({ enabled: false }) };
    }
    if (u.includes("/auth/login/")) {
      if (!body.otp) {
        return {
          ok: true,
          status: 200,
          headers: { get: () => "application/json" },
          json: async () => ({
            requires_email_verification: true,
            email: "new.user@gmail.com",
            detail: "Đã gửi mã xác nhận gồm 6 chữ số đến new.user@gmail.com.",
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ access: "acc-new", refresh: "ref-new" }),
      };
    }
    if (u.includes("/accounts/me/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ id: 55, email: "new.user@gmail.com", is_staff: false }),
      };
    }
    if (u.includes("/auth/password-reset/request/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ detail: "Mã OTP 6 chữ số đã được gửi tới hộp thư của bạn." }),
      };
    }
    if (u.includes("/auth/password-reset/confirm/")) {
      return {
        ok: true,
        status: 200,
        headers: { get: () => "application/json" },
        json: async () => ({ detail: "Đặt lại mật khẩu thành công!" }),
      };
    }
    return { ok: true, status: 200, headers: { get: () => "application/json" }, json: async () => ({}) };
  });

  const { unmount } = render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/login"]}>
        <AuthPage mode="login" />
      </MemoryRouter>
    </AuthProvider>
  );

  expect(screen.getByRole("link", { name: /quên mật khẩu/i })).toHaveAttribute("href", "/forgot-password");
  fireEvent.change(screen.getByLabelText(/địa chỉ email/i), { target: { value: "new.user@gmail.com" } });
  fireEvent.change(screen.getByLabelText(/mật khẩu/i), { target: { value: "Buyer!Password123" } });
  fireEvent.click(screen.getByRole("button", { name: /đăng nhập/i }));

  expect(await screen.findByRole("heading", { name: /xác nhận email mới/i })).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/mã xác nhận gửi về new\.user@gmail\.com/i), {
    target: { value: "445566" },
  });
  fireEvent.click(screen.getByRole("button", { name: /xác nhận & đăng nhập/i }));

  await waitFor(() => {
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login/"),
      expect.objectContaining({ body: expect.stringContaining('"otp":"445566"') })
    );
  });

  unmount();
  localStorage.clear();

  render(
    <AuthProvider>
      <MemoryRouter initialEntries={["/forgot-password"]}>
        <AuthPage mode="forgot" />
      </MemoryRouter>
    </AuthProvider>
  );

  fireEvent.change(screen.getByLabelText(/địa chỉ email/i), { target: { value: "new.user@gmail.com" } });
  fireEvent.click(screen.getByRole("button", { name: /gửi mã xác nhận/i }));

  expect(await screen.findByLabelText(/mã xác nhận otp/i)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText(/mã xác nhận otp/i), { target: { value: "778899" } });
  fireEvent.change(screen.getByLabelText(/^mật khẩu mới$/i), { target: { value: "NewPass!1234" } });
  fireEvent.change(screen.getByLabelText(/xác nhận mật khẩu mới/i), { target: { value: "NewPass!1234" } });
  fireEvent.click(screen.getByRole("button", { name: /đặt lại mật khẩu/i }));

  expect(await screen.findByText(/đặt lại mật khẩu thành công/i)).toBeInTheDocument();
});
