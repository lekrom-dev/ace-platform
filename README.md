# ACE Platform

A pnpm monorepo workspace for the ACE Platform application.

## Structure

```
/apps/web          — Next.js 14 app (main application)
/packages/engine-sdk   — shared engine services library (TypeScript)
/packages/ui           — shared UI components (React + Tailwind)
/packages/db           — database schema, types, and migrations
```

## Prerequisites

- Node.js 20+
- pnpm 8+

## Getting Started

Install dependencies:

```bash
pnpm install
```

Run the development server:

```bash
pnpm dev
```

Build all packages:

```bash
pnpm build
```

## Package Aliases

The monorepo is configured with the following import aliases:

- `@ace/engine-sdk` - Engine services library
- `@ace/ui` - UI components
- `@ace/db` - Database layer

## Scripts

- `pnpm dev` - Start the development server
- `pnpm build` - Build all packages
- `pnpm lint` - Lint all packages
- `pnpm test` - Run tests for all packages
