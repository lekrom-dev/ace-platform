/**
 * useUser hook
 * Client-side hook for accessing current user and auth state
 */

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

export function useUser() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    const supabase = createBrowserClient()

    // Get initial user
    const getUser = async () => {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser()

        if (error) {
          setError(error)
        } else {
          setUser(user)
        }
      } catch (err) {
        setError(err as Error)
      } finally {
        setLoading(false)
      }
    }

    getUser()

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { user, loading, error }
}
