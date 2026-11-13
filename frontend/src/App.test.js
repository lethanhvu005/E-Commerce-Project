import { render, screen } from "@testing-library/react";
import App from "./App";

beforeEach(() => {
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
