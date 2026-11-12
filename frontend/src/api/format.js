const categoryFallbacks = {
  keyboard: "/assets/images/categories/keyboards.png",
  "ban-phim": "/assets/images/categories/keyboards.png",
  mouse: "/assets/images/categories/mouse.png",
  chuot: "/assets/images/categories/mouse.png",
  headset: "/assets/images/categories/headset.png",
  "tai-nghe": "/assets/images/categories/headset.png",
  monitor: "/assets/images/categories/monitor.png",
  "man-hinh": "/assets/images/categories/monitor.png",
  accessory: "/assets/images/categories/pad.png",
  "phu-kien": "/assets/images/categories/pad.png",
};

export function assetUrl(value, fallback = "/assets/images/categories/keyboards.png") {
  if (!value) return fallback;
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  let path = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (path.startsWith("assets/")) return `/${path}`;
  if (path.startsWith("images/")) return `/assets/${path}`;
  return `/assets/images/${path}`;
}

export function productImage(product) {
  const key = product?.cover_image?.object_key || product?.images?.find((image) => image.is_cover)?.object_key;
  const fallback = categoryFallbacks[product?.category?.slug] || categoryFallbacks[product?.category?.code];
  return assetUrl(key, fallback);
}

export function categoryImage(category) {
  return assetUrl(category?.image_key, categoryFallbacks[category?.slug] || categoryFallbacks[category?.code]);
}

export function money(value, currency = "VND") {
  const amount = Number(value || 0);
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 }).format(amount);
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

