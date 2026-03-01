'use client'

/**
 * Dashboard home page
 * Shows welcome message and logout button
 */

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

export default function DashboardPage() {
  const router = useRouter()
  const { user, loading } = useUser()
  const [loggingOut, setLoggingOut] = useState(false)

  const handleLogout = async () => {
    setLoggingOut(true)
    const supabase = createBrowserClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading...</div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="bg-white shadow sm:rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-2xl font-semibold leading-6 text-gray-900">
            Welcome to ACE Platform
          </h3>
          {user && (
            <div className="mt-4 max-w-xl text-sm text-gray-600">
              <p>Logged in as: {user.email}</p>
              <p className="mt-1">User ID: {user.id}</p>
            </div>
          )}
          <div className="mt-6">
            <button
              onClick={handleLogout}
              disabled={loggingOut}
              className="inline-flex items-center rounded-md bg-red-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loggingOut ? 'Logging out...' : 'Log out'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
