/* Trang chủ / catalog / chi tiết / giỏ hàng / checkout | NEXA / CommerceOS static demo. */
function heroProducts() {
  return [
    {
      short: "Cảm nhận từng khoảnh khắc",
      cat: "Tai nghe",
      asset: "sound",
      eyebrow: "ÂM THANH ĐỒNG HÀNH CÙNG BẠN",
      title: "<em>Cảm Nhận</em><span>Từng</span><span>Khoảnh Khắc.</span>",
      desc: "Âm thanh cho những khoảnh khắc riêng. Thiết kế cho nhịp sống của bạn.",
      note: "Chạm vào âm nhạc.<br>Chạm đến cảm xúc.",
    },
    {
      short: "Cảm hứng trên từng phím",
      cat: "Bàn phím",
      asset: "keys",
      eyebrow: "DÀNH CHO NHỮNG ĐIỀU BẠN TẠO NÊN",
      title: "<em>Cảm Hứng</em><span>Trên Từng</span><span>Phím Chạm.</span>",
      desc: "Một góc làm việc có gu. Một nhịp sáng tạo rất riêng — bắt đầu từ bàn phím bạn chọn.",
      note: "Thiết kế tinh gọn.<br>Cảm hứng bất tận.",
    },
    {
      short: "Tự do trong từng chuyển động",
      cat: "Chuột",
      asset: "motion",
      eyebrow: "CÔNG NGHỆ HÒA VÀO NHỊP SỐNG",
      title: "<em>Tự Do</em><span>Trong Từng</span><span>Chuyển Động.</span>",
      desc: "Khám phá thiết bị phù hợp với cách bạn làm việc, chơi và tận hưởng mỗi ngày.",
      note: "Chuyển động tự nhiên.<br>Trải nghiệm liền mạch.",
    },
  ];
}
// Frontend-only category cards for the homepage. Replace labels/counts/images here during UI work.
const HOME_DEMO_CATEGORIES = [
  { name: "Bàn phím", filter: "Bàn phím", count: "4+ sản phẩm", image: "keyboards.png" },
  { name: "Chuột", filter: "Chuột", count: "2 sản phẩm", image: "mouse.png" },
  { name: "Tai nghe", filter: "Tai nghe", count: "2 sản phẩm", image: "headset.png" },
  { name: "Màn hình", filter: "Màn hình", count: "2 sản phẩm", image: "monitor.png" },
  { name: "Lót bàn & phụ kiện", filter: "Phụ kiện", count: "1 sản phẩm", image: "pad.png" },
  { name: "Ghế gaming", filter: "Ghế gaming", count: "1 sản phẩm", image: "desk.png" },
];
const HOME_DEMO_BRANDS = [
  { label: "SONY", brand: "Sony", style: "sony" },
  { label: "logitech", brand: "Logitech", style: "logitech" },
  { label: "msi", brand: "MSI", style: "msi" },
  { label: "Microsoft", brand: "Microsoft", style: "microsoft" },
  { label: "ASUS", brand: "ASUS", style: "asus" },
  { label: "RAPOO", brand: "Rapoo", style: "rapoo" },
  { label: "JBL", brand: "JBL", style: "jbl" },
  { label: "nuio.", brand: "Nuio", style: "nuio" },
  { label: "ZADEZ", brand: "ZADEZ", style: "zadez" },
];
function heroWaves(i) {
  return `<svg class="hero-waves" viewBox="0 0 1440 620" preserveAspectRatio="none" aria-hidden="true" focusable="false"><defs><linearGradient id="wave-ink-${i}" x1="0" y1="0" x2="1" y2=".3"><stop offset="0" stop-color="var(--wave-deep)" stop-opacity="0"/><stop offset=".43" stop-color="var(--wave-blue)"/><stop offset=".65" stop-color="var(--wave-ice)"/><stop offset="1" stop-color="var(--wave-blue)" stop-opacity=".1"/></linearGradient><linearGradient id="wave-fill-${i}" x1="0" y1="0" x2=".5" y2="1"><stop stop-color="var(--wave-blue)" stop-opacity=".2"/><stop offset="1" stop-color="var(--wave-deep)" stop-opacity="0"/></linearGradient></defs><g fill="url(#wave-fill-${i})"><path d="M140 475C390 610 415 275 710 355S1100 590 1440 280L1440 465C1120 680 970 455 700 430S345 655 140 475Z"/><path d="M290 260C490 60 560 440 780 210S1090 100 1340 65C1140 285 950 115 770 320S470 250 290 260Z"/><path d="M550 560C800 360 945 650 1300 390L1440 485C1190 685 950 550 760 585Z"/></g><g fill="none" stroke="url(#wave-ink-${i})"><path class="wave-aura" d="M100 470C390 610 415 275 710 355S1100 590 1440 280M290 260C490 60 560 440 780 210S1090 100 1340 65M550 560C800 360 945 650 1300 390"/><path class="wave-edge" d="M100 470C390 610 415 275 710 355S1100 590 1440 280M290 260C490 60 560 440 780 210S1090 100 1340 65M550 560C800 360 945 650 1300 390"/></g></svg>`;
}
function heroSlide(p, i) {
  const image =
    p.asset === "sound"
      ? "cobalt-sound-wide.png"
      : p.asset === "keys"
        ? "cobalt-keys-lettered.png"
        : "cobalt-motion.png";
  const lightImage =
    p.asset === "sound"
      ? "cobalt-sound-wide-day.png"
      : p.asset === "keys"
        ? "cobalt-keys-day.png"
        : "cobalt-motion-day.png";
  const dimensions = { width: 1536, height: 1024 };
  const alt = `Ảnh ý tưởng ${esc(p.cat.toLowerCase())} giữa những cánh hoa xanh cobalt`;
  return `<div class="gear-slide campaign-${p.asset}" data-slide-panel="${i}" ${i ? "hidden" : ""}>
 ${heroWaves(i)}<div class="gear-stage"><img class="hero-product-image" src="assets/images/campaign/${image}" data-dark-src="assets/images/campaign/${image}" data-light-src="assets/images/campaign/${lightImage}" width="${dimensions.width}" height="${dimensions.height}" alt="${alt}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async"><span class="campaign-caption">NEXA / ẢNH Ý TƯỞNG</span></div>
 <div class="gear-slide-copy"><span class="gear-kicker">${p.eyebrow}</span><h1>${p.title}</h1><p class="hero-benefit">${p.desc}</p><div class="hero-buy"><a class="btn btn-primary" href="prd.html?cat=${encodeURIComponent(p.cat)}">Khám phá ngay ${gearIcon("arrow")}</a></div>
 <div class="campaign-index"><span>${String(i + 1).padStart(2, "0")}</span> / BỘ SƯU TẬP ${esc(p.cat.toUpperCase())}</div></div>
 <div class="campaign-note">${p.note}<i></i></div>
 </div>`;
}
function homePage() {
  const slides = heroProducts();
  const categories = ["Tất cả", ...new Set(INITIAL.map((p) => p.cat))];
  const activeCategory = categories.includes(ui.tab) ? ui.tab : "Tất cả";
  const promoProduct = INITIAL.find((p) => p.id === 5) || INITIAL[0];
  const featuredProducts = INITIAL.filter(
    (p) => activeCategory === "Tất cả" || p.cat === activeCategory,
  ).slice(0, 4);
  const newProducts = INITIAL.filter((p) => p.tag === "Mới").slice(0, 3);
  return storefront(
    `<section class="gear-hero container" aria-roledescription="carousel" aria-label="Sản phẩm được giới thiệu" tabindex="0"><div class="slider-viewport">${slides.map(heroSlide).join("")}</div><div class="slider-dock"><div class="slide-index slider-sr-only" aria-live="off" aria-atomic="true"><span id="slide-number">01</span> / ${String(slides.length).padStart(2, "0")}</div><div class="slider-dots">${slides.map((p, i) => `<button data-ux="slide-set" data-slide="${i}" aria-label="${esc(p.short)}" aria-pressed="${!i}" class="${i ? "" : "active"}"><span><i></i></span></button>`).join("")}</div><button class="slider-play" data-slider-toggle aria-label="Tạm dừng slider" aria-pressed="false"><span aria-hidden="true">Ⅱ</span></button></div></section>
 <div class="container home-body">
 <section class="home-section" id="categories"><div class="gear-section-head"><div><span class="gear-kicker">DANH MỤC THIẾT BỊ</span><h2>Chọn loại sản phẩm</h2></div></div><div class="gear-categories" aria-label="Danh mục gear">${HOME_DEMO_CATEGORIES.map((c, i) => `<a class="gear-category" href="prd.html?cat=${encodeURIComponent(c.filter)}" data-route="shop" data-cat="${esc(c.filter)}"><span class="category-index">${String(i + 1).padStart(2, "0")}</span><img src="assets/images/categories/${c.image}" loading="lazy" decoding="async" alt="${esc(c.name)}"><div><strong>${esc(c.name)}</strong><small>${esc(c.count)} <span aria-hidden="true">↗</span></small></div></a>`).join("")}</div></section>
 <section class="home-section gear-brand-section" aria-labelledby="home-brands-title"><div class="gear-section-head"><div><span class="gear-kicker">CHỌN THƯƠNG HIỆU</span><h2 id="home-brands-title">Gaming Gear</h2></div></div><div class="gear-brand-grid" aria-label="Thương hiệu gear">${HOME_DEMO_BRANDS.map((b) => `<a class="gear-brand-card brand-${b.style}" href="prd.html?brand=${encodeURIComponent(b.brand)}" data-route="shop" data-brand="${esc(b.brand)}" aria-label="Xem sản phẩm thương hiệu ${esc(b.brand)}"><span>${esc(b.label)}</span></a>`).join("")}</div></section>
 <section id="featured" class="home-section"><div class="gear-section-head"><div><span class="gear-kicker">SẢN PHẨM NỔI BẬT</span><h2>Mỗi món, một lý do chọn.</h2></div><a href="prd.html">Toàn bộ sản phẩm ↗</a></div><div class="gear-tabs" role="group" aria-label="Lọc sản phẩm nổi bật">${categories.map((c) => `<button class="${activeCategory === c ? "active" : ""}" data-action="home-tab" data-cat="${c}" aria-pressed="${activeCategory === c}">${c}</button>`).join("")}</div><div class="gear-product-grid">${featuredProducts.map(productCard).join("")}</div></section>
 <section class="gear-editorial home-section" id="promos"><div class="editorial-copy"><span class="gear-kicker">GÓC CHỌN GEAR / BÀN PHÍM</span><h2>Gọn 75%.<br>Hay đủ phím?</h2><p>Ưu tiên khoảng trống cho chuột hay hàng phím số? Bắt đầu từ layout bạn dùng mỗi ngày.</p><div class="editorial-links"><a href="prd.html?cat=B%C3%A0n%20ph%C3%ADm&search=75%25">Layout 75% <span>↗</span></a><a href="prd.html?cat=B%C3%A0n%20ph%C3%ADm&search=full-size">Full-size <span>↗</span></a></div></div><a class="editorial-product" href="prd_detail.html?id=${promoProduct.id}"><span class="gear-kicker">${esc(promoProduct.brand)} / ${esc(promoProduct.short)}</span>${productImage(promoProduct)}<span>${esc(promoProduct.desc)} <b>Xem chi tiết ↗</b></span></a></section>
 <section class="home-section"><div class="gear-section-head"><div><span class="gear-kicker">RA MẮT GẦN ĐÂY</span><h2>Thêm lựa chọn cho bạn.</h2></div></div><div class="gear-new-list">${newProducts.map((p) => `<a class="gear-new-item" href="prd_detail.html?id=${p.id}">${productImage(p)}<div><small>${esc(p.cat)}</small><h3>${esc(p.short)}</h3><strong>${money(p.price)}</strong></div><span>↗</span></a>`).join("")}</div></section>
 </div>`,
    "home",
  );
}
function filteredProducts() {
  return INITIAL.filter(
    (p) =>
      (ui.category === "Tất cả" || p.cat === ui.category) &&
      (ui.brand === "Tất cả" || p.brand === ui.brand) &&
      p.price >= ui.min &&
      p.price <= ui.max &&
      (!ui.query ||
        [p.name, p.cat, p.brand, p.sku, p.desc, ...p.features]
          .join(" ")
          .toLocaleLowerCase("vi")
          .includes(ui.query.toLocaleLowerCase("vi"))) &&
      (!ui.onlyFav || state.favorites.includes(p.id)),
  ).sort((a, b) =>
    ui.sort === "priceLow"
      ? a.price - b.price
      : ui.sort === "priceHigh"
        ? b.price - a.price
        : ui.sort === "name"
          ? a.name.localeCompare(b.name)
          : a.id - b.id,
  );
}
function shopPage() {
  let list = filteredProducts();
  return storefront(
    `<div class="container"><div class="crumb"><a href="#/home">Trang chủ</a> › Sản phẩm ${ui.category !== "Tất cả" ? "› " + esc(ui.category) : ""}</div><h1 class="page-title">${ui.category === "Tất cả" ? "Tất cả sản phẩm" : esc(ui.category)}</h1><p class="muted" style="font-size:12px;margin:3px 0 0">Thiết bị công nghệ chọn lọc — lựa chọn hoàn hảo cho mọi setup.</p><div class="shop-layout"><aside class="filters" id="mobile-filters"><div class="filter-head"><strong>Bộ lọc</strong><button class="text-link" data-action="clear-filter">Xóa tất cả</button></div><div class="filter-section"><h4>Danh mục</h4>${["Tất cả", ...CATS.map((x) => x.name)].map((c) => `<label class="checkrow"><input type="radio" name="category" value="${c}" ${ui.category === c ? "checked" : ""}> ${c}</label>`).join("")}</div><div class="filter-section"><h4>Thương hiệu</h4>${["Tất cả", ...new Set(INITIAL.map((p) => p.brand))].map((b) => `<label class="checkrow"><input type="radio" name="brand" value="${b}" ${ui.brand === b ? "checked" : ""}> ${b}</label>`).join("")}</div><div class="filter-section"><h4>Khoảng giá tối đa</h4><select name="maxPrice" class="select"><option value="10000000" ${ui.max === 10000000 ? "selected" : ""}>Tất cả mức giá</option><option value="1000000" ${ui.max === 1000000 ? "selected" : ""}>Dưới 1 triệu</option><option value="3000000" ${ui.max === 3000000 ? "selected" : ""}>Dưới 3 triệu</option><option value="5000000" ${ui.max === 5000000 ? "selected" : ""}>Dưới 5 triệu</option></select></div></aside><section><div class="sort-header"><div><p>Tìm thấy <strong>${list.length}</strong> sản phẩm</p><button class="btn-quiet mobile-filter hide" data-action="filters">☷ Bộ lọc</button></div><select class="select" style="max-width:195px" name="sort" aria-label="Sắp xếp sản phẩm"><option value="popular" ${ui.sort === "popular" ? "selected" : ""}>Phổ biến</option><option value="priceLow" ${ui.sort === "priceLow" ? "selected" : ""}>Giá: Thấp đến cao</option><option value="priceHigh" ${ui.sort === "priceHigh" ? "selected" : ""}>Giá: Cao đến thấp</option><option value="name" ${ui.sort === "name" ? "selected" : ""}>Tên A – Z</option></select></div>${list.length ? `<div class="shop-products">${list.map(productCard).join("")}</div>` : `<div class="empty"><h2>Không tìm thấy sản phẩm</h2><p>Hãy thử từ khóa hoặc bộ lọc khác.</p><button class="btn btn-violet" data-action="clear-filter">Xóa bộ lọc</button></div>`}</section></div></div>`,
    "shop",
    true,
  );
}
function detailPage(id) {
  const p = INITIAL.find((x) => x.id === +id) || INITIAL[0],
    stock = pstock(p);
  const qty = Math.min(Math.max(ui.qty || 1, 1), Math.max(stock, 1));
  ui.qty = qty;
  const related = [
    ...INITIAL.filter((x) => x.id !== p.id && x.cat === p.cat),
    ...INITIAL.filter((x) => x.id !== p.id && x.cat !== p.cat),
  ].slice(0, 4);
  return storefront(
    `<div class="pd-experience container" data-product-id="${p.id}" data-stock="${stock}">
 <nav class="pd-breadcrumb" aria-label="Đường dẫn"><a href="home.html">Trang chủ</a><span>/</span><a href="prd.html?cat=${encodeURIComponent(p.cat)}">${esc(p.cat)}</a><span>/</span><span>${esc(p.short)}</span></nav>
 <section class="pd-hero" aria-labelledby="pd-title">
  <div class="pd-orbit pd-orbit-one" aria-hidden="true"></div><div class="pd-orbit pd-orbit-two" aria-hidden="true"></div>
  <div class="pd-topline"><span>NEXA SELECT <b>/ ${esc(p.cat)}</b></span><button class="pd-save" data-detail-action="favorite" aria-pressed="${state.favorites.includes(p.id)}" aria-label="Yêu thích ${esc(p.name)}">${gearIcon("heart")}</button></div>
  <div class="pd-artwork" data-view="full" data-tone="original">
   <div class="pd-watermark" aria-hidden="true">${esc(p.brand)}</div>
   <div class="pd-wordmark" aria-hidden="true"><span>${esc(p.brand)}</span><span>${esc(p.sku.split("-").slice(1).join(" ") || p.short)}</span></div>
   <div class="pd-product-art">${productImage(p, "eager")}</div>
   <span class="pd-art-caption">${esc(p.sku)} <i></i> ẢNH SẢN PHẨM</span>
   <div class="pd-view-dots" aria-label="Góc nhìn sản phẩm">${[
     ["full", "Toàn cảnh"],
     ["angle", "Góc nghiêng"],
     ["close", "Cận cảnh"],
   ]
     .map(
       ([view, label], i) =>
         `<button data-detail-view="${view}" aria-label="${label}" aria-pressed="${!i}" class="${i ? "" : "active"}"><span></span></button>`,
     )
     .join("")}</div>
  </div>
  <div class="pd-bottom">
   <div class="pd-gallery"><span class="pd-label">KHÁM PHÁ THIẾT KẾ</span><div class="pd-thumbnails">${[
     ["full", "Toàn cảnh"],
     ["angle", "Góc nghiêng"],
     ["close", "Cận cảnh"],
   ]
     .map(
       ([view, label], i) =>
         `<button data-detail-view="${view}" class="pd-thumbnail ${i ? "" : "active"}" aria-label="Xem ${label.toLowerCase()}" aria-pressed="${!i}"><span class="pd-thumbnail-art pd-thumb-${view}">${productImage(p)}</span><span>${label}</span></button>`,
     )
     .join("")}</div><div class="pd-tones"><span>Màu sắc</span>${[
     ["original", "Gốc"],
     ["ice", "Lạnh"],
     ["rose", "Hồng"],
   ]
     .map(
       ([tone, label], i) =>
         `<button class="pd-tone tone-${tone}" data-detail-tone="${tone}" aria-label="Màu sắc ${label}" aria-pressed="${!i}"></button>`,
     )
     .join("")}</div></div>
   <div class="pd-purchase"><div class="pd-product-heading"><div><span class="pd-label">${esc(p.brand)} / ${esc(p.cat)}</span><h1 id="pd-title">${esc(p.name)}</h1></div><div class="pd-price"><strong>${money(p.price)}</strong>${p.old ? `<del>${money(p.old)}</del>` : ""}</div></div>
   <div class="pd-stock"><span class="${stock ? "" : "out"}"></span>${stock ? `Còn ${stock} sản phẩm` : "Tạm hết hàng"}</div>
   ${p.type === "keyboard" ? `<label class="pd-variant">Switch<select data-detail-variant aria-label="Chọn switch">${["Red", "Brown", "Blue", "Silent"].map((v) => `<option ${ui.variant === v ? "selected" : ""}>${v}</option>`).join("")}</select></label>` : ""}
   <div class="pd-buy-row"><div class="pd-quantity" role="group" aria-label="Số lượng"><button data-detail-action="decrease" aria-label="Giảm số lượng" ${qty <= 1 ? "disabled" : ""}>−</button><output aria-live="polite">${qty}</output><button data-detail-action="increase" aria-label="Tăng số lượng" ${qty >= stock ? "disabled" : ""}>+</button></div><button class="pd-add" data-detail-action="add" ${stock ? "" : "disabled"}>${gearIcon("bag")}Thêm vào giỏ</button><button class="pd-buy" data-detail-action="buy" ${stock ? "" : "disabled"}>Mua ngay ${gearIcon("arrow")}</button></div>
   </div>
  </div>
 </section>
 <section class="pd-story" aria-labelledby="pd-story-title"><div><span class="pd-label">THIẾT KẾ CHO GÓC CHƠI CỦA BẠN</span><h2 id="pd-story-title">${esc(p.features[0])}<span>Chất riêng trong từng chi tiết.</span></h2><p>${esc(p.desc)}</p></div><dl class="pd-specs">${p.features.map((f, i) => `<div><dt>${String(i + 1).padStart(2, "0")}</dt><dd>${esc(f)}</dd></div>`).join("")}</dl></section>
 <section class="pd-related"><div class="gear-section-head"><div><span class="gear-kicker">TIẾP TỤC HOÀN THIỆN GÓC CHƠI</span><h2>Có thể bạn cũng thích.</h2></div><a href="prd.html">Khám phá thêm ↗</a></div><div class="products-grid">${related.map(productCard).join("")}</div></section>
 </div>`,
    "shop",
  );
}

function cartPage() {
  let rows = cartRows();
  return storefront(
    `<div class="container"><div class="crumb"><a href="#/home">Trang chủ</a> › Giỏ hàng</div><h1 class="page-title">Giỏ hàng <span style="font-size:14px;color:#8a96ac;font-weight:500">(${cartCount()} sản phẩm)</span></h1>${rows.length ? `<div class="cart-layout"><div class="whitebox"><h3>Danh sách sản phẩm</h3>${rows.map(({ p, qty }) => `<div class="cart-line"><div class="cart-image">${productImage(p)}</div><div><strong>${esc(p.name)}</strong><small style="display:block">${esc(p.brand)} · SKU: ${esc(p.sku)}</small><div class="price">${money(p.price)}</div><button class="remove" data-action="remove" data-id="${p.id}">Xóa khỏi giỏ</button></div><div style="text-align:right"><div class="qty"><button data-action="change-cart" data-id="${p.id}" data-delta="-1" aria-label="Giảm số lượng">−</button><span>${qty}</span><button data-action="change-cart" data-id="${p.id}" data-delta="1" aria-label="Tăng số lượng">+</button></div><div style="font-size:12px;margin-top:8px;font-weight:850;color:#253452">${money(p.price * qty)}</div></div></div>`).join("")}</div><aside class="whitebox"><h3>Tóm tắt đơn hàng</h3><form data-form="coupon" class="coupon"><input name="coupon" class="field" placeholder="Nhập mã ưu đãi" value="${esc(ui.coupon)}"><button class="btn btn-dark">Áp dụng</button></form>${orderSummary()}<button class="btn btn-primary full" data-route="checkout" style="margin-top:20px">Tiếp tục thanh toán ↗</button></aside></div>` : `<div class="empty" style="margin:23px 0 50px"><div class="empty-illustration" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h16l-1.4 12H5.4L4 8Z"/><path d="M9 9V6a3 3 0 0 1 6 0v3M8 13h.01M12 13h.01M16 13h.01"/></svg></div><h2>Giỏ hàng đang trống</h2><p>Bắt đầu khám phá những món gaming gear bạn yêu thích.</p><button class="btn btn-violet" data-route="shop">Khám phá sản phẩm</button></div>`}</div>`,
    "cart",
    true,
  );
}
function orderSummary() {
  return `<div class="summary-row"><span>Tạm tính</span><strong>${money(subtotal())}</strong></div><div class="summary-row"><span>Giảm giá ${ui.coupon ? "(" + esc(ui.coupon) + ")" : ""}</span><strong style="color:#db4668">−${money(discount())}</strong></div><div class="summary-row"><span>Vận chuyển</span><strong>${shipping() === 0 ? "Miễn phí" : money(shipping())}</strong></div><div class="summary-row total"><span>Tổng cộng</span><strong>${money(subtotal() - discount() + shipping())}</strong></div>`;
}
function checkoutPage() {
  if (!state.cart.length) return cartPage();
  return storefront(
    `<div class="container"><div class="crumb"><a href="#/cart">Giỏ hàng</a> › Thanh toán</div><h1 class="page-title">Thanh toán</h1><div class="checkout-steps" aria-label="Tiến trình thanh toán"><span class="current" aria-current="step"><b>1</b> Địa chỉ</span><i aria-hidden="true"></i><span><b>2</b> Vận chuyển</span><i aria-hidden="true"></i><span><b>3</b> Xác nhận</span></div><div class="checkout-layout"><form id="checkout-form" data-form="checkout"><div class="whitebox"><h3>Thông tin nhận hàng</h3><div class="form-grid"><div><label for="coName" class="field-label">Họ và tên *</label><input id="coName" class="field" name="name" required maxlength="80" placeholder="Nguyễn Văn A" autocomplete="name"></div><div><label for="coPhone" class="field-label">Số điện thoại *</label><input id="coPhone" class="field" name="phone" required minlength="9" maxlength="15" pattern="[0-9+() .-]{9,15}" placeholder="09xxxxxxxx" autocomplete="tel"></div></div><label for="coEmail" class="field-label">Email *</label><input id="coEmail" class="field" name="email" type="email" required maxlength="120" placeholder="you@example.com" autocomplete="email"><label for="coAddress" class="field-label">Địa chỉ nhận hàng *</label><input id="coAddress" class="field" name="address" required minlength="8" maxlength="180" placeholder="Số nhà, đường, phường/xã, quận/huyện, tỉnh/thành" autocomplete="street-address"><label for="coNote" class="field-label">Ghi chú giao hàng</label><textarea id="coNote" class="field" name="note" rows="2" maxlength="300" placeholder="Ghi chú cho người giao hàng (nếu có)"></textarea></div><div class="whitebox" style="margin-top:17px"><h3>Phương thức vận chuyển</h3><label class="radio-card"><span><input type="radio" name="ship" value="normal" ${ui.ship === "normal" ? "checked" : ""}> Giao hàng tiêu chuẩn (2–4 ngày)</span><b>0–30.000 ₫</b></label><label class="radio-card"><span><input type="radio" name="ship" value="express" ${ui.ship === "express" ? "checked" : ""}> Giao hàng nhanh (1–2 ngày)</span><b>50.000 ₫</b></label></div><div class="whitebox" style="margin-top:17px"><h3>Phương thức thanh toán</h3><label class="radio-card"><span><input type="radio" name="pay" value="cod" ${ui.pay === "cod" ? "checked" : ""}> Thanh toán khi nhận hàng (COD)</span></label><label class="radio-card"><span><input type="radio" name="pay" value="momo" ${ui.pay === "momo" ? "checked" : ""}> Ví MoMo</span></label><label class="radio-card"><span><input type="radio" name="pay" value="vnpay" ${ui.pay === "vnpay" ? "checked" : ""}> VNPAY</span></label></div><button class="btn btn-violet full" style="margin-top:18px;padding:15px" type="submit">Đặt hàng · ${money(subtotal() - discount() + shipping())} ↗</button></form><aside class="whitebox"><h3>Đơn hàng của bạn</h3>${cartRows()
      .map(
        ({ p, qty }) =>
          `<div style="display:flex;gap:8px;align-items:center;padding:9px 0;border-bottom:1px solid #edf0f4"><div class="cart-image" style="width:58px;height:52px;flex-shrink:0">${productImage(p)}</div><div style="font-size:11px;flex:1"><b>${esc(p.short)}</b><div style="color:#7b8aa1">SL: ${qty}</div></div><b style="font-size:11px">${money(p.price * qty)}</b></div>`,
      )
      .join("")}${orderSummary()}</aside></div></div>`,
    "cart",
    true,
  );
}
function successPage(id) {
  let order = state.orders.find((x) => x.id === id);
  return storefront(
    `<div class="container"><div class="whitebox success-order" style="margin:35px auto"><div class="big-check">✓</div><h1>Đặt hàng thành công!</h1><p>Mã đơn <b>${esc(id)}</b>. </p><div style="display:flex;justify-content:center;gap:12px;flex-wrap:wrap;margin-top:22px"><button class="btn btn-violet" data-route="orders">Theo dõi đơn hàng</button><button class="btn btn-dark" data-route="shop">Tiếp tục mua sắm</button></div></div></div>`,
    "cart",
    true,
  );
}
function orderStage(status) {
  if (status === "Đã hủy" || status === "Thanh toán bị hủy") return -1;
  if (status === "Đã giao") return 4;
  if (status === "Đang vận chuyển") return 3;
  if (["Đã xác nhận", "Đang xử lý", "Đã thanh toán"].includes(status))
    return 2;
  return 1;
}
function orderTimeline(status) {
  let stage = orderStage(status);
  if (stage < 0) return `<div class="order-cancelled">Đơn hàng đã hủy</div>`;
  return `<ol class="order-timeline">${["Đặt hàng", "Chờ xác nhận", "Đã xác nhận", "Đang vận chuyển", "Đã giao"].map((label, i) => `<li class="${i < stage ? "done" : i === stage ? "current" : ""}"><span>${i < stage ? "✓" : i + 1}</span><b>${label}</b></li>`).join("")}</ol>`;
}
function orderFilterKey(status) {
  if (status === "Chờ xác nhận") return "Chờ xác nhận";
  if (status === "Đang vận chuyển") return "Đang vận chuyển";
  if (status === "Đã giao") return "Đã giao";
  if (status === "Đã hủy" || status === "Thanh toán bị hủy")
    return "Đã hủy";
  return "Khác";
}
function ordersPage() {
  let all = [...state.orders].reverse(),
    filters = [
      "Tất cả",
      "Chờ xác nhận",
      "Đang vận chuyển",
      "Đã giao",
      "Đã hủy",
    ],
    orders =
      ui.ordersFilter === "Tất cả"
        ? all
        : all.filter((o) => orderFilterKey(o.status) === ui.ordersFilter);
  return storefront(
    `<div class="container"><div class="crumb">Trang chủ › Tài khoản</div><h1 class="page-title">Đơn hàng của tôi</h1><p class="muted">Theo dõi trạng thái và tiến trình từng đơn hàng.</p>${all.length ? `<nav class="order-filters" aria-label="Lọc đơn hàng">${filters.map((f) => `<button type="button" class="${ui.ordersFilter === f ? "active" : ""}" aria-pressed="${ui.ordersFilter === f}" data-action="order-filter" data-value="${f}">${f}${f === "Tất cả" ? ` (${all.length})` : ""}</button>`).join("")}</nav>${orders.length ? `<div class="orders-list">${orders.map((o) => `<article class="whitebox order-card"><header class="order-card-head"><div><b>${esc(o.id)}</b><span>${new Date(o.time).toLocaleString("vi-VN")}</span></div><span class="order-status ${orderStage(o.status) < 0 ? "cancelled" : orderStage(o.status) === 4 ? "delivered" : ""}">${esc(o.status)}</span></header>${orderTimeline(o.status)}<div class="order-items">${o.items.map((x) => `<div><span>${esc(x.name)} × ${x.qty}</span><b>${money(x.total)}</b></div>`).join("")}</div><footer class="order-card-foot"><span>${o.pay === "cod" ? "Thanh toán khi nhận hàng" : "Thanh toán " + (o.pay === "momo" ? "MoMo" : "VNPAY")}</span><b>Tổng cộng: ${money(o.total)}</b></footer></article>`).join("")}</div>` : `<div class="empty order-empty"><h2>Không có đơn hàng ở trạng thái này</h2><p>Hãy chọn tab khác để xem đơn hàng.</p></div>`}` : `<div class="empty" style="margin:25px 0 50px"><h2>Chưa có đơn hàng</h2><p>Hãy thử quy trình mua sắm để trải nghiệm.</p><button class="btn btn-violet" data-route="shop">Mua sắm ngay</button></div>`}</div>`,
    "cart",
    true,
  );
}
