/**
 * Auth layout
 * Centered card design for login, signup, and password pages
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | ACE Platform',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>
}
