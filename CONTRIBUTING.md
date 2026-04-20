# Hướng Dẫn Đóng Góp

Cảm ơn bạn đã đóng góp cho Greengrass Backend.

## Quy Trình Phát Triển

1. Fork hoặc tạo nhánh tính năng từ `main`.
2. Giữ các thay đổi tập trung vào một mối quan tâm cho mỗi PR.
3. Thêm/cập nhật kiểm thử cho các thay đổi hành vi.
4. Chạy kiểm tra cục bộ trước khi push.

## Danh Sách Kiểm Tra Xác Thực Cục Bộ

Chạy các lệnh sau trước khi mở PR:

```bash
yarn test
yarn test:e2e
yarn build
```

Tùy chọn:

```bash
yarn lint:check
```

## Khuyến Nghị Về Nhánh Và Commit

- Đặt tên nhánh:
  - `feat/<tên-tính-năng>`
  - `fix/<tên-vấn-đề>`
  - `chore/<tên-công-việc>`
- Ưu tiên các commit nhỏ, tập trung với thông điệp rõ ràng.

## Tiêu Chuẩn Viết Code

- Sử dụng kiểu TypeScript nghiêm ngặt khi có thể.
- Giữ logic controller mỏng, logic nghiệp vụ trong các service.
- Xác thực đầu vào bên ngoài qua DTO + class-validator.
- Tái sử dụng các guards/decorators/utils chung từ `src/common`.
- Tránh tạo các tính trừu tượng hạ tầng trùng lặp.

## Kỳ Vọng Kiểm Thử

- Kiểm thử đơn vị cho hành vi service/controller.
- Kiểm thử E2E cho các đường dẫn API quan trọng.
- Thêm kiểm thử hồi quy khi sửa lỗi.

## Danh Sách Kiểm Tra Pull Request

- [ ] Phạm vi rõ ràng và được tài liệu hóa
- [ ] Kiểm thử đã thêm/cập nhật
- [ ] `yarn test` đạt
- [ ] `yarn test:e2e` đạt
- [ ] `yarn build` đạt
- [ ] README/docs được cập nhật khi API hoặc thiết lập thay đổi

## Lưu ý Bảo Mật

- Không commit các thông tin bí mật.
- Chỉ sử dụng `.env.example` làm mẫu.
- Ưu tiên cài đặt an toàn và kiểm tra ủy quyền rõ ràng.
