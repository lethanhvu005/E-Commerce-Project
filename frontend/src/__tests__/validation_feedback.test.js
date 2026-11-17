import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBox, Toast } from "../components/Feedback";
import {
  fetchCurrentLocationAddress,
  validateEmailAddress,
  validateVietnamPhone,
} from "../utils/validationAndLocation";

describe("Vietnam phone validation", () => {
  test("accepts valid mobile numbers and normalizes +84", () => {
    expect(validateVietnamPhone("0947243014").valid).toBe(true);
    expect(validateVietnamPhone("+84 947 243 014").normalized).toBe("0947243014");
  });

  test("rejects wrong length, landline prefixes and letters", () => {
    expect(validateVietnamPhone("12345").valid).toBe(false);
    expect(validateVietnamPhone("0123456789").valid).toBe(false);
    expect(validateVietnamPhone("09472abc14").valid).toBe(false);
    expect(validateVietnamPhone("").valid).toBe(false);
    expect(validateVietnamPhone("", { allowEmpty: true }).valid).toBe(true);
  });
});

describe("Email validation", () => {
  test("accepts normal addresses and lowercases", () => {
    const r = validateEmailAddress("  Ten.Ban@Gmail.com ");
    expect(r.valid).toBe(true);
    expect(r.normalized).toBe("ten.ban@gmail.com");
  });

  test("rejects malformed addresses and common Gmail typos", () => {
    expect(validateEmailAddress("not-an-email").valid).toBe(false);
    expect(validateEmailAddress("a b@gmail.com").valid).toBe(false);
    const typo = validateEmailAddress("abc@gmai.com");
    expect(typo.valid).toBe(false);
    expect(typo.error).toMatch(/gmail\.com/);
    expect(validateEmailAddress("abc@yahoo.com", { requireGmail: true }).valid).toBe(false);
  });
});

describe("Compact inline error feedback", () => {
  test("ErrorBox always renders a compact inline banner without large modal/card chrome", () => {
    const onRetry = jest.fn();
    render(<ErrorBox error={new Error("Số điện thoại không đúng định dạng.")} onRetry={onRetry} />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("nexa-error-banner");
    expect(alert).not.toHaveClass("nexa-error-card");
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /thử lại/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  test("ErrorBox surfaces DRF field errors and translates raw Failed to fetch", () => {
    const err = Object.assign(new Error("Bad Request"), { payload: { phone: ["Sai định dạng SĐT."] } });
    const { rerender } = render(<ErrorBox error={err} />);
    expect(screen.getByText("Sai định dạng SĐT.")).toBeInTheDocument();

    rerender(<ErrorBox error={new TypeError("Failed to fetch")} />);
    expect(screen.queryByText(/^Failed to fetch$/i)).not.toBeInTheDocument();
    expect(screen.getByText(/Không thể kết nối đến máy chủ/i)).toBeInTheDocument();
  });

  test("Toast always stays compact (no giant centered modal dialog)", () => {
    const onClose = jest.fn();
    const { rerender } = render(<Toast message="Không thể thêm địa chỉ." onClose={onClose} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("alert").firstChild).toHaveClass("warn");
    fireEvent.click(screen.getByRole("button", { name: /đóng/i }));
    expect(onClose).toHaveBeenCalled();

    rerender(<Toast message="Đã lưu địa chỉ mới." onClose={onClose} />);
    expect(screen.getByRole("status")).toHaveTextContent("Đã lưu địa chỉ mới.");
  });
});

describe("Geolocation reverse geocoding fallback", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  test("resolves address cleanly via ArcGIS and falls back to BigDataCloud when first provider fails", async () => {
    Object.defineProperty(global.navigator, "geolocation", {
      configurable: true,
      value: {
        getCurrentPosition: (success) =>
          success({ coords: { latitude: 16.0176, longitude: 108.2504 } }),
      },
    });

    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          locality: "Ngũ Hành Sơn",
          city: "Đà Nẵng",
          principalSubdivision: "Đà Nẵng",
        }),
      });

    const loc = await fetchCurrentLocationAddress();
    expect(loc.ward).toBe("Ngũ Hành Sơn");
    expect(loc.province).toBe("Đà Nẵng");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
