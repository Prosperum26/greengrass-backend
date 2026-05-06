# Greengrass Backend

Backend NestJS sẵn sàng cho sản xuất của nền tảng Greengrass, tập trung vào sự kiện môi trường, quy trình check-in, thông báo và gamification.

## Tổng Quan Dự Án

Greengrass Backend cung cấp API cho:

- Xác thực và phân quyền người dùng (JWT + luồng refresh token)
- Quản lý vòng đời sự kiện (tạo, duyệt, đăng ký, quản lý người tham gia)
- Check-in sự kiện dựa trên QR
- Điểm, huy hiệu, streaks và bảng xếp hạng
- Gửi thông báo và công việc nhắc nhở
- Đánh dấu bản đồ và khám phá sự kiện lân cận
- Quản lý yêu cầu người tổ chức cho admin

Dự án này được thiết kế để hỗ trợ cả phát triển cục bộ và triển khai đám mây (Render).

## Công Nghệ Sử Dụng

- Runtime: Node.js 20+
- Framework: NestJS 11
- Ngôn ngữ: TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: Passport JWT + bcrypt
- Validation: class-validator + class-transformer
- Testing: Jest (unit + e2e)
- CI/CD: GitHub Actions + Render Deploy Hook

## Kiến Trúc

### Phân Lớp

- Lớp `Controller`: Định tuyến HTTP và xử lý request/response
- Lớp `Service`: Logic nghiệp vụ và điều phối
- `Truy cập dữ liệu`: Prisma client qua `PrismaService`
- `Cross-cutting`: guards, decorators, filters, interceptors trong `src/common`

### Các Module Chính

- `auth`: đăng nhập/đăng ký/refresh/đăng xuất (JWT + Google OAuth)
- `users`: hồ sơ và thống kê người dùng
- `events`: event CRUD, đăng ký, xem người tham gia
- `registrations`: quản lý đăng ký sự kiện riêng biệt
- `checkin`: tạo QR và check-in sự kiện với xác thực GPS
- `gamification`: điểm, huy hiệu, streaks
- `leaderboard`: bảng xếp hạng người dùng
- `notifications`: thông báo trong ứng dụng + nhắc nhở theo lịch
- `map`: đánh dấu bản đồ và tìm kiếm lân cận
- `admin`: luồng xem xét yêu cầu người tổ chức
- `upload`: upload ảnh lên Cloudinary
- `chatbot`: tích hợp trợ lý AI (OpenRouter API)

### Luồng Dữ Liệu (Request Điển Hình)

1. Client gửi request có/không có JWT.
2. Guards xác thực authentication/role (`JwtAuthGuard`, `RolesGuard`).
3. Xác thực DTO chạy qua `ValidationPipe` toàn cục.
4. Controller ủy thác cho Service.
5. Service thực thi logic nghiệp vụ và thao tác Prisma.
6. Filter/interceptor toàn cục chuẩn hóa lỗi và logs.

## Bắt Đầu (Môi Trường Cục Bộ)

### Yêu Cầu Trước

- Node.js 20+
- Yarn 1.22+
- PostgreSQL chạy cục bộ hoặc từ xa

### 1) Cài đặt dependencies

```bash
yarn install
```

### 2) Cấu hình môi trường

Tạo file `.env` trong thư mục gốc với các biến sau:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/greengrass

# JWT Secrets (tối thiểu 32 ký tự)
JWT_SECRET=your-jwt-secret-key-min-32-characters
JWT_REFRESH_SECRET=your-refresh-secret-key-min-32-char

# QR Check-in Secret (tối thiểu 16 ký tự)
QR_SECRET=your-qr-secret-key

# CORS
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Server
NODE_ENV=development
PORT=3000

# Admin Account (cho seed)
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin123
ADMIN_FULL_NAME=System Admin

# Google OAuth (tùy chọn)
GOOGLE_CLIENT_ID=your-google-client-id

# Cloudinary (tùy chọn)
CLOUDINARY_CLOUD_NAME=your-cloud
CLOUDINARY_API_KEY=your-key
CLOUDINARY_API_SECRET=your-secret

# OpenRouter AI (tùy chọn)
OPENROUTER_API_KEY=your-openrouter-key
```

### 3) Chạy database migrations

```bash
yarn db:migrate:deploy
```

### 4) Seed dữ liệu (tạo admin account)

```bash
yarn seed
```

### 5) Khởi động server phát triển

```bash
yarn start:dev
```

Backend chạy trên `http://localhost:3000` theo mặc định.

## Thiết Lập Môi Trường Sản Xuất

### Build và chạy

```bash
yarn build
yarn start:prod
```

### Triển khai Render

Repository này bao gồm `render.yaml` với:

- Lệnh build: `yarn install --frozen-lockfile && yarn build`
- Lệnh start: `yarn db:migrate:deploy && yarn start:prod`

Tạo Render web service và kết nối repository. Đảm bảo tất cả các biến môi trường bắt buộc được cấu hình trong Render.

## Hướng Dẫn Biến Môi Trường

Các biến bắt buộc cốt lõi:

- `DATABASE_URL`: chuỗi kết nối PostgreSQL
- `JWT_SECRET`: bí mật ký access token (khuyến nghị tối thiểu 32 ký tự)
- `JWT_REFRESH_SECRET`: bí mật ký refresh token (khuyến nghị tối thiểu 32 ký tự)
- `QR_SECRET`: bí mật QR check-in (khuyến nghị tối thiểu 16 ký tự)
- `ALLOWED_ORIGINS`: các nguồn CORS được phép, phân tách bằng dấu phẩy
- `NODE_ENV`: `development` hoặc `production`
- `PORT`: cổng server
- `ADMIN_EMAIL`: email admin account (cho seed)
- `ADMIN_PASSWORD`: mật khẩu admin account (cho seed)
- `ADMIN_FULL_NAME`: tên đầy đủ admin account (cho seed)

Tích hợp tùy chọn:

- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `OPENROUTER_API_KEY`
- `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_FULL_NAME`

## Tài Liệu API (Cơ Bản)

### Swagger

Swagger UI được bật trong môi trường phát triển:

- `GET /api`

### Các nhóm endpoint chính

- Auth: `/auth/*`
- Users: `/users/*`
- Events: `/events/*`
- Registrations: `/registrations/*`
- Check-in: `/events/:eventId/qr`, `/events/:eventId/check-in`
- Gamification: `/points/*`, `/badges/*`
- Leaderboard: `/leaderboard/*`
- Notifications: `/notifications/*`
- Admin: `/admin/*`
- Map: `/map/*`
- Upload: `/upload/*`
- Chatbot: `/chatbot/*`
- Forum: `/forum/*`

### Định dạng header Auth

```http
Authorization: Bearer <access_token>
```

## Kiểm Thử

Chạy tất cả các bộ kiểm thử:

```bash
yarn test
yarn test:e2e
```

Các lệnh kiểm thử bổ sung:

```bash
yarn test:watch
yarn test:cov
```

## CI/CD

### Quy trình CI

File: `.github/workflows/ci.yml`

Khi PR và push lên `main`, CI chạy:

1. Cài đặt dependencies
2. Cung cấp dịch vụ PostgreSQL
3. Chạy Prisma migrations
4. Kiểm tra lint (hiện không bắt buộc)
5. Kiểm thử đơn vị
6. Kiểm thử E2E
7. Build

### Quy trình CD (Render)

File: `.github/workflows/deploy-render.yml`

- Trigger: khi quy trình CI thành công trên `main`
- Hành động: gọi Render Deploy Hook qua GitHub secret `RENDER_DEPLOY_HOOK_URL`

GitHub secret bắt buộc:

- `RENDER_DEPLOY_HOOK_URL`

## Script Hữu Ích

- `yarn start:dev`: chạy ở chế độ watch
- `yarn build`: biên dịch TypeScript
- `yarn start:prod`: chạy server đã biên dịch
- `yarn db:migrate:deploy`: áp dụng Prisma migrations an toàn cho production
- `yarn test`: kiểm thử đơn vị
- `yarn test:e2e`: kiểm thử e2e

## Đóng Góp

Xem `CONTRIBUTING.md` cho quy trình phát triển, tiêu chuẩn viết code và danh sách kiểm tra PR.
