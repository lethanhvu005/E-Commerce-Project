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
  "logi-gpx2": "/assets/images/categories/mouse.png",
  "logi-g502": "/assets/images/categories/mouse.png",
  "razer-bsv2": "/assets/images/categories/headset.png",
  "hyx-cloud3": "/assets/images/categories/headset.png",
  "asus-vg27aq": "/assets/images/categories/monitor.png",
  "nexa-v27": "/assets/images/categories/monitor.png",
  "nexa-mat": "/assets/images/categories/pad.png",
  "nexa-chair": "/assets/images/categories/desk.png",
};

export function inferImageFromMeta(item) {
  if (!item) return "/assets/images/categories/keyboards.png";

  // 1. Check category code / slug
  const catCode = String(item?.category?.code || item?.category?.slug || item?.category_code || "").toLowerCase();
  if (catCode && CATEGORY_IMAGE_MAP[catCode]) {
    return CATEGORY_IMAGE_MAP[catCode];
  }

  // 2. Check SKU
  const rawSku = String(item?.sku || item?.sku_snapshot || "").toLowerCase();
  for (const [skuPrefix, imgPath] of Object.entries(SKU_IMAGE_MAP)) {
    if (rawSku.includes(skuPrefix)) return imgPath;
  }

  // 3. Check product name / slug keywords
  const text = `${item?.name || ""} ${item?.product_name || ""} ${item?.product_name_snapshot || ""} ${item?.slug || ""} ${item?.product_slug || ""}`.toLowerCase();
  if (/mouse|chuột|chuot|superlight|g502|gpx/.test(text)) return "/assets/images/categories/mouse.png";
  if (/headset|tai nghe|tai-nghe|blackshark|cloud|bsv2/.test(text)) return "/assets/images/categories/headset.png";
  if (/monitor|màn hình|man-hinh|vision|vg27|v27|qhd/.test(text)) return "/assets/images/categories/monitor.png";
  if (/chair|ghế|ghe|ergo/.test(text)) return "/assets/images/categories/desk.png";
  if (/mat|pad|lót bàn|phu-kien|desk mat/.test(text)) return "/assets/images/categories/pad.png";
  if (/keyboard|bàn phím|ban-phim|k70|x75|s98|keychron|k2/.test(text)) return "/assets/images/categories/keyboards.png";

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
