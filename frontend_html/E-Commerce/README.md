# NEXA GEAR × CommerceOS — Modular Frontend V3

Dự án HTML/CSS/Vanilla JS, **31 trang HTML riêng, CSS tách 16 file theo base/components/pages/themes, JS tách thành các module theo thư mục, ảnh SVG tách khỏi markup**. Có Dark/Light Mode, slider, sản phẩm, giỏ hàng, voucher, checkout mô phỏng, VNPay UI, chatbox, reviews, Admin.

## Chạy thử

Trong thư mục dự án, chạy:

```bash
python -m http.server 5500
```

Mở `http://localhost:5500/home.html` hoặc VS Code → Live Server. Xem Admin tại `admin_dashboard.html`.

## Cấu trúc dự án và build

- `assets/css/base`, `components`, `pages`, `themes`: CSS có trách nhiệm rõ ràng.
- `assets/js/{data,utils,ui,pages,features,app,config}`: chia logic theo nhóm nghiệp vụ. Đây là **classic JavaScript scripts theo thứ tự**, chưa phải ES modules/bundler chuyên nghiệp.
- `assets/images/{products,categories,illustrations}`: SVG vector placeholder tách khỏi HTML; thay bằng WebP/AVIF cho cửa hàng thật.
- `python tools/build_frontend.py` tạo `dist/` với một CSS, một JS chính và file khởi tạo theme.
- `python tests/check_project.py` chạy kiểm tra tĩnh liên kết, cú pháp và SVG.

## Học theo từng nhiệm vụ
Mở `CommerceOS_Hoc_Theo_Tung_Sheet.xlsx`: sheet `MUC_LUC`, sau đó click tên sheet `T-001` ... `T-084`, `V2-01` ... `V2-40`. Mỗi sheet có mục tiêu, hướng dẫn, gợi ý code, file liên quan, test và lưu ý bảo mật/performance. Không bắt buộc làm tất cả để có bản MVP.

Xem `docs/ARCHITECTURE.md` để hiểu mỗi folder dùng làm gì; `docs/TESTING.md` về checklist.

> Cảnh báo: đây là frontend mô phỏng, không có backend. Không nhập dữ liệu tài khoản, thẻ thanh toán hoặc dữ liệu khách hàng thật.
