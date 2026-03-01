/**
 * Auth layout
 * Centered card design for login, signup, and password pages
 */

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Sign In | ACE Platform',
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full">{children}</div>
    </div>
  )
}
