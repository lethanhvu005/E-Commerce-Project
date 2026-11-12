/* Giao diện quản trị và widget | NEXA / CommerceOS static demo. */
function adminSidebar(active) {
  let menu = [
    ["dashboard", "◫", "Tổng quan"],
    ["products", "⬡", "Sản phẩm"],
    ["orders", "▤", "Đơn hàng"],
    ["inventory", "▣", "Tồn kho"],
    ["analytics", "▥", "Báo cáo"],
    ["customers", "♙", "Khách hàng"],
    ["promotions", "◈", "Ưu đãi"],
    ["reviews", "★", "Đánh giá"],
    ["support", "☏", "Hỗ trợ"],
    ["settings", "⚙", "Cài đặt"],
    ["store", "↗", "Xem cửa hàng"],
  ];
  return `<aside class="admin-sidebar" id="admin-sidebar"><div class="admin-logo"><span class="brand-mark" style="width:28px;height:28px;font-size:16px">N</span> CommerceOS<span style="font-size:8px;color:#a1aed1;font-weight:500;align-self:center">DEMO</span></div><nav class="admin-menu">${menu.map(([r, i, t]) => `<button class="admin-link ${r === active ? "active" : ""}" data-route="${r === "store" ? "home" : "admin/" + r}"><span class="ico">${i}</span>${t}</button>`).join("")}</nav><div class="sidebar-bottom"><div class="admin-user"><span class="admin-avatar">A</span><div><b>Admin Demo</b><br><span>Local-only prototype</span></div></div></div></aside>`;
}
function adminLayout(active, content) {
  return `<div class="admin-app">${adminSidebar(active)}<div class="admin-main"><header class="admin-top"><button class="sidebar-toggle" data-action="sidebar" aria-label="Mở menu quản trị">☰</button><label class="admin-top-search">⌕ <input id="admin-global-search" placeholder="Tìm sản phẩm, đơn hàng, khách hàng..." aria-label="Tìm nhanh admin"></label><div class="admin-top-right"><span class="demo-pill desktop-only">STATIC DEMO</span><button class="icon-btn" style="color:#42536c" data-route="home" title="Xem cửa hàng">↗</button><span class="admin-avatar" style="height:32px;width:32px;font-size:12px">A</span><b class="desktop-only">Admin</b></div></header><main class="admin-content">${content}</main></div></div><div id="admin-veil" class="admin-veil hide" data-action="sidebar"></div>${ui.modal ? modalView() : ""}`;
}
function graphSvg(big = false) {
  let arr = [
    14, 19, 22, 26, 35, 39, 31, 29, 32, 35, 37, 33, 42, 40, 43, 48, 47, 52, 46,
    54, 57, 48, 45, 59, 61, 58, 71, 75, 69, 82,
  ];
  let w = 750,
    h = big ? 285 : 220,
    baseline = h - 21;
  let step = (w - 38) / arr.length;
  let bars = arr
    .map(
      (v, i) =>
        `<rect x="${25 + i * step}" y="${baseline - v * 2}" width="${Math.max(8, step - 8)}" height="${v * 2}" rx="3" fill="${i > 25 ? "#7265ff" : "#a1a0ff"}" opacity="${i > 25 ? "1" : ".83"}"/>`,
    )
    .join("");
  let pts = arr
    .map(
      (v, i) =>
        `${25 + i * step + step / 2},${baseline - v * 1.83 - 15 + Math.sin(i * 0.7) * 13}`,
    )
    .join(" ");
  let grid = [0, 1, 2, 3, 4]
    .map(
      (i) =>
        `<line x1="22" y1="${21 + (i * (baseline - 21)) / 4}" x2="740" y2="${21 + (i * (baseline - 21)) / 4}" stroke="#dfe7f4" stroke-width="1"/>`,
    )
    .join("");
  return `<svg class="graph ${big ? "admin-chart-wide" : ""}" viewBox="0 0 ${w} ${h}" preserveAspectRatio="none" role="img" aria-label="Biểu đồ doanh thu mẫu 30 ngày, số liệu minh họa">${grid}${bars}<polyline points="${pts}" fill="none" stroke="#36b8be" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/>${[0, 4, 9, 14, 19, 24, 29].map((i) => `<text x="${25 + i * step}" y="${h - 4}" fill="#8492a6" font-size="12">${String(i + 1).padStart(2, "0")}/10</text>`).join("")}</svg>`;
}
function kpi(title, value, icon, change, cls = "") {
  return `<div class="kpi"><small>${title}</small><strong>${value}</strong><span class="change ${cls}">${change}</span><span class="kpi-icon ${cls === "down" ? "red" : cls === "green" ? "green" : ""}">${icon}</span></div>`;
}
function statusPill(s) {
  return `<span class="pill ${s === "Đã giao" ? "green" : ["Đã xác nhận", "Đang vận chuyển"].includes(s) ? "blue" : s === "Đã hủy" ? "red" : "yellow"}">${esc(s)}</span>`;
}
function demoOrders() {
  let samples = [
    {
      id: "#NX-1001",
      name: "Nguyễn Văn An",
      items: [{ name: "NEXA X75", qty: 1, total: 2490000 }],
      total: 2490000,
      status: "Đã giao",
      time: "2026-10-15T08:42:00",
    },
    {
      id: "#NX-1002",
      name: "Trần Thị Mai",
      items: [{ name: "Razer BlackShark V2 Pro", qty: 1, total: 4990000 }],
      total: 4990000,
      status: "Đang xử lý",
      time: "2026-10-16T10:14:00",
    },
    {
      id: "#NX-1003",
      name: "Lê Minh Hoàng",
      items: [
        { name: "Logitech G Pro X Superlight 2", qty: 1, total: 2890000 },
      ],
      total: 2890000,
      status: "Đã xác nhận",
      time: "2026-10-17T09:19:00",
    },
    {
      id: "#NX-1004",
      name: "Phạm Thu Hà",
      items: [{ name: "Keychron K2", qty: 1, total: 2690000 }],
      total: 2690000,
      status: "Đang xử lý",
      time: "2026-10-17T12:01:00",
    },
  ];
  return [...state.orders].reverse().concat(samples);
}
function shortOrderTable(orders, max) {
  return `<div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Sản phẩm</th><th>Tổng tiền</th><th>Trạng thái</th></tr></thead><tbody>${orders
    .slice(0, max)
    .map(
      (o) =>
        `<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.name)}</td><td>${o.items.length} sản phẩm</td><td><strong>${money(o.total)}</strong></td><td>${statusPill(o.status)}</td></tr>`,
    )
    .join("")}</tbody></table></div>`;
}
function adminDashboard() {
  let low = [...INITIAL]
    .filter((p) => pstock(p) < 13)
    .sort((a, b) => pstock(a) - pstock(b));
  return adminLayout(
    "dashboard",
    `<div class="admin-intro"><div><h1>Tổng quan <span class="demo-pill">DỮ LIỆU MẪU</span></h1><p>Chào mừng bạn trở lại! Đây là giao diện quản trị CommerceOS.</p></div><span class="admin-select">Tháng 10 / 2026 ▾</span></div><div class="admin-hero-note">🔎 <strong>Giới hạn bản demo:</strong> Doanh thu / biểu đồ là dữ liệu minh họa. Đơn vừa đặt và chỉnh sửa tồn kho được lưu cục bộ trên trình duyệt. Không có backend, phân quyền hoặc bảo mật thực.</div><div class="admin-kpis">${kpi("Doanh thu mô phỏng", "285.420.000 ₫", "▣", "↑ 12.5% so với tháng trước", "green")}${kpi("Đơn hàng (bao gồm demo)", String(342 + state.orders.length), "♧", "↑ 18.2% so với tháng trước")}${kpi("Khách hàng mới (demo)", "128", "♙", "↑ 6.7% so với tháng trước")}${kpi("Sản phẩm sắp hết", String(low.length), "⚠", "Tồn dưới 13 sản phẩm", "down")}</div><div class="admin-charts"><div class="admin-panel"><div class="admin-panel-head"><div><h3>Doanh thu & Đơn hàng</h3><div class="chart-legend"><span><i class="legend-dot"></i>Doanh thu minh họa</span><span><i class="legend-dot green"></i>Xu hướng đơn</span></div></div><span class="admin-select">Theo ngày ▾</span></div>${graphSvg()}</div><div class="admin-panel"><div class="admin-panel-head"><h3>Tỷ lệ danh mục sản phẩm</h3><span class="admin-select">Tháng này ▾</span></div><div class="donut-wrap"><div class="donut"><div class="donut-hole"><div><strong>${INITIAL.length}</strong><br><small>Sản phẩm demo</small></div></div></div><div class="donut-legend"><div>🟣 Bàn phím · 36%</div><div>🔵 Chuột · 19%</div><div>🟪 Tai nghe · 21%</div><div>🟠 Màn hình · 15%</div><div>⚪ Khác · 9%</div></div></div></div></div><div class="admin-bottom"><div class="admin-panel"><div class="admin-panel-head"><h3>Đơn hàng gần đây</h3><button class="text-link" data-route="admin/orders">Xem tất cả ↗</button></div>${shortOrderTable(demoOrders(), 5)}</div><div class="admin-panel"><div class="admin-panel-head"><h3>Sản phẩm tồn kho thấp</h3><button class="text-link" data-route="admin/inventory">Xem tất cả ↗</button></div>${
      low.length
        ? low
            .slice(0, 5)
            .map(
              (p) =>
                `<div style="display:flex;gap:9px;align-items:center;padding:9px 0;border-bottom:1px solid #e9edf4"><div class="mini-product"><div class="mini-img">${productImage(p)}</div></div><div style="flex:1;min-width:0"><b style="font-size:11px;color:#273852">${esc(p.short)}</b><small style="display:block;color:#8290a5">SKU: ${esc(p.sku)}</small></div><span class="pill ${pstock(p) < 7 ? "red" : "yellow"}">Còn ${pstock(p)}</span></div>`,
            )
            .join("")
        : `<p>Chưa có cảnh báo tồn kho.</p>`
    }</div></div>`,
  );
}
function adminProducts() {
  let pro = INITIAL.filter(
    (p) =>
      (ui.adminProductFilter === "Tất cả" || p.cat === ui.adminProductFilter) &&
      [p.name, p.sku, p.brand, p.cat]
        .join(" ")
        .toLowerCase()
        .includes(ui.adminSearch.toLowerCase()) &&
      (ui.adminStockFilter === "Tất cả" ||
        (ui.adminStockFilter === "Hết hàng" ? pstock(p) === 0 : pstock(p) > 0)),
  );
  return adminLayout(
    "products",
    `<div class="admin-intro"><div><h1>Quản lý sản phẩm</h1><p>Danh mục, sản phẩm, SKU và giá bán (mô phỏng).</p></div><button class="btn btn-primary" data-action="open-product-add">＋ Thêm sản phẩm</button></div><div class="admin-panel"><div class="admin-tabs"><button class="admin-tab ${ui.adminStockFilter === "Tất cả" ? "active" : ""}" data-action="admin-stock-filter" data-value="Tất cả">Tất cả (${INITIAL.length})</button><button class="admin-tab ${ui.adminStockFilter === "Đang kinh doanh" ? "active" : ""}" data-action="admin-stock-filter" data-value="Đang kinh doanh">Đang kinh doanh (${INITIAL.filter((p) => pstock(p) > 0).length})</button><button class="admin-tab ${ui.adminStockFilter === "Hết hàng" ? "active" : ""}" data-action="admin-stock-filter" data-value="Hết hàng">Hết hàng (${INITIAL.filter((p) => pstock(p) === 0).length})</button></div><div class="admin-toolbar"><input id="admin-product-search" class="field" placeholder="⌕ Tìm theo tên hoặc mã SKU..." value="${esc(ui.adminSearch)}" aria-label="Tìm sản phẩm quản trị"><select class="select" id="admin-product-filter"><option>Tất cả</option>${CATS.map((c) => `<option value="${c.name}" ${c.name === ui.adminProductFilter ? "selected" : ""}>${c.name}</option>`).join("")}</select><span style="font-size:11px;color:#8290a6;margin-left:auto">${pro.length} sản phẩm</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Danh mục</th><th>Giá bán</th><th>Tồn kho</th><th>Trạng thái</th><th>Thao tác</th></tr></thead><tbody>${pro.map((p) => `<tr><td><div class="mini-product"><span class="mini-img">${productImage(p)}</span><span><strong>${esc(p.short)}</strong><small>${esc(p.brand)}</small></span></div></td><td>${esc(p.sku)}</td><td>${esc(p.cat)}</td><td><strong>${money(p.price)}</strong></td><td>${pstock(p)}</td><td><span class="pill ${pstock(p) === 0 ? "red" : pstock(p) < 10 ? "yellow" : "green"}">${pstock(p) === 0 ? "Hết hàng" : pstock(p) < 10 ? "Sắp hết" : "Đang kinh doanh"}</span></td><td><button class="btn-quiet" data-action="edit-product" data-id="${p.id}">✎ Sửa</button></td></tr>`).join("")}</tbody></table></div></div>`,
  );
}
function adminInventory() {
  let rows = INITIAL.filter((p) =>
    [p.name, p.sku, p.cat]
      .join(" ")
      .toLowerCase()
      .includes(ui.adminSearch.toLowerCase()),
  );
  let low = INITIAL.filter((p) => pstock(p) < 10).length;
  return adminLayout(
    "inventory",
    `<div class="admin-intro"><div><h1>Quản lý tồn kho</h1><p>Cập nhật số lượng tồn của từng SKU (dữ liệu cục bộ).</p></div><button class="btn btn-primary" data-action="inventory-guide">? Hướng dẫn nghiệp vụ</button></div><div class="admin-kpis">${kpi("Tổng tồn kho", INITIAL.reduce((s, p) => s + pstock(p), 0).toLocaleString("vi-VN"), "▣", "Tính từ dữ liệu hiện tại", "green")}${kpi("Sản phẩm có hàng", INITIAL.filter((p) => pstock(p) > 0).length + " / " + INITIAL.length, "⬡", "SKU đang khả dụng")}${kpi("Sản phẩm sắp hết", low, "⚠", "Dưới 10 sản phẩm", "down")}${kpi("Hết hàng", INITIAL.filter((p) => pstock(p) === 0).length, "⊘", "Cần nhập kho bổ sung", "down")}</div><div class="admin-panel"><div class="admin-panel-head"><h3>Danh sách tồn kho theo SKU</h3><span class="demo-pill">CHỈ DEMO</span></div><div class="admin-toolbar"><input id="admin-product-search" class="field" placeholder="⌕ Tìm tên hoặc SKU..." value="${esc(ui.adminSearch)}"><span style="font-size:11px;color:#8794ab">Thay đổi số lượng và nhấn Enter hoặc rời ô để lưu</span></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Sản phẩm</th><th>SKU</th><th>Tồn thực tế</th><th>Tồn đang giữ</th><th>Tồn khả dụng</th><th>Cảnh báo</th></tr></thead><tbody>${rows.map((p) => `<tr><td><div class="mini-product"><span class="mini-img">${productImage(p)}</span><span><strong>${esc(p.short)}</strong><small>${esc(p.cat)}</small></span></div></td><td>${esc(p.sku)}</td><td><input type="number" class="stock-input" name="stock" data-id="${p.id}" min="0" max="999999" value="${pstock(p)}" aria-label="Tồn kho ${esc(p.name)}"></td><td>0 <small>Demo</small></td><td><strong>${pstock(p)}</strong></td><td><span class="pill ${pstock(p) === 0 ? "red" : pstock(p) < 10 ? "yellow" : "green"}">${pstock(p) === 0 ? "Hết hàng" : pstock(p) < 10 ? "Sắp hết" : "Bình thường"}</span></td></tr>`).join("")}</tbody></table></div><div class="demo-notice">Sản phẩm thật cần có <b>phiếu nhập/xuất, transaction, inventory ledger, reserved stock, audit log và đồng bộ backend</b>. Bản HTML chỉ sửa con số mô phỏng để kiểm thử UI.</div></div>`,
  );
}
function adminOrders() {
  let orders = demoOrders().filter(
    (o) =>
      (ui.adminOrderFilter === "Tất cả" || o.status === ui.adminOrderFilter) &&
      [o.id, o.name]
        .join(" ")
        .toLowerCase()
        .includes(ui.adminSearch.toLowerCase()),
  );
  return adminLayout(
    "orders",
    `<div class="admin-intro"><div><h1>Quản lý đơn hàng</h1><p>Tra cứu, theo dõi và cập nhật trạng thái đơn (đơn demo trong trình duyệt).</p></div><span class="admin-select">${orders.length} đơn hiển thị</span></div><div class="admin-panel"><div class="admin-toolbar"><input class="field" id="admin-product-search" value="${esc(ui.adminSearch)}" placeholder="⌕ Tìm mã đơn, khách hàng..."><select class="select" name="orderFilter">${["Tất cả", "Chờ xác nhận", "Đã xác nhận", "Đang xử lý", "Đang vận chuyển", "Đã giao", "Đã hủy"].map((s) => `<option ${ui.adminOrderFilter === s ? "selected" : ""}>${s}</option>`).join("")}</select></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th>Mã đơn</th><th>Khách hàng</th><th>Ngày tạo</th><th>Số SP</th><th>Tổng tiền</th><th>Trạng thái</th><th>Cập nhật</th></tr></thead><tbody>${orders.map((o) => `<tr><td><strong>${esc(o.id)}</strong></td><td>${esc(o.name)}</td><td>${new Date(o.time).toLocaleDateString("vi-VN")}</td><td>${o.items.reduce((a, b) => a + b.qty, 0)}</td><td><strong>${money(o.total)}</strong></td><td>${statusPill(o.status)}</td><td>${state.orders.some((x) => x.id === o.id) ? `<select class="select" style="width:145px" name="orderStatus" data-id="${esc(o.id)}">${["Chờ xác nhận", "Đã xác nhận", "Đang xử lý", "Đang vận chuyển", "Đã giao", "Đã hủy"].map((s) => `<option ${o.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>` : `<span style="font-size:10px;color:#8190a8">Dữ liệu mẫu</span>`}</td></tr>`).join("")}</tbody></table></div><div class="demo-notice">Ở sản phẩm production, việc thay đổi trạng thái phải được kiểm tra trên server theo state machine, phân quyền theo vai trò và ghi audit log.</div></div>`,
  );
}
function adminAnalytics() {
  return adminLayout(
    "analytics",
    `<div class="admin-intro"><div><h1>Báo cáo & phân tích</h1><p>Góc nhìn doanh thu, vận hành và hiệu quả kinh doanh — toàn bộ số liệu bên dưới là dữ liệu mẫu.</p></div><span class="admin-select">30 ngày gần nhất ▾</span></div><div class="admin-kpis">${kpi("Doanh thu ước tính", "285.420.000 ₫", "▣", "↑ 12.5% so với tháng trước")}${kpi("Lợi nhuận gộp mẫu", "86.200.000 ₫", "↗", "↑ 10.2%")}${kpi("Tổng đơn", "342", "♧", "↑ 18.2%")}${kpi("Tỷ lệ hủy mẫu", "2.3%", "⚠", "↓ 0.8%")}</div><div class="admin-panel" style="margin-bottom:17px"><div class="admin-panel-head"><div><h3>Doanh thu theo thời gian</h3><p style="font-size:11px;color:#7c8aa2;margin:5px 0 0">Dữ liệu mẫu phục vụ thiết kế UI/UX</p></div><span class="admin-select">Tháng này ▾</span></div>${graphSvg(true)}</div><div class="admin-charts"><div class="admin-panel"><h3>Sản phẩm bán chạy (mẫu)</h3>${INITIAL.slice(
      0,
      5,
    )
      .map(
        (p, i) =>
          `<div style="display:flex;align-items:center;gap:12px;margin:18px 0"><div style="font-size:11px;color:#7e8ba0;width:18px">0${i + 1}</div><div style="font-size:11px;color:#2d3a52;width:156px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(p.short)}</div><div style="height:10px;background:#edf1f8;border-radius:10px;flex:1;overflow:hidden"><div style="height:100%;background:linear-gradient(90deg,#6355fc,#54cee3);width:${90 - i * 14}%"></div></div><b style="font-size:11px;color:#22334c">${Math.round(120 - i * 19)}</b></div>`,
      )
      .join(
        "",
      )}</div><div class="admin-panel"><h3>Đóng góp danh mục (mẫu)</h3><div class="donut-wrap"><div class="donut"><div class="donut-hole"><div><strong>100%</strong><br><small>Dữ liệu mẫu</small></div></div></div><div class="donut-legend"><div>🟣 Bàn phím — 36%</div><div>🔵 Chuột — 19%</div><div>🟪 Tai nghe — 21%</div><div>🟠 Màn hình — 15%</div><div>⚪ Khác — 9%</div></div></div></div></div>`,
  );
}
function modalView() {
  let p = ui.modal?.id ? INITIAL.find((x) => x.id === ui.modal.id) : null;
  const fallback = `assets/images/categories/${CATEGORY_IMAGE_BY_TYPE[p?.type] || CATEGORY_IMAGE_BY_TYPE.keyboard}`;
  const image = p?.image || fallback;
  const isUploaded = image.startsWith("data:");
  return `<div class="modal-back" id="modal-back"><div class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><h2 id="modal-title">${p ? "Chỉnh sửa sản phẩm" : "Thêm sản phẩm demo"}</h2><form data-form="product-editor"><input type="hidden" name="id" value="${p?.id || ""}"><label class="field-label">Tên sản phẩm *</label><input class="field" name="name" required maxlength="100" value="${esc(p?.name || "")}"><div class="form-grid"><div><label class="field-label">Giá bán (VND) *</label><input class="field" type="number" name="price" min="1000" max="1000000000" required value="${p?.price || ""}"></div><div><label class="field-label">Số lượng tồn *</label><input class="field" type="number" name="stock" min="0" max="999999" required value="${p ? pstock(p) : 0}"></div></div><div class="form-grid"><div><label class="field-label">Danh mục</label><select class="select" name="cat">${CATS.map((c) => `<option ${p?.cat === c.name ? "selected" : ""}>${c.name}</option>`).join("")}</select></div><div><label class="field-label">Thương hiệu</label><input class="field" name="brand" maxlength="50" value="${esc(p?.brand || "NEXA")}"></div></div><section class="product-image-editor" aria-label="Ảnh sản phẩm"><div class="product-image-editor-preview"><img id="product-image-preview" src="${esc(image)}" alt="Xem trước ảnh sản phẩm"><span id="product-image-empty" hidden>Không tải được ảnh</span></div><div class="product-image-editor-fields"><label class="field-label" for="product-image-path">Đường dẫn ảnh</label><input class="field" id="product-image-path" type="text" value="${isUploaded ? "" : esc(image)}" placeholder="assets/images/... hoặc https://..." autocomplete="off"><input type="hidden" id="product-image-value" name="image" value="${esc(image)}"><label class="field-label" for="product-image-file">Hoặc tải ảnh từ máy</label><input class="field" id="product-image-file" type="file" accept="image/*"><small id="product-image-status" class="product-image-status">${isUploaded ? "Ảnh tải lên đang được lưu trong trình duyệt." : "Đổi đường dẫn hoặc chọn ảnh; ảnh sẽ cập nhật ở các trang sản phẩm."}</small></div></section><div class="modal-actions"><button type="button" class="btn-quiet" data-action="close-modal">Hủy</button><button class="btn btn-violet" type="submit">${p ? "Lưu thay đổi" : "Thêm sản phẩm"}</button></div></form><p style="font-size:10px;color:#8390a6;margin:17px 0 0">Bản demo lưu chỉnh sửa trong trình duyệt này; chưa tải ảnh lên database.</p></div></div>`;
}
