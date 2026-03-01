# @ace/engine-sdk

Shared engine services library for the ACE Platform.

## Features

- **Error Handling**: Custom error classes for consistent error handling
- **Logging**: Structured logging with development and production modes
- **API Client**: HTTP client with timeout, retries, and error handling
- **Validators**: Common validation schemas using Zod
- **Utilities**: Helper functions for common tasks

## Usage

### Error Handling

```typescript
import { ValidationError, NotFoundError, handleError } from '@ace/engine-sdk'

// Throw custom errors
throw new ValidationError('Invalid input', { field: 'email' })
throw new NotFoundError('User')

// Handle unknown errors
try {
  // ...
} catch (error) {
  const appError = handleError(error)
  console.error(appError.toJSON())
}
```

### Logging

```typescript
import { logger } from '@ace/engine-sdk'

logger.info('User logged in', { userId: '123' })
logger.error('Database connection failed', error)
logger.debug('Processing request', { requestId: 'abc' })
```

### API Client

```typescript
import { ApiClient } from '@ace/engine-sdk'

const client = new ApiClient({
  baseUrl: 'https://api.example.com',
  timeout: 5000,
})

const data = await client.get('/users')
await client.post('/users', { name: 'John' })
```

### Validators

```typescript
import { emailSchema, validate } from '@ace/engine-sdk'

const email = validate(emailSchema, 'user@example.com')
```

### Utilities

```typescript
import { retry, debounce, chunk } from '@ace/engine-sdk'

// Retry with exponential backoff
const result = await retry(() => fetchData(), { maxAttempts: 3 })

// Debounce function calls
const debouncedFn = debounce(handleInput, 300)

// Chunk array
const chunks = chunk([1, 2, 3, 4, 5], 2) // [[1, 2], [3, 4], [5]]
```
