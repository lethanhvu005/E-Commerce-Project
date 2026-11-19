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
  "mouse-pad": "/assets/images/categories/pad.png",
  "lot-chuot": "/assets/images/categories/pad.png",
  "phu-kien": "/assets/images/categories/pad.png",
  controller: "/assets/images/categories/controller.png",
  "tay-cam": "/assets/images/categories/controller.png",
  webcam: "/assets/images/categories/webcam.png",
  microphone: "/assets/images/categories/microphone.png",
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
  const catCode = String(
    item?.category?.code ||
      item?.category?.slug ||
      item?.category_code ||
      item?.code ||
      item?.slug ||
      ""
  ).toLowerCase();
  if (catCode && CATEGORY_IMAGE_MAP[catCode]) {
    return CATEGORY_IMAGE_MAP[catCode];
  }

  // 2. Check SKU (longest prefix first to avoid logi-gpx2 matching logi-gpx2-hs)
  const rawSku = String(item?.sku || item?.sku_snapshot || item?.variants?.[0]?.sku || "").toLowerCase();
  for (const [skuPrefix, imgPath] of Object.entries(SKU_IMAGE_MAP)) {
    if (rawSku.includes(skuPrefix)) return imgPath;
  }

  // 3. Check product name / slug / category_name keywords
  const text = `${item?.name || ""} ${item?.category?.name || ""} ${item?.product_name || ""} ${item?.product_name_snapshot || ""} ${item?.slug || ""} ${item?.product_slug || ""} ${item?.category_name || ""}`.toLowerCase();
  if (/controller|tay cầm|tay-cam|gamepad|joypad|flydigi|gamesir/.test(text)) return "/assets/images/categories/controller.png";
  if (/webcam|camera|obsbot|emeet|elough/.test(text)) return "/assets/images/categories/webcam.png";
  if (/microphone|micro|micrô|quadcast|solocast|fifine|maono/.test(text)) return "/assets/images/categories/microphone.png";
  if (/headset|tai nghe|tai-nghe|blackshark|cloud|bsv2|aura/.test(text)) return "/assets/images/categories/headset.png";
  if (/mat|pad|lót chuột|lot-chuot|lót bàn|phu-kien|phụ kiện|desk mat|atlas/.test(text)) return "/assets/images/categories/pad.png";
  if (/mouse|chuột|chuot|superlight|g502|gpx|viper|pulse|m75/.test(text)) return "/assets/images/categories/mouse.png";
  if (/monitor|màn hình|man-hinh|vision|vg27|v27|xg27|optix|qhd|oled/.test(text)) return "/assets/images/categories/monitor.png";
  if (/chair|ghế|ghe|ergo|tc100/.test(text)) return "/assets/images/categories/desk.png";
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
  "Bigbigwon",
  "SteelSeries",
  "ThundeRobot",
  "PlayStation",
  "DualSense",
  "DualShock",
  "ViewSonic",
  "Machenike",
  "Ziyoulang",
  "Keychron",
  "Logitech",
  "Magicsee",
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
  "Glowjoy",
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
  "Lenovo",
  "Xiaomi",
  "OBSBOT",
  "Elough",
  "Fifine",
  "EMEET",
  "Sorex",
  "Mojhon",
  "Hosan",
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
  "TNW",
  "RSP",
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
  "microphone gaming",
  "mic thu âm",
  "micro thu âm",
  "gaming gear",
]);

const FLUFF_PATTERNS = [
  /\b(?:rẻ nhất tiktok\s*shop|vô địch tầm giá|giá học sinh|kèm quà tặng|lỗi 1 đổi 1|lỗi 1 dổi 1|sản phẩm bán chạy|giao hàng nội địa|hỗ trợ cài game|cổng xịn)\b/giu,
  /\b9\/10\s*game\s*thủ\s*tin\s*dùng\b/giu,
  /\b(?:cao cấp cho tuyển thủ|đạt chuẩn thi đấu|chuẩn\s*esports?|nâng tầm game\s*aaa|chuyên game)\b/giu,
  /nhạy bén,?\s*không độ trễ[^,;.|]*/giu,
  /dễ dàng cài đặt[^,;.|]*/giu,
  /nâng(?:\s+cao)?\s+trải\s+nghiệm[^,;.|]*/giu,
  /chính hãng\s+[\p{L}\p{N}_-]*\s*mới ra mắt/giu,
  /\bmới ra mắt\b/giu,
  /\bhàng chính hãng\b/giu,
  /\b(?:bảo hành|bh)\s*\d+\s*(?:tháng|t|năm)?\b/giu,
  /\bhoàn hảo cho[^,;.|]*/giu,
  /\bthích hợp cho\s+youtube[^,;.|]*/giu,
  /\bcho\s+youtube\s*(?:và\s*)?skype\b/giu,
  /\bphụ kiện game pro\b/giu,
  /\bsiêu nét,?\s*lấy nét thần tốc\b/giu,
  /\bdune fox valorant a102\b/giu,
  /\bpressing time\b/giu,
];

function stripBracketTagsAndFluff(rawText) {
  let text = String(rawText || "");
  // Unwrap 【Model】 if it looks like a brand/model code, else remove promo brackets
  text = text.replace(/【([^】]+)】/gu, (_, inner) => {
    if (/giao hàng|bảo hành|bh\s*\d|rẻ nhất|bán chạy|chính hãng|quà tặng|hot|sale/iu.test(inner)) {
      return " ";
    }
    return ` ${inner} `;
  });
  // Remove leading or trailing square-bracket tags like [BH 12 tháng], [Gamelab], [CỔNG XỊN]
  text = text.replace(/\[[^\]]+\]/gu, " ");
  text = text.replace(/\((?:HOT|NEW|MỚI|BÁN CHẠY)\)/giu, " ");

  for (const pattern of FLUFF_PATTERNS) {
    text = text.replace(pattern, " ");
  }

  return text
    .replace(/_/g, " - ")
    .replace(/\s+/g, " ")
    .replace(/^[\s,;|•\-–—]+|[\s,;|•\-–—.]+$/gu, "")
    .trim();
}

export function cleanProductTitle(product) {
  const raw = String(product?.name || product?.short_name || "Sản phẩm");
  const cleaned = stripBracketTagsAndFluff(raw);
  if (!cleaned) return raw.trim() || "Sản phẩm";

  // Split into clauses by major delimiters
  const clauses = cleaned
    .split(/\s*(?:\||•|;|,|\s-\s|\s–\s|\s—\s)\s*/u)
    .map((c) => c.replace(/^[\s,;|•\-–—]+|[\s,;|•\-–—.]+$/gu, "").trim())
    .filter((c) => c.length >= 2);

  if (clauses.length === 0) return cleaned;

  let primary = clauses[0];

  // If first clause is just a version code like "V2" or very short brand/model prefix, merge with second clause
  if (
    clauses.length > 1 &&
    (primary.length <= 16 ||
      /^(?:v\d+|bản\s+\p{L}+|a\d+[a-z0-9\s]*)$/iu.test(clauses[1]))
  ) {
    const candidate = /^(?:v\d+)$/iu.test(primary)
      ? `${clauses[1]} (${primary.toUpperCase()})`
      : `${primary} - ${clauses[1]}`;
    if (candidate.length <= 62) {
      primary = candidate;
    }
  }

  // Remove verbose trailing clauses inside a run-on primary segment once we already have a clear core title
  const runOnCutoffs = [
    /\s+(?:với nút bấm|với loa tích hợp|với micro|được trang bị|tích hợp tính năng|tích hợp đèn|dành cho máy tính|cho máy tính để bàn|cho điện thoại di động|tương thích với|tương thích\s+ps4|chất liệu\s+abs)\b.*$/iu,
    /\s+(?:cho\s+pc\s*,?\s*laptop|dùng cho\s+pc)\b.*$/iu,
  ];
  for (const cutoff of runOnCutoffs) {
    const shortened = primary.replace(cutoff, "").trim();
    if (shortened.length >= 18) {
      primary = shortened;
    }
  }

  // Remove long internal vendor SKU hashes like 68F2GACBVN while keeping (27 inch)
  primary = primary.replace(/\b[0-9A-Z]{9,14}\b/g, "").replace(/\s+/g, " ").trim();

  // Cap at ~58 chars on a word boundary if still overly long
  if (primary.length > 60) {
    const words = primary.split(" ");
    let acc = "";
    for (const w of words) {
      if ((acc + " " + w).trim().length > 58) break;
      acc = (acc + " " + w).trim();
    }
    if (acc.length >= 20) primary = acc;
  }

  return primary.replace(/^[\s,;|•\-–—]+|[\s,;|•\-–—.]+$/gu, "").trim() || "Sản phẩm";
}

export function displayBrandName(product) {
  const rawBrand = String(product?.brand?.name || "").trim();
  if (rawBrand && !/^(khác|other|unknown|n\/a)$/i.test(rawBrand)) {
    return rawBrand;
  }
  const rawTitle = String(product?.name || product?.short_name || "");
  const lowerTitle = rawTitle.toLowerCase();
  for (const candidate of KNOWN_GEAR_BRANDS) {
    const escaped = candidate.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}(?=$|[^\\p{L}\\p{N}])`, "iu");
    if (regex.test(lowerTitle)) {
      return candidate === "Bigbigwon" ? "BigBig Won" : candidate === "Edra" ? "E-Dra" : candidate;
    }
  }
  return "";
}

export function displayProductFeature(product) {
  const rawSummary = String(product?.summary || "").replace(/\s+/g, " ").trim();
  const catName = String(product?.category?.name || "").replace(/\s+/g, " ").trim();

  const isGenericSummary =
    !rawSummary ||
    rawSummary.toLowerCase() === catName.toLowerCase() ||
    GENERIC_SUMMARY_KEYWORDS.has(rawSummary.toLowerCase()) ||
    (rawSummary.length <= 24 && rawSummary === rawSummary.toLowerCase());

  if (!isGenericSummary) {
    const cleanedSummary = stripBracketTagsAndFluff(rawSummary);
    if (cleanedSummary.length >= 6) return cleanedSummary;
  }

  const rawTitle = stripBracketTagsAndFluff(product?.name || product?.short_name || "");
  const shortTitle = cleanProductTitle(product);
  const clauses = rawTitle
    .split(/\s*(?:,|;|–|—|\||•|\s-\s)\s*/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 5 && part.toLowerCase() !== shortTitle.toLowerCase());

  if (clauses.length > 0) {
    const picked = clauses
      .filter((c) => !shortTitle.toLowerCase().includes(c.toLowerCase()))
      .slice(0, 2)
      .join(" · ");
    if (picked.length >= 6) {
      return picked.charAt(0).toUpperCase() + picked.slice(1);
    }
  }

  return rawSummary || catName || "";
}

const INTERNAL_SPEC_KEYS = new Set([
  "source",
  "source_url",
  "source_product_id",
  "shop",
  "keyword",
  "units_sold_at_import",
  "inventory_from_source",
]);

export function extractProductHighlights(product) {
  if (Array.isArray(product?.features) && product.features.length > 0) {
    return product.features
      .map((f) => stripBracketTagsAndFluff(f?.content || ""))
      .filter((text) => text.length >= 4);
  }

  const rawTitle = stripBracketTagsAndFluff(product?.name || product?.short_name || "");
  const shortTitle = cleanProductTitle(product).toLowerCase();
  const parts = rawTitle
    .split(/\s*(?:,|;|\||•|\s-\s|\s–\s)\s*/u)
    .map((p) => p.trim())
    .filter((p) => p.length >= 5 && p.toLowerCase() !== shortTitle);

  const unique = [];
  const seen = new Set();
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part.charAt(0).toUpperCase() + part.slice(1));
    }
    if (unique.length >= 5) break;
  }
  return unique;
}

export function extractShortWordmarkCode(product) {
  const rawName = String(product?.name || product?.short_name || "");
  if (/superlight\s*2/iu.test(rawName)) return "GPX2";
  const modelMatch = rawName.match(
    /\b(Apex\s*\d+|Vader\s*\d+|Dune\s*Fox|Direwolf\s*\d+|A102L?|T3\s*Lite|Nova\s*2|X5\s*Lite|X05\s*Pro|G5\s*Pro|TGZ-850M|RSP\s*G4|T28|T46|DualShock\s*4|P4|LOQ\s*27|VG27[A-Z0-9]{0,2}|A27Qi|EGM24|C960|C950|C60E|Tiny\s*2|K18|SP3|SC-1|Q20|NC900|X75|S98|Q1\s*Pro|K2|K70|G502|M75|TC100|V27)\b/iu
  );
  if (modelMatch) {
    return modelMatch[1].replace(/\s+/g, " ").trim().toUpperCase();
  }
  const shortName = String(product?.short_name || "").trim();
  const brand = displayBrandName(product);
  if (shortName && shortName.length <= 18) {
    const stripped = brand
      ? shortName.replace(new RegExp(`^${brand}\\s*`, "iu"), "").trim()
      : shortName;
    if (stripped && stripped.length <= 12) return stripped.toUpperCase();
  }
  return String(product?.category?.code || "GEAR").toUpperCase();
}

export function extractProductSpecs(product, selectedVariant = null) {
  if (!product) return [];

  const rawName = String(product?.name || product?.short_name || "");
  const brand = displayBrandName(product) || "Chính hãng";
  const categoryName = product?.category?.name || "Thiết bị ngoại vi";
  const catCode = String(product?.category?.code || product?.category?.slug || "").toLowerCase();
  const publicSku =
    selectedVariant?.sku && !String(selectedVariant.sku).startsWith("TT-")
      ? selectedVariant.sku
      : "";

  const rows = [];
  const addedKeys = new Set();
  const addRow = (label, value) => {
    const cleanVal = String(value || "").replace(/\s+/g, " ").trim();
    const normKey = label.toUpperCase();
    if (!cleanVal || addedKeys.has(normKey)) return;
    addedKeys.add(normKey);
    rows.push([normKey, cleanVal]);
  };

  addRow("THƯƠNG HIỆU", brand);
  addRow("DANH MỤC", categoryName);

  // Extract Model code if detectable
  const modelMatch =
    rawName.match(
      /\b(Apex\s*\d+(?:\s*Pro)?|Vader\s*\d+(?:\s*Pro)?|Dune\s*Fox|Direwolf\s*\d+|A102L?\s*(?:HE|Ultra)?|T3\s*Lite|Nova\s*2\s*Lite|X5\s*Lite|X05\s*Pro|G5\s*Pro(?:\s*v2)?|TGZ-850M|RSP\s*G4|T28|T46|DualShock\s*4|P4|LOQ\s*27-10|VG27[A-Z0-9]+|A27Qi|EGM24[A-Z0-9]+|C960(?:\s*Ultra)?|C950|C60E|Tiny\s*2(?:\s*Lite)?|TNW\s*K18|SP3|SC-1|Q20|NC900|X75|S98|Q1\s*Pro|K2|K70|G502|M75|TC100)\b/iu
    ) || null;
  if (modelMatch) {
    addRow("MODEL", modelMatch[1].replace(/\s+/g, " ").trim());
  }

  if (publicSku) {
    addRow("MÃ SKU", publicSku);
  }

  // Variant / Edition
  const variantParts = [
    selectedVariant?.color,
    selectedVariant?.switch_type,
    selectedVariant?.layout,
  ].filter(Boolean);
  if (variantParts.length > 0) {
    addRow("PHIÊN BẢN", variantParts.join(" · "));
  } else {
    const editionMatch = rawName.match(/\b(bản\s+(?:tiêu chuẩn|pro|v2|limited|mới|ultra)|v2)\b/iu);
    if (editionMatch) {
      const ed = editionMatch[1].trim();
      addRow("PHIÊN BẢN", ed.charAt(0).toUpperCase() + ed.slice(1));
    }
  }

  // Connection
  const connTokens = [];
  if (/3\s*mode|tri-?mode|đa\s*mode|ba\s*chế\s*độ/iu.test(rawName)) connTokens.push("3 chế độ (USB-C / 2.4GHz / Bluetooth)");
  else {
    if (/bluetooth/iu.test(rawName)) connTokens.push("Bluetooth");
    if (/2\.4\s*g|wireless|usb\s*receiver|không\s*dây/iu.test(rawName)) connTokens.push("Không dây (Wireless)");
    if (/type\s*-?\s*c|usb\s*-?\s*c/iu.test(rawName)) connTokens.push("USB Type-C");
    else if (/có\s*dây|cắm\s*dây|cổng\s*usb|dây\s*usb|cáp\s*kết\s*nối|usb\s*2\.0/iu.test(rawName)) connTokens.push("USB có dây");
  }
  const cableMatch = rawName.match(/(\d+[.,]\d+\s*m)\b/iu);
  if (cableMatch) connTokens.push(`Cáp dài ${cableMatch[1].replace(",", ".")}`);
  if (/3\.5\s*mm/iu.test(rawName)) connTokens.push("Cổng âm thanh 3.5mm");

  if (selectedVariant?.connection) {
    addRow("KẾT NỐI", selectedVariant.connection);
  } else if (connTokens.length > 0) {
    addRow("KẾT NỐI", connTokens.join(" · "));
  }

  // Compatibility / Platforms (only when explicitly stated in product.name)
  const platforms = [];
  if (/\bpc\b|máy tính để bàn/iu.test(rawName)) platforms.push("PC");
  if (/\blaptop\b|máy tính xách tay/iu.test(rawName)) platforms.push("Laptop");
  if (/\bmac\b|macos/iu.test(rawName)) platforms.push("macOS");
  if (/nintendo\s*switch|\bswitch\b/iu.test(rawName) && /controller|tay-cam/i.test(catCode)) platforms.push("Nintendo Switch");
  if (/\bps4\b|\bps3\b|playstation/iu.test(rawName)) platforms.push("PlayStation (PS3/PS4)");
  if (/\bandroid\b/iu.test(rawName)) platforms.push("Android");
  if (/\bios\b|iphone|ipad/iu.test(rawName)) platforms.push("iOS");
  if (/\bđiện thoại\b|\bsmartphone\b|\bmobile\b/iu.test(rawName) && !platforms.includes("Android") && !platforms.includes("iOS")) {
    platforms.push("Điện thoại di động");
  }
  if (/đa nền tảng/iu.test(rawName) && platforms.length === 0) {
    platforms.push("Đa nền tảng");
  }
  if (platforms.length > 0) {
    addRow("TƯƠNG THÍCH", platforms.join(", "));
  }

  // Sensor / Core Technology
  const techTokens = [];
  if (/hall\s*effect|hall\s*joystick|cảm ứng hội trường|\bhe\b/iu.test(rawName)) techTokens.push("Joystick Hall Effect chống trôi");
  if (/\btmr\b/iu.test(rawName)) techTokens.push("Cần điều khiển từ tính TMR");
  if (/vcm|x-haptics/iu.test(rawName)) techTokens.push("Trigger rung phản hồi lực VCM");
  if (/trigger\s*lock/iu.test(rawName)) techTokens.push("Khóa hành trình Trigger Lock");
  if (/gyro|sáu trục|6 trục|chuyển động/iu.test(rawName)) techTokens.push("Cảm biến con quay hồi chuyển (Gyro)");
  if (/fast\s*ips/iu.test(rawName)) techTokens.push("Tấm nền Fast IPS");
  else if (/\bips\b/iu.test(rawName)) techTokens.push("Tấm nền IPS");
  else if (/\bva\b/iu.test(rawName)) techTokens.push("Tấm nền VA");
  else if (/\boled\b/iu.test(rawName)) techTokens.push("Tấm nền OLED");
  if (/cmos/iu.test(rawName)) {
    const sensorSize = rawName.match(/1\/\d+(?:\.\d+)?\s*"/u);
    techTokens.push(sensorSize ? `Cảm biến CMOS ${sensorSize[0]}` : "Cảm biến quang học CMOS");
  }
  if (/condenser|ngưng tụ/iu.test(rawName)) techTokens.push("Micro thu âm Condenser");
  if (/ai\s*tracking|\bptz\b/iu.test(rawName)) techTokens.push("PTZ & AI Tracking tự động lấy nét");
  if (/hot-?swap/iu.test(rawName)) techTokens.push("Hot-swap thay switch nhanh");
  if (techTokens.length > 0) {
    addRow("CÔNG NGHỆ", techTokens.join(" · "));
  }

  // Resolution / Refresh Rate / Polling Rate
  const rateTokens = [];
  const pollingMatch = rawName.match(/(\d{3,4}\s*hz)/iu);
  if (pollingMatch) {
    const hz = pollingMatch[1].toUpperCase().replace(/\s+/g, "");
    rateTokens.push(/monitor|man-hinh/i.test(catCode) ? `Tần số quét ${hz}` : `Polling Rate ${hz}`);
  }
  const respMatch = rawName.match(/(\d+(?:[.,]\d+)?\s*ms)\b/iu);
  if (respMatch) rateTokens.push(`Phản hồi ${respMatch[1]}`);
  if (/\b4k\b/iu.test(rawName)) rateTokens.push("Độ phân giải 4K Ultra HD");
  else if (/\b2k\b|\bqhd\b/iu.test(rawName)) rateTokens.push("Độ phân giải 2K QHD");
  else if (/1080p|\bfhd\b|full\s*hd/iu.test(rawName)) rateTokens.push("Độ phân giải Full HD 1080P");
  const fpsMatch = rawName.match(/(\d{2,3}\s*fps)\b/iu);
  if (fpsMatch) rateTokens.push(fpsMatch[1].toUpperCase());
  if (/hdr10/iu.test(rawName)) rateTokens.push("Chuẩn màu HDR10");
  if (/g-?sync|freesync/iu.test(rawName)) rateTokens.push("Đồng bộ khung hình Adaptive-Sync");
  if (rateTokens.length > 0) {
    addRow("HIỆU NĂNG / HIỂN THỊ", rateTokens.join(" · "));
  }

  // Physical Dimensions / Materials / Features
  const featTokens = [];
  const macroMatch = rawName.match(/(\d+\s*(?:nút|phím)?\s*macro)/iu);
  if (macroMatch) featTokens.push(`${macroMatch[1]} lập trình được`);
  else if (/\bmacro\b/iu.test(rawName)) featTokens.push("Hỗ trợ phím Macro");
  if (/rung\s*kép|rung\s*hd|có\s*rung|cảm ứng rung|motor/iu.test(rawName)) featTokens.push("Motor rung phản hồi");
  if (/màn hình\s*(?:thông minh|cảm ứng)/iu.test(rawName)) featTokens.push("Màn hình hiển thị tích hợp");
  if (/mic(?:ro)?\s*(?:khử ồn|giảm ồn|giảm tiếng ồn|thu âm|đàm thoại)|có\s*míc|có\s*mic|2\s*mic/iu.test(rawName)) {
    featTokens.push("Micro thu âm & lọc ồn tích hợp");
  }
  if (/nắp\s*(?:che\s*)?riêng tư/iu.test(rawName)) featTokens.push("Nắp che ống kính bảo mật");
  if (/đèn\s*(?:trợ sáng|led)|\brgb\b|\bled\b/iu.test(rawName)) featTokens.push("Hệ thống đèn LED / Trợ sáng");
  if (/chống\s*nước/iu.test(rawName)) featTokens.push("Bề mặt kháng nước");
  if (/chống\s*trượt/iu.test(rawName)) featTokens.push("Đế / Tay cầm chống trượt");
  if (featTokens.length > 0) {
    addRow("TÍNH NĂNG", featTokens.join(" · "));
  }

  // Dimensions & Material
  const dimTokens = [];
  const inchMatch = rawName.match(/(\d{2}(?:[.,]\d+)?\s*inch)/iu);
  if (inchMatch) dimTokens.push(`Kích thước ${inchMatch[1]}`);
  const cmMatch = rawName.match(/(\d+\s*x\s*\d+\s*cm)/iu);
  if (cmMatch) dimTokens.push(`Kích thước ${cmMatch[1].replace(/\s+/g, "")}`);
  const mmMatch = rawName.match(/(?:dày|độ giãn max)\s*(\d+(?:[.,]\d+)?\s*mm)/iu);
  if (mmMatch) dimTokens.push(mmMatch[0]);
  if (/da\s*pu|da\s*trơn/iu.test(rawName)) dimTokens.push("Chất liệu Da PU");
  else if (/kính\s*cường\s*lực/iu.test(rawName)) dimTokens.push("Kính cường lực CNC");
  else if (/\babs\b/iu.test(rawName)) dimTokens.push("Nhựa kỹ thuật ABS");
  else if (/nhôm/iu.test(rawName)) dimTokens.push("Hợp kim nhôm");
  if (dimTokens.length > 0) {
    addRow("KÍCH THƯỚC & VẬT LIỆU", dimTokens.join(" · "));
  }

  // Custom specifications stored in DB (excluding internal import keys)
  if (product.specifications && typeof product.specifications === "object") {
    for (const [k, v] of Object.entries(product.specifications)) {
      if (!INTERNAL_SPEC_KEYS.has(k.toLowerCase()) && v !== "" && v != null) {
        addRow(k.toUpperCase(), String(v));
      }
    }
  }

  // Warranty (strictly from product.warranty_months in DB or explicitly written in product.name)
  const parsedWarranty = rawName.match(/\b(?:bảo hành|bh)\s*(\d+)\s*(tháng|t|năm)\b/iu);
  if (product.warranty_months > 0) {
    addRow("BẢO HÀNH", `${product.warranty_months} tháng`);
  } else if (parsedWarranty) {
    const unit = /năm/iu.test(parsedWarranty[2]) ? "năm" : "tháng";
    addRow("BẢO HÀNH", `${parsedWarranty[1]} ${unit}`);
  }

  // Distributor / Shop if present in specifications in DB
  const shopName = product?.specifications?.shop;
  if (shopName && String(shopName).trim()) {
    addRow("CỬA HÀNG / NHÀ CUNG CẤP", String(shopName).trim());
  }

  // Remaining clauses literally present in product.name in DB
  const extraFeature = displayProductFeature(product);
  if (extraFeature && extraFeature.toLowerCase() !== categoryName.toLowerCase()) {
    addRow("ĐẶC ĐIỂM TRONG MÔ TẢ", extraFeature);
  }

  return rows;
}



