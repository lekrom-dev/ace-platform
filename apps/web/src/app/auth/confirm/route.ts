/**
 * Auth confirmation callback route
 * Handles email confirmation links from Supabase
 */

import { createServerClient } from '@supabase/ssr'
import { type NextRequest, NextResponse } from 'next/server'
import type { Database } from '@ace/db'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type')
  const next = searchParams.get('next') ?? '/dashboard'

  if (token_hash && type) {
    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.cookies.getAll()
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          },
        },
      },
    )

    const { error } = await supabase.auth.verifyOtp({
      type: type as 'signup' | 'email_change' | 'recovery' | 'invite',
      token_hash,
    })

    if (!error) {
      return NextResponse.redirect(new URL(next, request.url))
    }
  }

  // Return the user to an error page with some instructions
  return NextResponse.redirect(new URL('/login?error=auth-failed', request.url))
}
