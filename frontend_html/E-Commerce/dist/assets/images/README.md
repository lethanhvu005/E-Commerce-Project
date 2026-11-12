# Image assets

- `products/`: SVG mẫu theo SKU (sinh ra từ hình minh họa vector của V2).
- `categories/`: SVG minh họa từng loại sản phẩm.
- `illustrations/`: hero và các ảnh SVG được tách từ HTML.

Để triển khai cửa hàng thật: thay SVG minh họa bằng ảnh sản phẩm có giấy phép, xuất AVIF/WebP nhiều kích thước, xác định width/height để giảm CLS, lazy-load dưới màn hình đầu và dùng responsive srcset cho mobile. Không lưu ảnh người dùng trực tiếp vào repo khi lên production; dùng object storage/CDN.
