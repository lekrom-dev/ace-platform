# @ace/db

Database schema, types, and migrations for the ACE Platform.

## Stack

- **ORM**: Drizzle ORM
- **Database**: PostgreSQL
- **Migration Tool**: Drizzle Kit

## Setup

1. Set the `DATABASE_URL` environment variable:

```bash
export DATABASE_URL="postgresql://user:password@localhost:5432/ace_platform"
```

2. Generate migrations:

```bash
pnpm db:generate
```

3. Run migrations:

```bash
pnpm db:migrate
```

4. Open Drizzle Studio (database GUI):

```bash
pnpm db:studio
```

## Usage

```typescript
import { db, users } from '@ace/db'

// Query users
const allUsers = await db.select().from(users)

// Insert user
const newUser = await db
  .insert(users)
  .values({
    email: 'user@example.com',
    name: 'John Doe',
  })
  .returning()
```

## Schema

Current tables:

- `users` - User accounts
- `accounts` - OAuth provider accounts
- `sessions` - User sessions
- `verification_tokens` - Email verification tokens
