# @ace/ui

Shared UI component library for the ACE Platform.

## Components

### Button

```tsx
import { Button } from '@ace/ui'

;<Button onClick={() => console.log('clicked')}>Click me</Button>
```

### Input

```tsx
import { Input } from '@ace/ui'

;<Input
  label="Email"
  type="email"
  placeholder="you@example.com"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

### Card

```tsx
import { Card } from '@ace/ui'

;<Card padding="lg" hover>
  <Card.Header>
    <Card.Title>My Card</Card.Title>
  </Card.Header>
  <Card.Content>Content goes here</Card.Content>
</Card>
```

### Label

```tsx
import { Label } from '@ace/ui'

;<Label htmlFor="email" required>
  Email Address
</Label>
```

### Container

```tsx
import { Container } from '@ace/ui'

;<Container maxWidth="lg">
  <h1>Page Content</h1>
</Container>
```

### Spinner

```tsx
import { Spinner } from '@ace/ui'

;<Spinner size="lg" />
```

## Styling

All components use Tailwind CSS classes and are designed to work seamlessly with the ACE Platform design system.
