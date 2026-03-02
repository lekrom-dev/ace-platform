import type { Metadata } from 'next'
import './globals.css'
import { PostHogProvider } from '@/lib/posthog/provider'

export const metadata: Metadata = {
  title: 'ACE Platform',
  description: 'ACE Platform - Next.js Application',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PostHogProvider>{children}</PostHogProvider>
      </body>
    </html>
  )
}
