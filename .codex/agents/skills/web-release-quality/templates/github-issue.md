# [P1][S10][Orders] Ví dụ: BOLA cho xem đơn hàng khác

> Chỉ tạo Issue này khi bug đã được xác minh. Không dùng ví dụ làm bug thật.

## Tóm tắt
Nêu **hành vi thực**, kết quả mong đợi và tác động. Không nói “bị hack” nếu chưa có chứng cứ.

## Finding metadata
- Checklist ID: S10 / Lxx / Uxx
- Severity: P0/P1/P2/P3
- Confidence: confirmed / strong / suspected
- Branch / commit:
- Fingerprint (module + rule ID + root cause):
- Files/lines:
- Affected endpoints/pages:

## Evidence & reproduction
1. Chuẩn bị user A và B trong môi trường được phép.
2. Gọi endpoint với token A và đối tượng thuộc B.
3. Ghi status & loại dữ liệu trả về (ẩn PII và secrets).

Expected:
Actual:
Test log/screenshot/PR link:

## Fix proposal
- Nguyên nhân cần xử lý:
- File/API/service/migration đề xuất:
- Security/privacy/UX tradeoffs:
- Không xóa dữ liệu thật; rollback plan nếu thay đổi DB.

## Acceptance criteria
- [ ] Test âm tính/positive được bổ sung.
- [ ] Không còn đường truy cập vượt quyền.
- [ ] Tests cũ vẫn pass, không phá chức năng hợp lệ.
- [ ] Kết quả có log/test được tái hiện.

## Trạng thái
- Existing Issue/PR đã đối chiếu:
- Owner:
- Verification method:
