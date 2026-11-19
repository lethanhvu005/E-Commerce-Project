const CATEGORY_IMAGE_MAP = {
  keyboard: "/assets/images/categories/keyboards.png",
  keyboards: "/assets/images/categories/keyboards.png",
  "ban-phim": "/assets/images/categories/keyboards.png",
  mouse: "/assets/images/categories/mouse.png",
  "chuot": "/assets/images/categories/mouse.png",
  headset: "/assets/images/categories/headset.png",
  "tai-nghe": "/assets/images/categories/headset.png",
  monitor: "/assets/images/categories/monitor.png",
  "man-hinh": "/assets/images/categories/monitor.png",
  accessory: "/assets/images/categories/pad.png",
  pad: "/assets/images/categories/pad.png",
  "phu-kien": "/assets/images/categories/pad.png",
  chair: "/assets/images/categories/desk.png",
  desk: "/assets/images/categories/desk.png",
  "ghe-gaming": "/assets/images/categories/desk.png",
};

const SKU_IMAGE_MAP = {
  "nexa-x75": "/assets/images/categories/keyboards.png",
  "key-k2": "/assets/images/categories/keyboards.png",
  "nexa-s98": "/assets/images/categories/keyboards.png",
  "cor-k70": "/assets/images/categories/keyboards.png",
  "razer-hv3": "/assets/images/categories/keyboards.png",
  "logi-prox-tkl": "/assets/images/categories/keyboards.png",
  "key-q1pro": "/assets/images/categories/keyboards.png",
  "logi-gpx2-hs": "/assets/images/categories/headset.png",
  "logi-gpx2": "/assets/images/categories/mouse.png",
  "logi-g502": "/assets/images/categories/mouse.png",
  "razer-vv3p": "/assets/images/categories/mouse.png",
  "nexa-pulse8k": "/assets/images/categories/mouse.png",
  "cor-m75": "/assets/images/categories/mouse.png",
  "razer-bsv2": "/assets/images/categories/headset.png",
  "hyx-cloud3": "/assets/images/categories/headset.png",
  "nexa-aura71": "/assets/images/categories/headset.png",
  "asus-vg27aq": "/assets/images/categories/monitor.png",
  "nexa-v27": "/assets/images/categories/monitor.png",
  "asus-xg27": "/assets/images/categories/monitor.png",
  "nexa-opt24": "/assets/images/categories/monitor.png",
  "nexa-mat": "/assets/images/categories/pad.png",
  "razer-atlas": "/assets/images/categories/pad.png",
  "nexa-chair": "/assets/images/categories/desk.png",
  "cor-tc100": "/assets/images/categories/desk.png",
};

export function inferImageFromMeta(item) {
  if (!item) return "/assets/images/categories/keyboards.png";

  // 1. Check category code / slug
  const catCode = String(item?.category?.code || item?.category?.slug || item?.category_code || "").toLowerCase();
  if (catCode && CATEGORY_IMAGE_MAP[catCode]) {
    return CATEGORY_IMAGE_MAP[catCode];
  }

  // 2. Check SKU (longest prefix first to avoid logi-gpx2 matching logi-gpx2-hs)
  const rawSku = String(item?.sku || item?.sku_snapshot || item?.variants?.[0]?.sku || "").toLowerCase();
  for (const [skuPrefix, imgPath] of Object.entries(SKU_IMAGE_MAP)) {
    if (rawSku.includes(skuPrefix)) return imgPath;
  }

  // 3. Check product name / slug / category_name keywords
  const text = `${item?.name || ""} ${item?.product_name || ""} ${item?.product_name_snapshot || ""} ${item?.slug || ""} ${item?.product_slug || ""} ${item?.category_name || ""}`.toLowerCase();
  if (/headset|tai nghe|tai-nghe|blackshark|cloud|bsv2|aura/.test(text)) return "/assets/images/categories/headset.png";
  if (/mouse|chuột|chuot|superlight|g502|gpx|viper|pulse|m75/.test(text)) return "/assets/images/categories/mouse.png";
  if (/monitor|màn hình|man-hinh|vision|vg27|v27|xg27|optix|qhd|oled/.test(text)) return "/assets/images/categories/monitor.png";
  if (/chair|ghế|ghe|ergo|tc100/.test(text)) return "/assets/images/categories/desk.png";
  if (/mat|pad|lót bàn|phu-kien|phụ kiện|desk mat|atlas/.test(text)) return "/assets/images/categories/pad.png";
  if (/keyboard|bàn phím|ban-phim|k70|x75|s98|keychron|k2|q1|huntsman|tkl/.test(text)) return "/assets/images/categories/keyboards.png";

  return "/assets/images/categories/keyboards.png";
}

export function assetUrl(value, fallbackItem = null) {
  if (!value) return fallbackItem ? inferImageFromMeta(fallbackItem) : "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const path = String(value).replace(/\\/g, "/").replace(/^\/+/, "");

  // Map legacy seed.sql .svg product/category paths to actual existing PNG assets
  const lower = path.toLowerCase();
  if (lower.startsWith("assets/images/products/") && lower.endsWith(".svg")) {
    const baseName = lower.replace("assets/images/products/", "").replace(".svg", "");
    if (SKU_IMAGE_MAP[baseName]) return SKU_IMAGE_MAP[baseName];
    return inferImageFromMeta({ sku: baseName, ...(fallbackItem || {}) });
  }
  if (lower.startsWith("assets/images/categories/") && lower.endsWith(".svg")) {
    const catBase = lower.replace("assets/images/categories/", "").replace(".svg", "");
    if (CATEGORY_IMAGE_MAP[catBase]) return CATEGORY_IMAGE_MAP[catBase];
  }

  if (path.startsWith("assets/")) return `/${path}`;
  if (path.startsWith("images/")) return `/assets/${path}`;
  return `/assets/images/${path}`;
}

export function fallbackProductImage(product) {
  return inferImageFromMeta(product);
}

export function productImage(product) {
  if (!product) return "/assets/images/categories/keyboards.png";
  const key =
    product?.cover_image?.object_key ||
    (typeof product?.cover_image === "string" ? product.cover_image : "") ||
    product?.images?.find((image) => image.is_cover)?.object_key ||
    product?.images?.[0]?.object_key ||
    product?.image_key ||
    product?.image_url ||
    product?.category?.image_key;

  const resolved = assetUrl(key, product);
  return resolved || inferImageFromMeta(product);
}

export function categoryImage(category) {
  if (!category) return "/assets/images/categories/keyboards.png";
  const resolved = assetUrl(category?.image_key, { category });
  return resolved || inferImageFromMeta({ category });
}

export function money(value, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}

export function dateTime(value) {
  return value ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export function queryString(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== "" && value !== undefined && value !== null) search.set(key, value);
  });
  return search.toString();
}

const ORDER_STATUS_LABELS = {
  pending: "Chờ xác nhận",
  confirmed: "Đã xác nhận",
  packing: "Đang đóng gói",
  processing: "Đang xử lý",
  shipped: "Đang vận chuyển",
  delivered: "Đã giao hàng",
  completed: "Hoàn thành",
  cancelled: "Đã hủy",
  expired: "Hết hạn giữ chỗ",
};

export function orderStatusLabel(status) {
  if (!status) return "Cập nhật";
  return ORDER_STATUS_LABELS[status] || status;
}

const KNOWN_GEAR_BRANDS = [
  "Attack Shark",
  "BigBig Won",
  "SteelSeries",
  "ThundeRobot",
  "PlayStation",
  "DualSense",
  "ViewSonic",
  "Machenike",
  "Ziyoulang",
  "Keychron",
  "Logitech",
  "Flydigi",
  "GameSir",
  "EasySMX",
  "Beitong",
  "GuliKit",
  "Gigabyte",
  "FreeWolf",
  "Nintendo",
  "Zeuslap",
  "Xinmeng",
  "Onikuma",
  "Corsair",
  "Samsung",
  "Edifier",
  "Fantech",
  "8BitDo",
  "Cervus",
  "HyperX",
  "Mchose",
  "INPHIC",
  "Ugreen",
  "Baseus",
  "Langtu",
  "Leaven",
  "Xiaomi",
  "Fifine",
  "Razer",
  "Rapoo",
  "DareU",
  "Maono",
  "Ajazz",
  "E-Dra",
  "Havit",
  "Monka",
  "Betop",
  "ASUS",
  "ROG",
  "TUF",
  "Acer",
  "Dell",
  "Sony",
  "Akko",
  "Aula",
  "Edra",
  "Kzzi",
  "Xbox",
  "MSI",
  "JBL",
  "VGN",
  "VXE",
  "AOC",
  "HKC",
  "PXN",
  "LG",
];

const GENERIC_SUMMARY_KEYWORDS = new Set([
  "tay cầm",
  "tay cầm chơi game",
  "tay cam choi game",
  "bàn phím",
  "bàn phím cơ",
  "bàn phím gaming",
  "ban phim co",
  "chuột",
  "chuột gaming",
  "chuột không dây",
  "chuột máy tính",
  "tai nghe",
  "tai nghe gaming",
  "tai nghe bluetooth",
  "tai nghe chụp tai",
  "màn hình",
  "màn hình máy tính",
  "màn hình gaming",
  "lót chuột",
  "lót chuột gaming",
  "bàn di chuột",
  "webcam",
  "webcam máy tính",
  "webcam học online",
  "microphone",
  "mic thu âm",
  "micro thu âm",
  "gaming gear",
]);

const CATEGORY_DEFAULT_FEATURES = {
  controller: "Kết nối đa nền tảng · Phản hồi nhạy",
  "tay-cam": "Kết nối đa nền tảng · Phản hồi nhạy",
  keyboard: "Switch cơ học · Độ trễ thấp",
  "ban-phim": "Switch cơ học · Độ trễ thấp",
  mouse: "Cảm biến quang học chính xác cao",
  chuot: "Cảm biến quang học chính xác cao",
  headset: "Âm thanh chi tiết · Mic đàm thoại rõ",
  "tai-nghe": "Âm thanh chi tiết · Mic đàm thoại rõ",
  monitor: "Tần số quét cao · Hiển thị sắc nét",
  "man-hinh": "Tần số quét cao · Hiển thị sắc nét",
  "mouse-pad": "Bề mặt dệt mịn · Đế cao su chống trượt",
  "lot-chuot": "Bề mặt dệt mịn · Đế cao su chống trượt",
  pad: "Bề mặt dệt mịn · Đế cao su chống trượt",
  webcam: "Ghi hình sắc nét · Tự động cân bằng sáng",
  microphone: "Thu âm định hướng · Lọc tạp âm",
  chair: "Thiết kế công thái học · Đệm đàn hồi cao",
};

export function cleanProductTitle(product) {
  const raw = String(product?.name || product?.short_name || "Sản phẩm");
  const stripped = raw
    .replace(/^(?:\s*\[[^\]]+\]\s*)+/u, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped || raw.trim() || "Sản phẩm";
}

export function displayBrandName(product) {
  const rawBrand = String(product?.brand?.name || "").trim();
  if (rawBrand && !/^(khác|other|unknown|n\/a)$/i.test(rawBrand)) {
    return rawBrand;
  }
  const title = cleanProductTitle(product);
  const lowerTitle = title.toLowerCase();
  for (const candidate of KNOWN_GEAR_BRANDS) {
    const escaped = candidate.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu");
    if (regex.test(lowerTitle)) {
      return candidate;
    }
  }
  return "";
}

export function displayProductFeature(product) {
  const rawSummary = String(product?.summary || "").replace(/\s+/g, " ").trim();
  const catName = String(product?.category?.name || "").replace(/\s+/g, " ").trim();
  const catKey = String(product?.category?.code || product?.category?.slug || "keyboard").toLowerCase();

  const isGenericSummary =
    !rawSummary ||
    rawSummary.toLowerCase() === catName.toLowerCase() ||
    GENERIC_SUMMARY_KEYWORDS.has(rawSummary.toLowerCase()) ||
    (rawSummary.length <= 24 && rawSummary === rawSummary.toLowerCase());

  if (!isGenericSummary) {
    return rawSummary;
  }

  // Extract meaningful hardware spec clauses from product title when summary is just a search keyword
  const title = cleanProductTitle(product);
  const clauses = title
    .split(/\s*(?:,|;|–|—|\||\/|\s-\s)\s*/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 6);

  if (clauses.length > 1) {
    const picked = clauses.slice(1, 3).join(" · ");
    if (picked.length >= 8) {
      return picked.charAt(0).toUpperCase() + picked.slice(1);
    }
  }

  return CATEGORY_DEFAULT_FEATURES[catKey] || "Thiết bị gaming chính hãng hiệu năng cao";
}


