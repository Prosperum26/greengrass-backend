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
- **PostgreSQL**: database (Prisma 6+ compatible)
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
│   ├── modules/common      # Dùng chung cho toàn hệ thống
│   ├── modules/config      # cấu hình hệ thống
│   ├── modules/prisma      # liên kết với database
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

## API Endpoints

### Authentication Module - **FULLY OPERATIONAL** 🚀

**Complete Auth Flow** (JWT + Refresh + DB persist):

1. **Register/Login**: DTO validate → bcrypt.compare/hash → Prisma `User.create/find` (email unique, STUDENT role) → `jwtService.sign(payload)`:
   - Access: `{sub, email, role}` expires **15m** (`JWT_SECRET`)
   - Refresh: **7d** (`JWT_REFRESH_SECRET`) → `prisma.user.update({refreshToken})`
2. **Protected Request**: `Authorization: Bearer <access>` → `JwtAuthGuard` checks `@Public()` decorator (Reflector) → passport('jwt') → `JwtStrategy.validate()` → `req.user = payload`
3. **Logout**: `JwtAuthGuard` pass → `prisma.user.update({refreshToken: null})`
4. **Refresh**: Verify DB refreshToken → regenerate pair

**DTO Validation** (class-validator):

- `register.dto.ts`: `@IsEmail() email`, `@MinLength(6) password`, `fullName`
- `login.dto.ts`: `@IsEmail() email`, `password`

**Endpoints Table**:

| Method | Endpoint                  | DTO/Body                                                 | Guard          | Exceptions                     | Response                                                  |
| ------ | ------------------------- | -------------------------------------------------------- | -------------- | ------------------------------ | --------------------------------------------------------- |
| `POST` | `/auth/register`          | `RegisterDto`                                            | `@Public()`    | BadRequest (email exists)      | `{accessToken, refreshToken}`                             |
| `POST` | `/auth/login`             | `LoginDto`                                               | `@Public()`    | Unauthorized (invalid creds)   | `{accessToken, refreshToken}`                             |
| `POST` | `/auth/refresh`           | `{userId, refreshToken}`                                 | `@Public()`    | Unauthorized (invalid refresh) | `{accessToken, refreshToken}`                             |
| `POST` | `/auth/logout`            | -                                                        | `JwtAuthGuard` | -                              | `{"message": "Logged out successfully"}`                  |
| `POST` | `/auth/organizer/request` | `{email,fullName,password,organizationName,description}` | `@Public()`    | Error (email exists)           | `{"requestId": "...", "message": "Request submitted..."}` |

**cURL Test Examples** (`yarn start:dev`, setup DB first):

```bash
# 1. Register
curl -X POST localhost:3000/auth/register -H "Content-Type: application/json" -d '{"email":"student@test.com","fullName":"Student Test","password":"password123"}'

# 2. Login
curl -X POST localhost:3000/auth/login -H "Content-Type: application/json" -d '{"email":"student@test.com","password":"password123"}'

# 3. Protected logout (use accessToken from step 2)
curl -X POST localhost:3000/auth/logout -H "Authorization: Bearer YOUR_ACCESS_TOKEN"

# Refresh example (use refreshToken from step 1/2)
curl -X POST localhost:3000/auth/refresh -H "Content-Type: application/json" -d '{"userId":"uuid-from-token","refreshToken":"your_refresh_token"}'
```

**Core Implementation**:

- **auth.service.ts**: All business logic (Prisma User/OrganizerRequest CRUD, bcrypt, jwtService)
- **jwt.guard.ts**: `extends AuthGuard('jwt')` + `@Public()` Reflector bypass
- **jwt.strategy.ts**: `PassportStrategy(Strategy)` extracts Bearer, `secretOrKey: process.env.JWT_SECRET`, `validate(payload)`
- **common/decorators/public.decorater.ts**: `@SetMetadata(IS_PUBLIC_KEY, true)`
- **Guards**: `JwtAuthGuard` global/app level protection

**Env Required**:

```
JWT_SECRET=your-32char-secret
JWT_REFRESH_SECRET=your-refresh-secret
DATABASE_URL=postgresql://...
```

**Status**: Auth **100% working** after `yarn prisma migrate dev`. Test ngay!

### Health Check

`GET /` → `"Hello World!"` (app.controller.ts)

### Health Check

`GET /` → "Hello World!" (app.controller.ts)

**Implementation Status:**

- ✅ **Auth** — Fully operational (JWT + Refresh Token)
- ✅ **Users** — Fully implemented
- ✅ **Events** — Fully implemented (CRUD + Registration)
- ✅ **Checkin** — Fully implemented (QR + Integration with Gamification)
- ✅ **Gamification** — Fully implemented (Points + Badges + Leaderboard)
- ⚠️ **Registrations/Leaderboard/Map/Forum/Notifications** — Not implemented (stubs only)

---

### Users — **FULLY IMPLEMENTED** ✅

Module Users cung cấp API quản lý thông tin người dùng.

**Base Path:** `/users`

**Authentication:** Tất cả endpoints (trừ `/users/:id/profile`) yêu cầu JWT token trong header `Authorization: Bearer {token}`

| Method  | Endpoint             | Auth   | Description                      | Request                         | Response                               |
| ------- | -------------------- | ------ | -------------------------------- | ------------------------------- | -------------------------------------- |
| `GET`   | `/users/me`          | JWT    | Lấy thông tin tài khoản hiện tại | -                               | User object                            |
| `PATCH` | `/users/me`          | JWT    | Cập nhật thông tin tài khoản     | `{fullName?, avatarUrl?, bio?}` | Updated user                           |
| `GET`   | `/users/:id/profile` | Public | Xem profile public người dùng    | -                               | Public user profile                    |
| `GET`   | `/users/me/events`   | JWT    | Lịch sử sự kiện đã tham gia      | -                               | List of registrations                  |
| `GET`   | `/users/me/points`   | JWT    | Tổng quan điểm số và badges      | -                               | `{totalPoints, currentStreak, badges}` |

**Update User DTO:**

```json
{
  "fullName": "string (optional, max 100 chars)",
  "avatarUrl": "string (optional, max 500 chars)",
  "bio": "string (optional, max 1000 chars)"
}
```

---

### Events

Module Events quản lý toàn bộ vòng đời của sự kiện: tạo, tìm kiếm, đăng ký tham gia và quản lý người tham dự. Module được tổ chức gồm 6 file chính:

| File                            | Vai trò                                                                                     |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `events.module.ts`              | Khai báo module, import `PrismaModule`                                                      |
| `events.controller.ts`          | Định nghĩa routes, xử lý request/response, áp dụng `RolesGuard`                             |
| `events.service.ts`             | Chứa toàn bộ business logic và tương tác với database qua Prisma                            |
| `dto/create-event.dto.ts`       | Định nghĩa `CreateEventDto`,`GetEventsQueryDto`, `GetAllEventsQueryDto`, enum `EventStatus` |
| `decorators/roles.decorator.ts` | Decorator `@Roles()` gắn metadata phân quyền lên route                                      |
| `guards/roles.guard.ts`         | Guard kiểm tra `user.role` so với metadata từ `@Roles()`                                    |

#### Luồng hoạt động

Request → RolesGuard (kiểm tra role) → Controller (parse params/body) → Service (business logic) → Prisma → Database

**Phân quyền theo role:**

| Role                    | Quyền hạn                                                                                |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `ORGANIZER`             | Tạo (`POST /events`), cập nhật (`PATCH /events/:id`), xóa sự kiện (`DELETE /events/:id`) |
| `STUDENT`               | Đăng ký (`POST /events/:id/register`), hủy đăng ký (`DELETE /events/:id/register`)       |
| Tất cả (không cần auth) | Xem danh sách, xem chi tiết, xem người tham dự                                           |

**Tính năng đáng chú ý:**

- **Dynamic status**: Trạng thái sự kiện (`UPCOMING` / `ONGOING` / `COMPLETED`) được tính toán động dựa trên `startTime` / `endTime` tại thời điểm query, không lưu cứng trong DB.
- **`qrSecret` ẩn hoàn toàn**: Trường này không bao giờ xuất hiện trong response nhờ `EVENT_SELECT` constant dùng chung cho mọi query.
- **Transaction Serializable**: Đăng ký sự kiện dùng `$transaction` với isolation level `Serializable` để tránh race condition khi nhiều user đăng ký cùng lúc.

#### API Endpoints — Events

**Sự kiện (CRUD)**

| Method   | Endpoint       | Role              | Mô tả                                                 |
| -------- | -------------- | ----------------- | ----------------------------------------------------- |
| `GET`    | `/events`      | Tất cả            | Danh sách sự kiện có filter, phân trang               |
| `GET`    | `/events/full` | ADMIN             | Toàn bộ sự kiện có phân trang (dùng `page` & `limit`) |
| `POST`   | `/events`      | ORGANIZER         | Tạo sự kiện mới                                       |
| `GET`    | `/events/:id`  | Tất cả            | Chi tiết một sự kiện                                  |
| `PATCH`  | `/events/:id`  | ORGANIZER (owner) | Cập nhật sự kiện                                      |
| `DELETE` | `/events/:id`  | ORGANIZER (owner) | Xóa sự kiện                                           |

**Query params cho `GET /events`:**

| Param      | Kiểu                                 | Mô tả                                                               |
| ---------- | ------------------------------------ | ------------------------------------------------------------------- |
| `status`   | `UPCOMING \| ONGOING \| COMPLETED`   | Lọc theo trạng thái                                                 |
| `keyword`  | `string`                             | Tìm kiếm theo `title`, `description`, `location` (case-insensitive) |
| `dateFrom` | `ISO date string`                    | Lọc sự kiện bắt đầu từ ngày này                                     |
| `dateTo`   | `ISO date string`                    | Lọc sự kiện bắt đầu đến ngày này                                    |
| `page`     | `number` (default: `1`)              | Trang hiện tại                                                      |
| `limit`    | `number` (default: `10`, max: `100`) | Số bản ghi mỗi trang                                                |

**Body cho `POST /events` và `PATCH /events/:id`:**

```json
{
  "title": "string (required)",
  "description": "string (required)",
  "location": "string (required)",
  "latitude": "number [-90, 90] (required)",
  "longitude": "number [-180, 180] (required)",
  "startTime": "ISO date string (required)",
  "endTime": "ISO date string (required)",
  "points": "number >= 0 (required)",
  "qrSecret": "string (required)"
}
```

> `PATCH` chấp nhận bất kỳ trường nào ở trên ở dạng partial (không bắt buộc tất cả). Chỉ organizer tạo ra sự kiện mới được phép cập nhật / xóa.

**Đăng ký tham gia**

| Method   | Endpoint                   | Role    | Mô tả                    |
| -------- | -------------------------- | ------- | ------------------------ |
| `POST`   | `/events/:id/register`     | STUDENT | Đăng ký tham gia sự kiện |
| `DELETE` | `/events/:id/register`     | STUDENT | Hủy đăng ký              |
| `GET`    | `/events/:id/participants` | Tất cả  | Danh sách người tham dự  |

**Ràng buộc nghiệp vụ:**

- Không thể đăng ký hoặc hủy đăng ký sự kiện có status COMPLETED
- Không thể đăng ký trùng (trả về 409 Conflict)
- Chỉ organizer sở hữu sự kiện mới được cập nhật / xóa (trả về 400 nếu vi phạm)

**Ví dụ response `GET /events`:**

```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "clxyz...",
        "title": "Trồng cây xanh tại Thủ Đức",
        "status": "UPCOMING",
        "startTime": "2025-06-01T08:00:00.000Z",
        "endTime": "2025-06-01T12:00:00.000Z",
        "points": 50,
        "_count": { "eventRegistrations": 24 }
      }
    ],
    "pagination": { "total": 120, "page": 1, "limit": 10 }
  }
}
```

---

### Registration

- `POST /events/{id}/register` – Đăng ký sự kiện
- `DELETE /events/{id}/register` – Hủy đăng ký
- `GET /events/{id}/participants` – Danh sách người tham gia

---

### Check-in & Proof

- `GET /events/{id}/qr` – Lấy QR check-in (Organizer)
- `POST /events/{id}/check-in` – Check-in bằng QR + GPS
- `POST /events/{id}/proof` – Gửi minh chứng hoạt động
- `GET /events/{id}/proofs` – Danh sách proof chờ duyệt (Organizer)
- `PUT /events/{id}/proofs/{userId}` – Duyệt / từ chối proof

#### Endpoints đã hoàn thành

| Method | Endpoint                      | Mô tả                                    | Role        |
| ------ | ----------------------------- | ---------------------------------------- | ----------- |
| `GET`  | `/events/{id}/qr`             | Lấy QR token động (rotate 30s)           | Organizer   |
| `POST` | `/events/{id}/check-in`       | Check-in bằng QR + anti-cheat validation | Participant |
| `GET`  | `/events/{id}/checked-in`     | Danh sách người đã check-in              | Organizer   |
| `GET`  | `/events/{id}/check-in-stats` | Thống kê check-in rate                   | Organizer   |

#### Cách hoạt động

**1. QR Generation (Organizer)**

- Token được tạo bằng SHA256: `hash(eventId + SECRET + timeWindow)`
- `timeWindow` = Math.floor(timestamp / 30000) → token tự động thay đổi mỗi 30 giây
- Chấp nhận tolerance: current window + previous window (tổng 60s)

**2. Check-in Flow (Participant)**

1. Verify event tồn tại & chưa COMPLETED
2. Check user đã đăng ký sự kiện (EventRegistration)
3. Check chưa check-in trước đó (status = REGISTERED)
4. Verify QR token hợp lệ
5. Update status → CHECKED_IN, lưu checkInTime
6. Trigger stub award points
7. Log kết quả `[CHECKIN] userId=... status=SUCCESS/FAIL reason=...`

**3. Organizer Dashboard**

- `/checked-in`: Trả về danh sách userId + checkInTime + status (CHECKED_IN/COMPLETED)
- `/check-in-stats`: Trả về totalRegistered, checkedIn, completed, checkInRate (%)

#### Environment Variables

```env
QR_SECRET=your-secret-key-here  # Bắt buộc cho production
```

#### Chưa làm (MVP Limitations)

- [ ] `POST /events/{id}/proof` – Gửi minh chứng hoạt động (proof upload)
- [ ] `GET /events/{id}/proofs` – Danh sách proof chờ duyệt
- [ ] `PUT /events/{id}/proofs/{userId}` – Duyệt / từ chối proof
- [ ] GPS validation trong check-in (chỉ check QR hiện tại)
- [ ] Real-time QR update qua WebSocket (đang dùng polling)
- [ ] Integration với GamificationModule để award points thật
- [ ] Lấy userId từ JWT token (đang dùng placeholder)

---

### Gamification (Hệ thống điểm thưởng)

#### API Endpoints

**User Stats & Points:**

- `GET /points/me` – Thông tin điểm số và thống kê của user hiện tại
- `GET /points/history` – Lịch sử giao dịch điểm (có phân trang)
- `GET /points/rank` – Xếp hạng hiện tại của user
- `GET /points/users/{userId}` – Xem stats public của user khác

**Leaderboard:**

- `GET /points/leaderboard?limit=50&offset=0&timeframe=all` – Bảng xếp hạng
  - `timeframe`: `all` | `weekly` | `monthly`

**Badges:**

- `GET /points/badges` – Danh sách tất cả huy hiệu có thể đạt được
- `GET /points/badges/me` – Huy hiệu đã đạt được của user

**Admin/System:**

- `POST /points/add` – Thêm điểm thủ công (admin)
- `POST /points/check-badges` – Kiểm tra và trao huy hiệu
- `POST /points/update-streak` – Cập nhật streak (tự động gọi khi có hoạt động)

#### Cách module hoạt động

**1. Point System (Hệ thống điểm):**

- User nhận điểm khi: tham gia sự kiện (+10), check-in (+20), hoàn thành sự kiện (+50)
- Mỗi giao dịch được ghi lại trong `PointHistory` để đảm bảo minh bạch
- Tính năng **idempotency**: Ngăn chặn cấp điểm trùng lặp cho cùng một event/reason

**2. Badge System (Hệ thống huy hiệu):**

- Tự động trao huy hiệu khi user đạt ngưỡng điểm:
  - `Green Beginner` – 100 points
  - `Eco Enthusiast` – 250 points
  - `Eco Warrior` – 500 points
  - `Green Champion` – 1000 points
  - `Earth Guardian` – 2500 points
  - `Planet Savior` – 5000 points

**3. Streak System (Chuỗi hoạt động):**

- Tăng streak khi user có hoạt động liên tiếp các ngày
- Reset về 1 nếu không hoạt động > 1 ngày
- Thưởng +15 điểm mỗi khi đạt streak chia hết cho 7 (7, 14, 21...)

**4. Leaderboard (Bảng xếp hạng):**

- Sắp xếp theo `totalPoints` giảm dần
- Hỗ trợ filter: `all-time`, `weekly`, `monthly` (dựa trên `lastActivityAt`)
- Phân trang với `limit` và `offset`

**5. Tích hợp với module khác:**

```typescript
// Ví dụ: Check-in module gọi gamification
await this.gamificationService.addPoints({
  userId,
  reason: PointReason.CHECK_IN,
  eventId: event.id,
});
await this.gamificationService.updateStreak(userId);
```

---

### Organizations

- `GET /organizations` – Danh sách CLB / tổ chức
- `GET /organizations/{id}/dashboard` – Dashboard thống kê

---

### Export Data

- `GET /events/{id}/export` – Xuất CSV/Excel danh sách hoàn thành
- `POST /events/{id}/export/email` – Gửi file qua email

---

### Map & Eco System

- `GET /map/eco-points` – Điểm sinh thái gần bạn
- `GET /map/routes` – Gợi ý lộ trình di chuyển xanh

---

### AI Assistant

- `POST /assistant/chat` – Chatbot hỗ trợ thông minh
- `GET /assistant/recommendations` – Gợi ý sự kiện cá nhân hóa

---

### Notifications

- `GET /notifications` – Lấy danh sách thông báo

---

### WebSocket Events

- `notification:new` – Thông báo realtime (badge, points)
- `event:stats_update` – Cập nhật dashboard organizer
- `event:dynamic_qr` – QR code tự động refresh mỗi 60s

---

### Security

```http
Authorization: Bearer <access_token>
```

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

## Frontend Integration Guide

### Authentication Flow

```
1. POST /auth/register hoặc /auth/login
2. Lưu accessToken (15 phút) và refreshToken (7 ngày) vào localStorage/sessionStorage
3. Gửi accessToken trong header: Authorization: Bearer {token}
4. Khi 401 Unauthorized → POST /auth/refresh để lấy token mới
5. POST /auth/logout khi đăng xuất
```

### Role-based Access

| Role        | Permissions                                           |
| ----------- | ----------------------------------------------------- |
| `STUDENT`   | Register events, check-in, view points/badges         |
| `ORGANIZER` | Create/update/delete events, view QR, view stats      |
| `ADMIN`     | View all events (`/events/full`), add points manually |

### Public vs Protected Endpoints

```javascript
// Public - không cần token
GET /                     // Health check
GET /events               // List events
GET /events/:id          // Event detail
GET /events/:id/participants  // View participants
GET /users/:id/profile   // Public user profile
GET /points/leaderboard  // Leaderboard
GET /points/badges       // All badges
GET /points/users/:userId // Public user stats

// Protected - cần JWT token
Tất cả endpoints còn lại
```

### Example API Calls (JavaScript/TypeScript)

```typescript
// 1. Register
const register = async (email: string, fullName: string, password: string) => {
  const res = await fetch('/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, fullName, password }),
  });
  return res.json(); // { accessToken, refreshToken }
};

// 2. Login
const login = async (email: string, password: string) => {
  const res = await fetch('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
};

// 3. Authenticated request
const getMyProfile = async () => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch('/users/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 401) {
    // Token expired → refresh
    await refreshToken();
    return getMyProfile(); // Retry
  }
  return res.json();
};

// 4. Refresh token
const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  // Need userId from JWT payload (decode client-side or store after login)
  const userId = getUserIdFromToken();
  const res = await fetch('/auth/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, refreshToken }),
  });
  const data = await res.json();
  localStorage.setItem('accessToken', data.accessToken);
  localStorage.setItem('refreshToken', data.refreshToken);
  return data;
};

// 5. Register for event (STUDENT only)
const registerForEvent = async (eventId: string) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/events/${eventId}/register`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json();
};

// 6. Check-in (STUDENT only)
const checkIn = async (eventId: string, qrToken: string) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/events/${eventId}/check-in`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ qrToken }),
  });
  return res.json();
};

// 7. Get QR token (ORGANIZER only)
const getQrToken = async (eventId: string) => {
  const token = localStorage.getItem('accessToken');
  const res = await fetch(`/events/${eventId}/qr`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return res.json(); // { eventId, qrToken, generatedAt, expiresAt }
};
```

### JWT Token Structure

```typescript
// Decode JWT to get payload
interface JWTPayload {
  sub: string; // userId
  email: string;
  role: 'STUDENT' | 'ORGANIZER' | 'ADMIN';
  iat: number; // issued at
  exp: number; // expiration
}

const decodeJWT = (token: string): JWTPayload => {
  const base64 = token.split('.')[1];
  return JSON.parse(atob(base64));
};
```

### Error Handling

| Status | Meaning      | Action                                              |
| ------ | ------------ | --------------------------------------------------- |
| 400    | Bad Request  | Validation error → show field errors                |
| 401    | Unauthorized | Token expired → refresh token                       |
| 403    | Forbidden    | Wrong role → show access denied                     |
| 404    | Not Found    | Resource not found → show error message             |
| 409    | Conflict     | Duplicate (e.g., already registered) → show message |
| 500    | Server Error | Retry or contact admin                              |

---

## Tài liệu tham khảo

- [NestJS Documentation](https://docs.nestjs.com)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)
- [Prisma Documentation](https://www.prisma.io/docs)

---
