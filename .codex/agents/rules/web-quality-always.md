---
trigger: always_on
description: "Always consider security, privacy/legal risk, accessibility and non-generic UI for web changes. Run the web-release-quality skill for reviews and before release."
---

# Web Quality — Always-On Guardrail

Áp dụng mỗi khi xây dựng/chỉnh sửa website, backend, frontend, OAuth, payment, admin, database, deploy hoặc nội dung hiển thị.

1. **Trước khi code** đọc context và đường dữ liệu thật (UI → API → permission → validation → DB). Không invent API, DB tables, test results hoặc thay mock cho lỗi API.
2. **Bảo mật trước**: server-side auth/RBAC/ownership, secrets chỉ ở backend, validate + rate limit, chống injection, TLS và safe session. Không làm yếu bảo mật chỉ để luồng demo chạy.
3. **Dữ liệu & pháp lý**: data minimization, không tạo review giả dưới danh nghĩa khách thật, không claim chính sách/giấy phép/khuyến mãi chưa xác minh, không tự tạo consent tracking. Kiểm tra đúng luật và quốc gia trước khi đánh dấu compliant.
4. **UI/UX có bản sắc**: chọn bố cục theo nhiệm vụ người dùng và nhận diện, không mặc định hero+badge+gradient+3 cards+glow+animations; chú trọng keyboard, alt, tương phản, mobile, loading/errors và reduced-motion.
5. **Review thay đổi**: test đúng phạm vi, trình bày bằng chứng, không khẳng định pass cho hạ tầng hoặc luật khi chưa kiểm chứng.
6. **Trước release hoặc audit toàn bộ**: bắt buộc đọc skill `.agents/skills/web-release-quality/SKILL.md` và ba checklist references, báo cáo đủ 60 mục với status rõ ràng; chặn release nếu có P0/P1 quan trọng chưa xử lý.

Không tự sửa/xóa dữ liệu production, secret, tài khoản thật hoặc tạo Issue chỉ vì có ý tưởng; mọi hành động quan trọng phải đúng phạm vi người dùng giao.
