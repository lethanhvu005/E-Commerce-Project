import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBox, Toast } from "../components/Feedback";
import { validateEmailAddress, validateVietnamPhone } from "../utils/validationAndLocation";

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

describe("Large error feedback", () => {
  test("ErrorBox renders a large alert card with the message and retry", () => {
    const onRetry = jest.fn();
    render(<ErrorBox error={new Error("Số điện thoại không đúng định dạng.")} onRetry={onRetry} />);
    expect(screen.getByRole("alert")).toHaveClass("nexa-error-card");
    expect(screen.getByRole("heading", { name: /đã xảy ra lỗi/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /thử lại/i }));
    expect(onRetry).toHaveBeenCalled();
  });

  test("ErrorBox surfaces DRF field errors from payload", () => {
    const err = Object.assign(new Error("Bad Request"), { payload: { phone: ["Sai định dạng SĐT."] } });
    render(<ErrorBox error={err} />);
    expect(screen.getByText("Sai định dạng SĐT.")).toBeInTheDocument();
  });

  test("Toast shows error messages as a centered alert dialog and success as a compact toast", () => {
    const onClose = jest.fn();
    const { rerender } = render(<Toast message="Không thể thêm địa chỉ." onClose={onClose} />);
    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /đã hiểu/i }));
    expect(onClose).toHaveBeenCalled();

    rerender(<Toast message="Đã lưu địa chỉ mới." onClose={onClose} />);
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Đã lưu địa chỉ mới.");
  });
});
