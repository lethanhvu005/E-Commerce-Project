import { render, screen } from "@testing-library/react";
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
