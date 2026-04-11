<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<h1 align="center">Greengrass Backend</h1>

<p align="center">Backend API cho ứng dụng Greengrass - Xây dựng với NestJS framework</p>

---

## Mô tả dự án

**Greengrass Backend** là một REST API được xây dựng bằng [NestJS](https://nestjs.com/) - framework Node.js tiến bộ dùng để xây dựng ứng dụng server-side hiệu quả và có khả năng mở rộng.

Dự án bao gồm các chức năng chính:

- **Xác thực người dùng** (Auth)
- **Quản lý người dùng** (Users)
- **Quản lý sự kiện** (Events)
- **Đăng ký tham gia** (Registrations)
- **Check-in** (Checkin)
- **Gamification** (Hệ thống điểm thưởng)
- **Bảng xếp hạng** (Leaderboard)
- **Bản đồ** (Map)
- **Diễn đàn** (Forum)
- **Thông báo** (Notifications)

---

## Yêu cầu hệ thống

- **Node.js**: phiên bản 18.x hoặc cao hơn
- **Yarn**: package manager (đã cấu hình trong dự án)
- **TypeScript**: ngôn ngữ chính của dự án

---

## Clone và Cài đặt

### 1. Clone repository về máy

```bash
# Clone repository
git clone <repository-url>

# Di chuyển vào thư mục dự án
cd greengrass-backend
```

### 2. Cài đặt dependencies

```bash
# Cài đặn tất cả các gói phụ thuộc bằng yarn (đã bao gồm Prisma)
yarn install
```

### 3. Thiết lập Prisma

```bash
# 1. Tạo file .env từ mẫu (nếu chưa có)
cp .env.example .env

# 2. Cập nhật DATABASE_URL trong file .env:
# DATABASE_URL="postgresql://username:password@host:port/database?schema=public"
# Ví dụ Supabase: DATABASE_URL="postgresql://postgres.xxx:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?pgbouncer=true"

# 3. Generate Prisma Client từ schema
npx prisma generate

# 4. Chạy migration để tạo bảng trong database (lần đầu hoặc khi schema thay đổi)
npx prisma migrate dev --name init

# 5. (Tùy chọn) Mở Prisma Studio để xem/quản lý dữ liệu
npx prisma studio
```

**Lưu ý quan trọng:**

- Sau khi pull code mới có thay đổi `schema.prisma`, chạy lại: `npx prisma generate`
- Khi schema thay đổi cần migration mới: `npx prisma migrate dev --name [tên_migration]`

---

## Chạy ứng dụng

### Các chế độ chạy

```bash
# Chế độ phát triển (development)
yarn start

# Chế độ watch - tự động reload khi có thay đổi file
yarn start:dev

# Chế độ debug với watch
yarn start:debug

# Chế độ production (sau khi đã build)
yarn start:prod
```

### Build dự án

```bash
# Biên dịch TypeScript sang JavaScript
yarn build
```

Ứng dụng sẽ chạy tại: `http://localhost:3000` (hoặc port được cấu hình trong biến môi trường `PORT`)

---

## Chạy Tests

Dự án sử dụng **Jest** làm framework testing.

```bash
# Chạy tất cả unit tests
yarn test

# Chạy tests ở chế độ watch (tự động chạy lại khi có thay đổi)
yarn test:watch

# Chạy tests và tạo báo cáo độ phủ code (coverage)
yarn test:cov

# Chạy tests ở chế độ debug
yarn test:debug

# Chạy end-to-end (e2e) tests
yarn test:e2e
```

---

## Cấu trúc thư mục và tác dụng

```
greengrass-backend/
├── .git/                   # Repository Git
├── dist/                   # Output sau khi build (TypeScript -> JavaScript)
├── node_modules/           # Dependencies đã cài đặt
├── src/                    # Source code chính
│   ├── main.ts             # Entry point - khởi động ứng dụng NestJS
│   ├── app.module.ts       # Root module - khai báo tất cả các module con
│   ├── app.controller.ts   # Root controller - xử lý request chính
│   ├── app.service.ts      # Root service - logic nghiệp vụ chính
│   ├── app.controller.spec.ts  # Unit test cho app controller
│   └── modules/            # Các module chức năng
│       ├── auth/           # Xác thực người dùng (login, register, JWT)
│       ├── checkin/        # Chức năng check-in
│       ├── events/         # Quản lý sự kiện
│       ├── forum/          # Diễn đàn thảo luận
│       ├── gamification/   # Hệ thống điểm thưởng, badge
│       ├── leaderboard/    # Bảng xếp hạng
│       ├── map/            # Tích hợp bản đồ
│       ├── notifications/  # Hệ thống thông báo
│       ├── registrations/  # Đăng ký tham gia sự kiện
│       └── users/          # Quản lý người dùng
├── test/                   # End-to-end tests
│   ├── app.e2e-spec.ts     # E2E test cho toàn bộ ứng dụng
│   └── jest-e2e.json       # Cấu hình Jest cho e2e tests
├── .gitignore              # Danh sách file/folder bị Git ignore
├── .prettierrc             # Cấu hình Prettier (format code)
├── eslint.config.mjs       # Cấu hình ESLint (kiểm tra code quality)
├── nest-cli.json           # Cấu hình NestJS CLI
├── package.json            # Thông tin dự án và dependencies
├── tsconfig.json           # Cấu hình TypeScript chính
├── tsconfig.build.json     # Cấu hình TypeScript cho build
└── yarn.lock               # Lock file cho Yarn dependencies
```

### Chi tiết các file quan trọng

| File/Folder         | Tác dụng                                             |
| ------------------- | ---------------------------------------------------- |
| `src/main.ts`       | Entry point, khởi tạo NestJS app và lắng nghe port   |
| `src/app.module.ts` | Root module, import và tổ chức tất cả các module con |
| `src/modules/`      | Chứa các module chức năng riêng biệt theo domain     |
| `test/`             | Chứa end-to-end tests                                |
| `package.json`      | Định nghĩa scripts và danh sách dependencies         |
| `tsconfig.json`     | Cấu hình compiler TypeScript                         |
| `nest-cli.json`     | Cấu hình cho NestJS CLI (build, generate, ...)       |
| `.prettierrc`       | Quy tắc format code (singleQuote, trailingComma)     |
| `eslint.config.mjs` | Quy tắc kiểm tra code quality và style               |

---

## Các scripts hữu ích

| Script            | Mô tả                              |
| ----------------- | ---------------------------------- |
| `yarn build`      | Build dự án sang thư mục `dist/`   |
| `yarn format`     | Format code với Prettier           |
| `yarn lint`       | Kiểm tra và sửa lỗi ESLint         |
| `yarn start`      | Chạy ứng dụng ở chế độ development |
| `yarn start:dev`  | Chạy với watch mode (tự reload)    |
| `yarn start:prod` | Chạy ứng dụng production           |
| `yarn test`       | Chạy unit tests                    |
| `yarn test:watch` | Chạy tests ở chế độ watch          |
| `yarn test:cov`   | Chạy tests với coverage report     |
| `yarn test:e2e`   | Chạy end-to-end tests              |

---

## Coding Standards

Dự án tuân thủ các quy tắc:

- **TypeScript**: Sử dụng strict null checks
- **ESLint**: Kiểm tra code quality, tích hợp với TypeScript
- **Prettier**: Format code tự động với single quote và trailing comma
- **Testing**: Unit test cho controller và service, E2E test cho API endpoints

---

## Triển khai (Deployment)

```bash
# 1. Build dự án
yarn build

# 2. Chạy ở chế độ production
yarn start:prod
```

Hoặc triển khai lên AWS với Mau:

```bash
yarn install -g @nestjs/mau
mau deploy
```

---

## Tài liệu tham khảo

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)

---

## License

Dự án này sử dụng license UNLICENSED.
