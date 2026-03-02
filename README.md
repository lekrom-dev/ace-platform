# ACE Platform

A modern, full-stack SaaS platform built with Next.js 14, Supabase, and TypeScript. ACE Platform provides a complete foundation for building and deploying AI-powered business modules with authentication, billing, analytics, and CRM capabilities.

## Architecture

ACE Platform is built as a **pnpm monorepo** with the following structure:

### Workspaces

- **`/apps/web`** - Next.js 14 application (App Router) with Tailwind CSS
- **`/packages/db`** - Supabase database schema, types, and migrations
- **`/packages/engine-sdk`** - Shared services library (auth, billing, CRM, analytics)
- **`/packages/ui`** - Shared React component library

### Tech Stack

- **Framework**: Next.js 14 (App Router, TypeScript, React 18)
- **Database**: Supabase (PostgreSQL + Auth + Realtime)
- **Styling**: Tailwind CSS
- **Package Manager**: pnpm (workspaces)
- **Payments**: Stripe
- **Email**: Resend
- **Analytics**: PostHog
- **Error Tracking**: Sentry
- **AI**: Anthropic Claude
- **Testing**: Vitest + React Testing Library
- **CI/CD**: GitHub Actions + Vercel

## Quick Start

### Prerequisites

- Node.js ≥ 20.0.0
- pnpm ≥ 8.0.0
- Supabase account
- Stripe account (for billing)

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/your-org/ace-platform.git
   cd ace-platform
   ```

2. **Install dependencies**

   ```bash
   pnpm install
   ```

3. **Set up environment variables**

   Copy the example env file and fill in your values:

   ```bash
   cp apps/web/.env.example apps/web/.env.local
   ```

   See [Environment Variables](#environment-variables) section below for required values.

4. **Run database migrations**

   Go to your Supabase Dashboard → SQL Editor and run the migrations in order:
   - `/packages/db/supabase/migrations/001_core_schema.sql`
   - `/packages/db/supabase/migrations/002_rls_policies.sql`
   - `/packages/db/supabase/migrations/003_auth_trigger.sql`

5. **Seed the database (optional)**

   ```bash
   cd packages/db
   NEXT_PUBLIC_SUPABASE_URL="your-url" \
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-key" \
   SUPABASE_SERVICE_ROLE_KEY="your-key" \
   pnpm db:seed
   ```

6. **Start the development server**

   ```bash
   pnpm dev
   ```

   The app will be available at http://localhost:3000

## Development Workflow

### Creating Features

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Write code following the existing patterns
   - Run linting: `pnpm lint`
   - Run type checking: `pnpm type-check`
   - Run tests: `pnpm test`

3. **Format your code**

   ```bash
   pnpm format
   ```

4. **Commit your changes**

   ```bash
   git add .
   git commit -m "feat: your feature description"
   ```

5. **Push and create a Pull Request**

   ```bash
   git push origin feature/your-feature-name
   ```

   Then open a PR on GitHub. CI will automatically run linting, type-checking, and tests.

### Code Style

- **No semicolons** (enforced by Prettier)
- **Single quotes** for strings
- **Trailing commas** in multi-line objects/arrays
- **Strict TypeScript** mode enabled
- **ESLint** configuration based on Next.js recommended

## Project Structure

```
ace-platform/
├── apps/
│   └── web/                      # Next.js application
│       ├── src/
│       │   ├── app/              # App Router pages and layouts
│       │   │   ├── (auth)/       # Auth pages (login, signup, etc.)
│       │   │   ├── (modules)/    # Module-specific pages
│       │   │   ├── api/          # API routes
│       │   │   └── dashboard/    # Protected dashboard
│       │   ├── components/       # React components
│       │   ├── hooks/            # Custom React hooks
│       │   └── lib/              # Utility libraries
│       │       ├── supabase/     # Supabase client utilities
│       │       └── posthog/      # PostHog analytics
│       ├── .env.local            # Environment variables
│       ├── next.config.js        # Next.js configuration
│       └── tailwind.config.ts    # Tailwind CSS configuration
│
├── packages/
│   ├── db/                       # Database package
│   │   ├── src/
│   │   │   ├── types.ts          # TypeScript types from schema
│   │   │   ├── client.ts         # Supabase client factories
│   │   │   └── seed.ts           # Database seed script
│   │   └── supabase/
│   │       └── migrations/       # SQL migration files
│   │
│   ├── engine-sdk/               # Shared services library
│   │   ├── src/
│   │   │   ├── auth.ts           # Authentication service
│   │   │   ├── billing.ts        # Stripe billing (future)
│   │   │   ├── crm.ts            # CRM service (future)
│   │   │   └── analytics.ts      # Analytics service (future)
│   │   └── README.md
│   │
│   └── ui/                       # Shared UI components
│       └── src/components/       # Reusable React components
│
├── .github/
│   └── workflows/
│       └── ci.yml                # GitHub Actions CI workflow
│
├── package.json                  # Root package.json
├── pnpm-workspace.yaml           # pnpm workspace configuration
└── tsconfig.json                 # Root TypeScript configuration
```

## Environment Variables

### Required

| Variable                             | Description                              | Where to get it                             |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase project URL                     | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`      | Supabase anonymous/public key            | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY`          | Supabase service role key (bypasses RLS) | Supabase Dashboard → Project Settings → API |
| `STRIPE_SECRET_KEY`                  | Stripe secret key                        | Stripe Dashboard → Developers → API keys    |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe publishable key                   | Stripe Dashboard → Developers → API keys    |

### Optional (for full functionality)

| Variable                   | Description                   | Where to get it                          |
| -------------------------- | ----------------------------- | ---------------------------------------- |
| `STRIPE_WEBHOOK_SECRET`    | Stripe webhook signing secret | Stripe Dashboard → Developers → Webhooks |
| `RESEND_API_KEY`           | Resend API key for emails     | resend.com → API Keys                    |
| `ANTHROPIC_API_KEY`        | Anthropic API key for Claude  | console.anthropic.com → API Keys         |
| `SENTRY_DSN`               | Sentry error tracking DSN     | sentry.io → Project Settings             |
| `NEXT_PUBLIC_POSTHOG_KEY`  | PostHog analytics API key     | posthog.com → Project Settings           |
| `NEXT_PUBLIC_POSTHOG_HOST` | PostHog host URL              | Usually `https://us.i.posthog.com`       |
| `NEXT_PUBLIC_APP_URL`      | Your application URL          | `http://localhost:3000` for dev          |

## Database Schema

The platform includes a comprehensive database schema with:

- **`prospects`** - Lead/prospect management
- **`customers`** - Customer records (linked to Supabase Auth)
- **`modules`** - AI-powered business modules
- **`subscriptions`** - Customer subscriptions to modules
- **`interactions`** - Customer/prospect interaction tracking
- **`opportunities`** - New module/feature opportunities

### Row Level Security (RLS)

All tables have RLS policies enabled:

- Service role bypasses RLS (for engine operations)
- Authenticated users can only access their own data
- Admins can access all data

## Engine SDK

The `@ace/engine-sdk` package provides reusable services for common operations:

### Auth Service

```typescript
import { auth } from '@ace/engine-sdk'

// Verify JWT token and get customer profile
const result = await auth.verifyUser(token)

// Create user programmatically (bypasses email confirmation)
const { user, authUser } = await auth.createUser(email, password, {
  full_name: 'John Doe',
  business_name: 'Acme Corp',
})

// Get customer record by auth user ID
const customer = await auth.getCustomer(authUserId)
```

### Future Services (Coming Soon)

- **Billing Service** - Stripe integration for subscriptions and payments
- **CRM Service** - Prospect and customer management
- **Analytics Service** - PostHog event tracking
- **Notifications Service** - Email and in-app notifications

## Deployment

### Vercel (Automatic)

The platform is configured for automatic deployment via Vercel:

1. **Connect your GitHub repository** to Vercel
2. **Configure environment variables** in Vercel Dashboard → Settings → Environment Variables
3. **Deploy**: Every push to `main` triggers a production deployment
4. **Preview deployments**: Every PR gets a unique preview URL

### Environment Variables in Vercel

Add all required environment variables from the [Environment Variables](#environment-variables) section above.

### Post-Deployment

After deploying to Vercel:

1. Update Supabase **redirect URLs** to include your Vercel domain
2. Update Stripe **webhook URL** to your production domain
3. Configure your custom domain in Vercel settings

## Scripts

### Root-level commands

```bash
pnpm dev          # Start dev server (runs apps/web)
pnpm build        # Build all packages
pnpm lint         # Lint all packages
pnpm type-check   # TypeScript type checking
pnpm format       # Format code with Prettier
pnpm test         # Run all tests
```

### Package-specific commands

```bash
# Web app
cd apps/web
pnpm dev          # Start Next.js dev server
pnpm build        # Build for production
pnpm test         # Run Vitest tests

# Database
cd packages/db
pnpm db:seed      # Seed database with test data

# Engine SDK
cd packages/engine-sdk
pnpm build        # Compile TypeScript
pnpm test         # Run tests
```

## Testing

The platform uses **Vitest** for testing:

- Unit tests for services and utilities
- Component tests with React Testing Library
- Type-level tests for database schema

Run tests:

```bash
pnpm test                 # Run all tests
pnpm test:watch          # Run tests in watch mode
```

## CI/CD

GitHub Actions automatically runs on every push and PR:

1. **Lint** - ESLint across all packages
2. **Type Check** - TypeScript compilation check
3. **Test** - Vitest test suite

View workflow: `.github/workflows/ci.yml`

## Monitoring & Analytics

- **Error Tracking**: Sentry captures all errors and exceptions
- **Product Analytics**: PostHog tracks user behavior and events
- **Performance**: Next.js built-in analytics (Vercel Analytics)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests for new functionality
5. Ensure CI passes
6. Submit a Pull Request

## License

Private - All rights reserved

## Support

For questions or issues, please contact the development team.

---

**Built with ❤️ using Next.js, Supabase, and TypeScript**
