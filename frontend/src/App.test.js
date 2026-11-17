import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./auth/AuthContext";
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
