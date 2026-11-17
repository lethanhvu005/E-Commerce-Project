/**
 * Shared validation (Vietnam phone & Gmail/Email) and browser Geolocation -> Reverse Geocoding helper.
 */

const STRICT_EMAIL_REGEX = /^[a-zA-Z0-9]+([._%+-][a-zA-Z0-9]+)*@([a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$/;
const GMAIL_TYPO_DOMAINS = new Set([
  "gmai.com",
  "gmial.com",
  "gmal.com",
  "gmail.co",
  "gmail.vn",
  "gmail.con",
  "gmail.cm",
  "gamil.com",
  "gnail.com",
]);

export function normalizeVietnamPhone(raw = "") {
  let cleaned = String(raw || "").trim().replace(/[\s.\-()]+/g, "");
  if (cleaned.startsWith("+84")) {
    cleaned = "0" + cleaned.slice(3);
  } else if (cleaned.startsWith("84") && cleaned.length === 11) {
    cleaned = "0" + cleaned.slice(2);
  }
  return cleaned;
}

export function validateVietnamPhone(raw = "", { allowEmpty = false } = {}) {
  const trimmed = String(raw || "").trim();
  if (!trimmed) {
    if (allowEmpty) return { valid: true, normalized: "", error: "" };
    return {
      valid: false,
      normalized: "",
      error: "Vui lòng nhập số điện thoại (10 chữ số, bắt đầu bằng 03, 05, 07, 08 hoặc 09).",
    };
  }
  const normalized = normalizeVietnamPhone(trimmed);
  if (!/^0[35789]\d{8}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error:
        "Số điện thoại không đúng định dạng. Vui lòng nhập đúng 10 chữ số di động Việt Nam (bắt đầu bằng 03, 05, 07, 08, 09 — VD: 0947243014).",
    };
  }
  return { valid: true, normalized, error: "" };
}

export function validateEmailAddress(raw = "", { requireGmail = false } = {}) {
  const email = String(raw || "").trim().toLowerCase();
  if (!email) {
    return {
      valid: false,
      normalized: "",
      error: requireGmail
        ? "Vui lòng nhập địa chỉ Gmail của bạn (VD: tenban@gmail.com)."
        : "Vui lòng nhập địa chỉ email hợp lệ.",
    };
  }
  if (!STRICT_EMAIL_REGEX.test(email)) {
    return {
      valid: false,
      normalized: email,
      error: requireGmail
        ? "Địa chỉ Gmail không đúng định dạng (VD: tenban@gmail.com, không chứa khoảng trắng hoặc ký tự đặc biệt sai quy chuẩn)."
        : "Địa chỉ email không đúng định dạng (VD: tenban@gmail.com).",
    };
  }
  const [localPart, domain] = email.split("@");
  if (GMAIL_TYPO_DOMAINS.has(domain)) {
    return {
      valid: false,
      normalized: email,
      error: `Tên miền "@${domain}" không hợp lệ. Ý của bạn có phải là "${localPart}@gmail.com"?`,
    };
  }
  if (requireGmail && domain !== "gmail.com") {
    return {
      valid: false,
      normalized: email,
      error: "Vui lòng sử dụng địa chỉ Gmail chính thức có đuôi @gmail.com (VD: tenban@gmail.com).",
    };
  }
  if (domain === "gmail.com" && localPart.replace(/\./g, "").length < 3) {
    return {
      valid: false,
      normalized: email,
      error: "Tên tài khoản Gmail trước ký tự @ quá ngắn (tối thiểu 3 ký tự).",
    };
  }
  return { valid: true, normalized: email, error: "" };
}

/**
 * Get current GPS coordinates from browser and reverse-geocode into { address, ward, province, displayName }.
 */
export function fetchCurrentLocationAddress() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Trình duyệt của bạn không hỗ trợ định vị GPS."));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
            latitude
          )}&lon=${encodeURIComponent(longitude)}&accept-language=vi&addressdetails=1`;
          const response = await fetch(url, {
            headers: {
              Accept: "application/json",
            },
          });
          if (!response.ok) {
            throw new Error("Không thể tra cứu tên đường từ tọa độ hiện tại.");
          }
          const data = await response.json();
          const addr = data?.address || {};

          const streetParts = [
            addr.house_number,
            addr.road || addr.pedestrian || addr.residential || addr.hamlet || addr.neighbourhood,
          ].filter(Boolean);

          const ward =
            addr.suburb ||
            addr.quarter ||
            addr.village ||
            addr.town ||
            addr.city_district ||
            addr.municipality ||
            "";

          const province =
            addr.city ||
            addr.state ||
            addr.province ||
            addr.county ||
            "";

          const rawDisplayParts = String(data?.display_name || "")
            .split(",")
            .map((s) => s.trim())
            .filter(Boolean);

          const addressLine =
            streetParts.join(" ").trim() ||
            rawDisplayParts.slice(0, 2).join(", ") ||
            `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;

          const resolvedWard =
            ward || (rawDisplayParts.length >= 3 ? rawDisplayParts[2] : "Phường trung tâm");
          const resolvedProvince =
            province ||
            (rawDisplayParts.length >= 2
              ? rawDisplayParts[rawDisplayParts.length - 2]
              : "Việt Nam");

          resolve({
            address: addressLine,
            ward: resolvedWard,
            province: resolvedProvince,
            latitude,
            longitude,
            displayName: data?.display_name || `${addressLine}, ${resolvedWard}, ${resolvedProvince}`,
          });
        } catch (err) {
          reject(
            new Error(
              err?.message ||
                "Đã lấy được tọa độ nhưng không thể phân giải tên đường tự động. Vui lòng nhập tay."
            )
          );
        }
      },
      (geoErr) => {
        if (geoErr?.code === 1) {
          reject(
            new Error(
              "Bạn đã từ chối quyền truy cập vị trí. Vui lòng cho phép quyền Vị trí (Location) trên thanh địa chỉ trình duyệt."
            )
          );
        } else if (geoErr?.code === 2) {
          reject(new Error("Không xác định được vị trí hiện tại của thiết bị."));
        } else if (geoErr?.code === 3) {
          reject(new Error("Quá thời gian chờ lấy vị trí GPS. Vui lòng thử lại."));
        } else {
          reject(new Error("Không thể lấy vị trí hiện tại. Vui lòng kiểm tra cài đặt trình duyệt."));
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
