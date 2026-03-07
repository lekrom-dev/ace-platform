/**
 * Signup page
 * Wraps SignupForm in Suspense boundary for useSearchParams
 */

import { Suspense } from 'react'
import { SignupForm } from './SignupForm'

function SignupLoading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupLoading />}>
      <SignupForm />
    </Suspense>
  )
}
