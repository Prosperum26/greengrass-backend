# Greengrass Backend

A production-ready NestJS backend for the Greengrass platform, focused on environmental events, check-in workflows, notifications, and gamification.

## Project Overview

Greengrass Backend provides APIs for:

- User authentication and authorization (JWT + refresh token flow)
- Event lifecycle management (create, browse, register, manage participants)
- QR-based event check-in
- Points, badges, streaks, and leaderboard
- Notification delivery and reminder jobs
- Map markers and nearby event discovery
- Admin organizer-request management

This project is designed to support both local development and cloud deployment (Render).

## Tech Stack

- Runtime: Node.js 20+
- Framework: NestJS 11
- Language: TypeScript
- Database: PostgreSQL
- ORM: Prisma
- Auth: Passport JWT + bcrypt
- Validation: class-validator + class-transformer
- Testing: Jest (unit + e2e)
- CI/CD: GitHub Actions + Render Deploy Hook

## Architecture

### Layering

- `Controller` layer: HTTP routing and request/response handling
- `Service` layer: business logic and orchestration
- `Data access`: Prisma client via `PrismaService`
- `Cross-cutting`: guards, decorators, filters, interceptors in `src/common`

### Main Modules

- `auth`: login/register/refresh/logout
- `users`: profile and user stats
- `events`: event CRUD, registration, participant view
- `checkin`: QR generation and event check-in
- `gamification`: points, badges, leaderboard
- `notifications`: in-app notifications + scheduled reminders
- `map`: map markers and nearby search
- `admin`: organizer request review flow
- `upload`: cloud image upload
- `chatbot`: AI assistant integration

### Data Flow (Typical Request)

1. Client sends request with/without JWT.
2. Guards validate authentication/role (`JwtAuthGuard`, `RolesGuard`).
3. DTO validation runs via global `ValidationPipe`.
4. Controller delegates to Service.
5. Service executes business logic and Prisma operations.
6. Global filter/interceptor standardizes errors and logs.

## Getting Started (Local)

### Prerequisites

- Node.js 20+
- Yarn 1.22+
- PostgreSQL running locally or remotely

### 1) Install dependencies

```bash
yarn install
```

### 2) Configure environment

```bash
cp .env.example .env
```

Update required values in `.env` (at least `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `QR_SECRET`, `ALLOWED_ORIGINS`).

### 3) Run database migrations

```bash
yarn db:migrate:deploy
```

### 4) Start development server

```bash
yarn start:dev
```

Backend runs on `http://localhost:3000` by default.

## Production Setup

### Build and run

```bash
yarn build
yarn start:prod
```

### Render deployment

This repository includes `render.yaml` with:

- Build command: `yarn install --frozen-lockfile && yarn build`
- Start command: `yarn db:migrate:deploy && yarn start:prod`

Create a Render web service and connect the repository. Ensure all required environment variables are configured in Render.

## Environment Variables Guide

See `.env.example` for full list. Core required variables:

- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: access token signing secret (min 32 chars recommended)
- `JWT_REFRESH_SECRET`: refresh token signing secret (min 32 chars recommended)
- `QR_SECRET`: check-in QR secret (min 16 chars recommended)
- `ALLOWED_ORIGINS`: comma-separated allowed CORS origins
- `NODE_ENV`: `development` or `production`
- `PORT`: server port

Optional integrations:

- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `GEMINI_API_KEY`

## API Documentation (Basic)

### Swagger

Swagger UI is enabled in development:

- `GET /api`

### Key endpoint groups

- Auth: `/auth/*`
- Users: `/users/*`
- Events: `/events/*`
- Check-in: `/events/:eventId/qr`, `/events/:eventId/check-in`
- Gamification: `/points/*`
- Notifications: `/notifications/*`
- Admin: `/admin/*`
- Map: `/map/*`

### Auth header format

```http
Authorization: Bearer <access_token>
```

## Testing

Run all test suites:

```bash
yarn test
yarn test:e2e
```

Additional test commands:

```bash
yarn test:watch
yarn test:cov
```

## CI/CD

### CI workflow

File: `.github/workflows/ci.yml`

On PR and push to `main`, CI runs:

1. Install dependencies
2. Provision PostgreSQL service
3. Run Prisma migrations
4. Lint check (non-blocking currently)
5. Unit tests
6. E2E tests
7. Build

### CD workflow (Render)

File: `.github/workflows/deploy-render.yml`

- Trigger: when CI workflow succeeds on `main`
- Action: calls Render Deploy Hook via `RENDER_DEPLOY_HOOK_URL` GitHub secret

Required GitHub secret:

- `RENDER_DEPLOY_HOOK_URL`

## Useful Scripts

- `yarn start:dev`: run in watch mode
- `yarn build`: compile TypeScript
- `yarn start:prod`: run compiled server
- `yarn db:migrate:deploy`: apply production-safe Prisma migrations
- `yarn test`: unit tests
- `yarn test:e2e`: e2e tests

## Contributing

See `CONTRIBUTING.md` for development workflow, coding standards, and PR checklist.
