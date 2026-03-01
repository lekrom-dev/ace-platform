# ACE Platform Setup Guide

## Prerequisites

- Node.js 20+
- pnpm 8+
- PostgreSQL 14+

## Initial Setup

### 1. Clone and Install

```bash
git clone https://github.com/lekrom-dev/ace-platform.git
cd ace-platform
pnpm install
```

### 2. Database Setup

Create a PostgreSQL database:

```bash
createdb ace_platform
```

### 3. Environment Variables

Copy the example environment file:

```bash
cp .env.example .env
```

Edit `.env` and update the following:

- `DATABASE_URL`: Your PostgreSQL connection string
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`

### 4. Run Database Migrations

```bash
cd packages/db
pnpm db:generate
pnpm db:migrate
```

### 5. Start Development Server

```bash
cd ../..
pnpm dev
```

The app will be available at http://localhost:3000

## Project Structure

```
ace-platform/
├── apps/
│   └── web/              # Next.js 14 application
│       ├── src/
│       │   ├── app/      # App Router pages
│       │   ├── lib/      # Utilities and configurations
│       │   └── config/   # App configuration
│       └── .env.example  # Environment template
├── packages/
│   ├── db/              # Database (Drizzle ORM + PostgreSQL)
│   ├── engine-sdk/      # Shared services and utilities
│   └── ui/              # Shared React components
├── pnpm-workspace.yaml
└── package.json
```

## Development

### Run Development Server

```bash
pnpm dev
```

### Build for Production

```bash
pnpm build
```

### Run Linting

```bash
pnpm lint
```

### Database Management

```bash
# Generate migrations
pnpm --filter @ace/db db:generate

# Run migrations
pnpm --filter @ace/db db:migrate

# Open Drizzle Studio
pnpm --filter @ace/db db:studio
```

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript (strict mode)
- ✅ Tailwind CSS
- ✅ NextAuth.js authentication
- ✅ Drizzle ORM + PostgreSQL
- ✅ pnpm monorepo workspace
- ✅ Shared packages (@ace/db, @ace/engine-sdk, @ace/ui)

## Routes

- `/` - Landing page
- `/login` - Authentication
- `/signup` - Registration
- `/dashboard` - Protected dashboard
- `/contract-analysis` - Contract analysis module
- `/tradie-receptionist` - Tradie receptionist module
- `/api/health` - Health check endpoint
- `/api/auth/*` - NextAuth endpoints

## Troubleshooting

### Port already in use

If port 3000 is already in use, you can specify a different port:

```bash
PORT=3001 pnpm dev
```

### Database connection errors

Ensure PostgreSQL is running and the `DATABASE_URL` in `.env` is correct.

### Missing dependencies

Run `pnpm install` from the root directory to install all dependencies.
