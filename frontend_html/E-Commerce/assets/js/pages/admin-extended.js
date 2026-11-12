/* Customer / promotions / reviews / support / settings | NEXA / CommerceOS static demo. */
const adminIntro = (title, sub) =>
  `<div class="admin-intro"><div><h1>${title}</h1><p>${sub} · dữ liệu minh họa / lưu cục bộ</p></div><span class="demo-pill">ADMIN FRONTEND</span></div>`;
const adminPanel = (content) =>
  `<div class="admin-panel ux-admin-panel">${content}</div>`;
const table = (headers, rows) =>
  `<div class="admin-table-wrap"><table class="admin-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
const customers = () =>
  adminLayout(
    "customers",
    adminIntro("Quản lý khách hàng", "CRM cơ bản và phân nhóm khách hàng") +
      adminPanel(
        `<h3>Khách hàng mẫu</h3>${table(
          ["Khách hàng", "Phân nhóm", "Đơn hàng", "Tổng chi", "Trạng thái"],
          [
            [
              "Nguyễn Văn An",
              "VIP",
              "12",
              "28.490.000 ₫",
              statusPill("Đã xác nhận"),
            ],
            [
              "Trần Thị Mai",
              "Mới",
              "2",
              "7.480.000 ₫",
              statusPill("Đã xác nhận"),
            ],
            [
              "Lê Minh Hoàng",
              "Thường",
              "5",
              "13.240.000 ₫",
              statusPill("Đã xác nhận"),
            ],
          ],
        )}<p class="ux-note">Dữ liệu CRM giả, không có thông tin cá nhân khách hàng thật.</p>`,
      ),
  );
let promotionEditorId = null,
  promotionEditorOpen = false;
function openPromotionModal(id = null) {
  promotionEditorId = id;
  promotionEditorOpen = true;
  render();
  setTimeout(() => document.getElementById("promo-code")?.focus(), 0);
}
function closePromotionModal() {
  promotionEditorId = null;
  promotionEditorOpen = false;
  render();
}
function promotionAmount(p) {
  return p.type === "percent"
    ? `${Number(p.value)}%`
    : p.type === "fixed"
      ? money(p.value)
      : "Miễn phí vận chuyển";
}
function promotionModalView() {
  const p =
    promotionEditorId === null
      ? null
      : state.promotions.find((x) => x.id === promotionEditorId);
  return `<div class="modal-back" id="promotion-modal-back"><div class="modal promotion-modal" role="dialog" aria-modal="true" aria-labelledby="promotion-title"><h2 id="promotion-title">${p ? "Chỉnh sửa ưu đãi" : "Thêm ưu đãi"}</h2><form data-form="promotion-editor"><input type="hidden" name="id" value="${p?.id || ""}"><label class="field-label" for="promo-code">Mã ưu đãi *</label><input class="field" id="promo-code" name="code" required maxlength="24" pattern="[A-Za-z0-9_-]+" value="${esc(p?.code || "")}" placeholder="VD: NEXA15"><label class="field-label" for="promo-name">Tên chương trình *</label><input class="field" id="promo-name" name="name" required maxlength="80" value="${esc(p?.name || "")}" placeholder="Tên hiển thị"><label class="field-label" for="promo-description">Mô tả</label><input class="field" id="promo-description" name="description" maxlength="160" value="${esc(p?.description || "")}" placeholder="Điều kiện hoặc nội dung ưu đãi"><div class="form-grid"><div><label class="field-label" for="promo-type">Loại ưu đãi</label><select class="select" id="promo-type" name="type"><option value="percent" ${p?.type === "percent" ? "selected" : ""}>Giảm theo phần trăm</option><option value="fixed" ${p?.type === "fixed" ? "selected" : ""}>Giảm số tiền</option><option value="shipping" ${p?.type === "shipping" ? "selected" : ""}>Miễn phí vận chuyển</option></select></div><div><label class="field-label" for="promo-value">Giá trị giảm</label><input class="field" id="promo-value" name="value" type="number" min="0" max="1000000000" value="${p?.value ?? 10}"></div></div><div><label class="field-label" for="promo-min-order">Đơn hàng tối thiểu (₫)</label><input class="field" id="promo-min-order" name="minOrder" type="number" min="0" max="1000000000" value="${p?.minOrder || 0}"></div><label class="promotion-active"><input type="checkbox" name="active" ${p?.active !== false ? "checked" : ""}> Đang áp dụng</label><div class="modal-actions"><button type="button" class="btn-quiet" data-action="promotion-close">Hủy</button><button class="btn btn-violet" type="submit">${p ? "Lưu ưu đãi" : "Tạo ưu đãi"}</button></div></form><p class="promotion-demo-note">Ưu đãi được lưu trong trình duyệt này và dùng cho trang voucher/giỏ hàng của bản demo.</p></div></div>`;
}
const adminPromotions = () => {
  const promotions = state.promotions || [];
  return adminLayout(
    "promotions",
    adminIntro(
      "Mã giảm giá & chương trình",
      "Quản lý nội dung, điều kiện và trạng thái ưu đãi",
    ) +
      `<div class="admin-intro promotion-toolbar"><span>${promotions.length} chương trình</span><button class="btn btn-primary" data-action="promotion-add">＋ Thêm ưu đãi</button></div>` +
      adminPanel(
        `<h3>Danh sách ưu đãi</h3>${table(
          [
            "Mã",
            "Chương trình",
            "Loại ưu đãi",
            "Mức giảm",
            "Đơn tối thiểu",
            "Trạng thái",
            "Thao tác",
          ],
          promotions.map((p) => [
            esc(p.code),
            `<strong>${esc(p.name)}</strong><small class="promotion-description">${esc(p.description || "")}</small>`,
            p.type === "percent"
              ? "Phần trăm"
              : p.type === "fixed"
                ? "Số tiền"
                : "Vận chuyển",
            promotionAmount(p),
            money(p.minOrder || 0),
            `<span class="pill ${p.active ? "green" : "yellow"}">${p.active ? "Đang áp dụng" : "Tạm dừng"}</span>`,
            `<div class="promotion-actions"><button class="btn-quiet" data-ux="copy" data-copy="${esc(p.code)}">Sao chép</button><button class="btn-quiet" data-action="promotion-edit" data-id="${p.id}">✎ Sửa</button><button class="btn-quiet" data-action="promotion-toggle" data-id="${p.id}">${p.active ? "Tạm dừng" : "Kích hoạt"}</button></div>`,
          ]),
        )}<p class="ux-note">Mã đang áp dụng cũng xuất hiện ở trang voucher và được tính trong giỏ hàng demo.</p>`,
      ) +
      (promotionEditorOpen ? promotionModalView() : ""),
  );
};
let reviewEditorId = null,
  reviewEditorOpen = false;
function openReviewModal(id) {
  reviewEditorId = id;
  reviewEditorOpen = true;
  render();
  setTimeout(() => document.getElementById("review-name")?.focus(), 0);
}
function closeReviewModal() {
  reviewEditorId = null;
  reviewEditorOpen = false;
  render();
}
function reviewModalView() {
  const r = reviewsForAdmin().find((x) => x.id === reviewEditorId);
  if (!r) return "";
  return `<div class="modal-back" id="review-modal-back"><div class="modal admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="review-title"><h2 id="review-title">Chỉnh sửa đánh giá</h2><form data-form="review-editor"><input type="hidden" name="id" value="${r.id}"><label class="field-label" for="review-name">Tên hiển thị</label><input class="field" id="review-name" name="name" maxlength="40" required value="${esc(r.name)}"><label class="field-label" for="review-product">Sản phẩm</label><select class="select" id="review-product" name="product">${INITIAL.map((p) => `<option value="${p.id}" ${p.id === Number(r.product) ? "selected" : ""}>${esc(p.short)}</option>`).join("")}</select><label class="field-label" for="review-stars">Số sao</label><select class="select" id="review-stars" name="stars">${[5, 4, 3, 2, 1].map((n) => `<option value="${n}" ${n === Number(r.stars) ? "selected" : ""}>${n} sao</option>`).join("")}</select><label class="field-label" for="review-text">Nội dung đánh giá</label><textarea class="field" id="review-text" name="text" rows="5" minlength="10" maxlength="500" required>${esc(r.text)}</textarea><label class="promotion-active"><input type="checkbox" name="visible" ${r.visible !== false ? "checked" : ""}> Hiển thị đánh giá trên cửa hàng</label><div class="modal-actions"><button type="button" class="btn-quiet" data-action="review-close">Hủy</button><button type="submit" class="btn btn-violet">Lưu đánh giá</button></div></form><p class="promotion-demo-note">Thay đổi được lưu cục bộ trong trình duyệt này.</p></div></div>`;
}
const adminReviews = () => {
  const reviews = reviewsForAdmin();
  return adminLayout(
    "reviews",
    adminIntro(
      "Kiểm duyệt đánh giá",
      "Chỉnh sửa nội dung và kiểm soát hiển thị đánh giá",
    ) +
      adminPanel(
        `<h3>${reviews.length} đánh giá</h3>${table(
          [
            "Tên",
            "Sản phẩm",
            "Số sao",
            "Nội dung",
            "Nguồn",
            "Trạng thái",
            "Thao tác",
          ],
          reviews.map((r) => [
            esc(r.name),
            esc(INITIAL.find((p) => p.id === r.product)?.short || "—"),
            stars(r.stars),
            esc(r.text.slice(0, 120)),
            r.verified ? "Mẫu" : "Khách hàng",
            `<span class="pill ${r.visible === false ? "yellow" : "green"}">${r.visible === false ? "Đang ẩn" : "Đang hiển thị"}</span>`,
            `<div class="promotion-actions"><button class="btn-quiet" data-action="review-edit" data-id="${r.id}">✎ Sửa</button><button class="btn-quiet" data-action="review-toggle" data-id="${r.id}">${r.visible === false ? "Hiện" : "Ẩn"}</button></div>`,
          ]),
        )}<p class="ux-note">Đánh giá ẩn sẽ không xuất hiện trên trang sản phẩm hoặc trang cộng đồng.</p>`,
      ) +
      (reviewEditorOpen ? reviewModalView() : ""),
  );
};
let supportEditorId = null,
  supportEditorOpen = false;
function openSupportModal(id) {
  supportEditorId = id;
  supportEditorOpen = true;
  render();
  setTimeout(() => document.getElementById("support-customer")?.focus(), 0);
}
function closeSupportModal() {
  supportEditorId = null;
  supportEditorOpen = false;
  render();
}
function supportModalView() {
  const t = demoSupportTickets.find((x) => x.id === supportEditorId);
  if (!t) return "";
  return `<div class="modal-back" id="support-modal-back"><div class="modal admin-editor-modal" role="dialog" aria-modal="true" aria-labelledby="support-title"><h2 id="support-title">Cập nhật yêu cầu ${esc(t.code)}</h2><form data-form="support-editor"><input type="hidden" name="id" value="${t.id}"><label class="field-label" for="support-customer">Khách hàng</label><input class="field" id="support-customer" name="customer" maxlength="80" required value="${esc(t.customer)}"><label class="field-label" for="support-subject">Chủ đề</label><input class="field" id="support-subject" name="subject" maxlength="100" required value="${esc(t.subject)}"><label class="field-label" for="support-message">Nội dung yêu cầu</label><textarea class="field" id="support-message" name="message" rows="3" maxlength="1000" required>${esc(t.message)}</textarea><div class="form-grid"><div><label class="field-label" for="support-priority">Độ ưu tiên</label><select class="select" id="support-priority" name="priority">${["Thấp", "Trung bình", "Cao"].map((x) => `<option ${t.priority === x ? "selected" : ""}>${x}</option>`).join("")}</select></div><div><label class="field-label" for="support-status">Trạng thái</label><select class="select" id="support-status" name="status">${["Mới", "Đang xử lý", "Đã phản hồi", "Đã đóng"].map((x) => `<option ${t.status === x ? "selected" : ""}>${x}</option>`).join("")}</select></div></div><label class="field-label" for="support-response">Phản hồi nội bộ / trả lời mẫu</label><textarea class="field" id="support-response" name="response" rows="3" maxlength="1000" placeholder="Ghi nội dung phản hồi">${esc(t.response || "")}</textarea><div class="modal-actions"><button type="button" class="btn-quiet" data-action="support-close">Hủy</button><button type="submit" class="btn btn-violet">Lưu yêu cầu</button></div></form><p class="promotion-demo-note">Ticket minh họa được lưu cục bộ; chưa gửi email hoặc tin nhắn thật.</p></div></div>`;
}
const adminSupport = () =>
  adminLayout(
    "support",
    adminIntro(
      "Ticket & chăm sóc khách hàng",
      "Cập nhật nội dung, độ ưu tiên, trạng thái và phản hồi",
    ) +
      adminPanel(
        `<h3>${demoSupportTickets.length} yêu cầu hỗ trợ</h3>${table(
          [
            "Ticket",
            "Khách hàng",
            "Chủ đề",
            "Độ ưu tiên",
            "Trạng thái",
            "Thao tác",
          ],
          demoSupportTickets.map((t) => [
            esc(t.code),
            esc(t.customer),
            esc(t.subject),
            esc(t.priority),
            `<span class="pill ${t.status === "Đã đóng" ? "green" : t.status === "Đang xử lý" ? "blue" : "yellow"}">${esc(t.status)}</span>`,
            `<button class="btn-quiet" data-action="support-edit" data-id="${t.id}">✎ Sửa</button>`,
          ]),
        )}<div class="ux-two"><div><h3>Mẫu trả lời tự động</h3><textarea class="field" rows="3" readonly>Xin chào, NEXA đã tiếp nhận yêu cầu của bạn. Đây là mẫu giao diện không gửi tin nhắn thật.</textarea></div><div><h3>Trò chuyện thử</h3><button data-ux="chat-toggle" class="btn btn-violet">Mở chatbox demo →</button></div></div>`,
      ) +
      (supportEditorOpen ? supportModalView() : ""),
  );
const adminSettings = () =>
  adminLayout(
    "settings",
    adminIntro("Cài đặt hệ thống", "Giao diện cấu hình và chuẩn bị tích hợp") +
      adminPanel(
        `<h3>Trạng thái các dịch vụ</h3>${table(
          ["Dịch vụ", "Hiện tại", "Muốn chạy production"],
          [
            [
              "Xác thực Google/Facebook",
              "Giao diện demo",
              "OAuth 2.0 + PKCE + callback server",
            ],
            [
              "Email",
              "mailto & thông báo demo",
              "Email API/SMTP worker + rate limit",
            ],
            ["VNPay / MoMo", "Mô phỏng", "Backend IPN + chữ ký + idempotency"],
            [
              "Chat hỗ trợ",
              "Bot luật cố định trong JS",
              "WebSocket hoặc nhà cung cấp livechat",
            ],
            [
              "Kho hàng & người dùng",
              "localStorage",
              "PostgreSQL + transaction / phân quyền",
            ],
            ["Ảnh sản phẩm", "SVG inline", "CDN/WebP/AVIF + lazy load"],
          ],
        )}<button class="btn btn-quiet" data-ux="clear-demo">Đặt lại dữ liệu demo trên trình duyệt</button>`,
      ),
  );
window.extraPages = {
  login,
  register,
  profile,
  wishlist,
  reviews,
  vouchers,
  contact,
  faq,
  shipping: shippingPage,
  tracking,
  payment,
  about,
  privacy,
  "admin/customers": customers,
  "admin/promotions": adminPromotions,
  "admin/reviews": adminReviews,
  "admin/support": adminSupport,
  "admin/settings": adminSettings,
};
