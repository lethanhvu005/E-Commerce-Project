export function assetUrl(value) {
  if (!value) return "";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  const path = value.replace(/\\/g, "/").replace(/^\/+/, "");
  if (path.startsWith("assets/")) return `/${path}`;
  if (path.startsWith("images/")) return `/assets/${path}`;
  return `/assets/images/${path}`;
}

export function productImage(product) {
  const key = product?.cover_image?.object_key || product?.images?.find((image) => image.is_cover)?.object_key;
  return assetUrl(key);
}

export function categoryImage(category) {
  return assetUrl(category?.image_key);
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
