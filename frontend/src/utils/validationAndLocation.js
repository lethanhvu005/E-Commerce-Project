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

async function fetchJsonWithTimeout(url, options = {}, timeoutMs = 6000) {
  const controller = typeof AbortController !== "undefined" ? new AbortController() : null;
  const timer = controller ? window.setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller ? controller.signal : undefined,
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return await response.json();
  } finally {
    if (timer) window.clearTimeout(timer);
  }
}

async function reverseViaArcGIS(latitude, longitude) {
  const url = `https://geocode.arcgis.com/arcgis/rest/services/World/GeocodeServer/reverseGeocode?location=${encodeURIComponent(
    `${longitude},${latitude}`
  )}&f=json&langCode=vi`;
  const data = await fetchJsonWithTimeout(url, { headers: { Accept: "application/json" } });
  const addr = data?.address;
  if (!addr || (!addr.Address && !addr.Match_addr && !addr.City && !addr.Region)) {
    throw new Error("ArcGIS empty address");
  }
  const addressLine =
    [addr.AddNum, addr.Address].filter(Boolean).join(" ").trim() ||
    addr.ShortLabel ||
    addr.Match_addr ||
    `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
  const ward = addr.Neighborhood || addr.District || addr.City || addr.Subregion || "Phường trung tâm";
  const province = addr.Region || addr.Subregion || addr.City || "Việt Nam";
  return {
    address: addressLine,
    ward,
    province,
    latitude,
    longitude,
    displayName: addr.Match_addr || addr.LongLabel || `${addressLine}, ${ward}, ${province}`,
  };
}

async function reverseViaBigDataCloud(latitude, longitude) {
  const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${encodeURIComponent(
    latitude
  )}&longitude=${encodeURIComponent(longitude)}&localityLanguage=vi`;
  const data = await fetchJsonWithTimeout(url, { headers: { Accept: "application/json" } });
  const ward = data?.locality || "";
  const province = data?.city || data?.principalSubdivision || "";
  if (!ward && !province) {
    throw new Error("BigDataCloud empty address");
  }
  const addressLine = [data?.locality, data?.city || data?.principalSubdivision]
    .filter(Boolean)
    .join(", ");
  return {
    address: addressLine || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
    ward: ward || "Phường trung tâm",
    province: province || "Việt Nam",
    latitude,
    longitude,
    displayName: `${addressLine || province}`,
  };
}

async function reverseViaNominatim(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(
    latitude
  )}&lon=${encodeURIComponent(longitude)}&accept-language=vi&addressdetails=1`;
  const data = await fetchJsonWithTimeout(url, { headers: { Accept: "application/json" } });
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
  const province = addr.city || addr.state || addr.province || addr.county || "";
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

  return {
    address: addressLine,
    ward: resolvedWard,
    province: resolvedProvince,
    latitude,
    longitude,
    displayName: data?.display_name || `${addressLine}, ${resolvedWard}, ${resolvedProvince}`,
  };
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
        const providers = [reverseViaArcGIS, reverseViaBigDataCloud, reverseViaNominatim];
        for (const provider of providers) {
          try {
            const resolved = await provider(latitude, longitude);
            resolve(resolved);
            return;
          } catch {
            // Try next reverse geocoding provider
          }
        }
        reject(
          new Error(
            "Không thể kết nối dịch vụ tra cứu địa chỉ từ tọa độ hiện tại. Vui lòng kiểm tra kết nối mạng hoặc nhập tay địa chỉ."
          )
        );
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
