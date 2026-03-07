'use client'

/**
 * AI Receptionist Setup / Onboarding
 * Guides tradie through call forwarding setup
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface OnboardingStep {
  title: string
  completed: boolean
}

export default function SetupPage() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [aiPhoneNumber, setAiPhoneNumber] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [provisioning, setProvisioning] = useState(false)
  const [provisionError, setProvisionError] = useState<string | null>(null)
  const [forwardingMethod, setForwardingMethod] = useState<'conditional' | 'all'>('conditional')
  const [steps, setSteps] = useState<OnboardingStep[]>([
    { title: 'Enable Call Forwarding', completed: false },
    { title: 'Test Your Setup', completed: false },
    { title: 'Configure Emergency Handling', completed: false },
  ])

  useEffect(() => {
    if (!userLoading && user) {
      loadSetupData()
    }
  }, [user, userLoading])

  async function loadSetupData() {
    const supabase = createBrowserClient()

    try {
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', user!.id)
        .single()

      if (!customer) {
        setLoading(false)
        return
      }

      const { data: tradieConfig } = await supabase
        .from('tradie_configs')
        .select('phone_number, is_active')
        .eq('customer_id', customer.id)
        .single()

      if (tradieConfig?.phone_number) {
        setAiPhoneNumber(tradieConfig.phone_number)

        // Update step completion
        if (tradieConfig.is_active) {
          setSteps((prev) =>
            prev.map((step, idx) => (idx === 0 ? { ...step, completed: true } : step)),
          )
        }
      }
    } catch (error) {
      console.error('Error loading setup data:', error)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading setup...</div>
      </div>
    )
  }

  async function handleProvision() {
    setProvisioning(true)
    setProvisionError(null)

    try {
      const response = await fetch('/api/receptionist/provision', {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to provision')
      }

      // Reload setup data to show the provisioned number
      await loadSetupData()
    } catch (error: any) {
      setProvisionError(error.message)
      setProvisioning(false)
    }
  }

  if (!aiPhoneNumber) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow rounded-lg p-8">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">Provision Your AI Receptionist</h3>
          <p className="text-gray-700 mb-6">
            Click the button below to provision your AI receptionist phone number. This will:
          </p>
          <ul className="space-y-2 mb-8 text-gray-700">
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Create your AI receptionist agent with Retell AI</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Provision a dedicated phone number</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">✓</span>
              <span>Configure call forwarding and webhooks</span>
            </li>
          </ul>

          {provisionError && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded p-4">
              <p className="text-sm text-red-800">{provisionError}</p>
            </div>
          )}

          <button
            onClick={handleProvision}
            disabled={provisioning}
            className="w-full bg-blue-600 text-white px-6 py-4 rounded-lg font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {provisioning ? 'Provisioning...' : 'Provision AI Receptionist'}
          </button>

          <p className="mt-4 text-sm text-gray-500 text-center">This usually takes 30-60 seconds</p>
        </div>
      </div>
    )
  }

  const forwardingCode = aiPhoneNumber.replace(/\s/g, '').replace('+', '')

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Set Up Your AI Receptionist</h1>
        <p className="mt-2 text-gray-600">
          Follow these steps to start receiving calls through your AI assistant
        </p>
      </div>

      {/* Progress Steps */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="flex items-center space-x-3">
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  step.completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}
              >
                {step.completed ? '✓' : idx + 1}
              </div>
              <span
                className={`text-sm font-medium ${
                  step.completed ? 'text-gray-900' : 'text-gray-500'
                }`}
              >
                {step.title}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Your AI Phone Number */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Your AI Receptionist Number</h3>
        <p className="text-3xl font-bold text-blue-700 mb-2">{aiPhoneNumber}</p>
        <p className="text-sm text-blue-600">This is your dedicated AI receptionist phone number</p>
      </div>

      {/* Step 1: Enable Call Forwarding */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 1: Enable Call Forwarding</h2>

        <p className="text-gray-700 mb-6">
          Choose how you want your existing mobile number to work with your AI receptionist:
        </p>

        {/* Forwarding Method Selection */}
        <div className="space-y-4 mb-8">
          <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="forwarding"
              checked={forwardingMethod === 'conditional'}
              onChange={() => setForwardingMethod('conditional')}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">
                Forward when busy or no answer (Recommended)
              </p>
              <p className="text-sm text-gray-600 mt-1">
                You receive calls normally. AI only answers if you can't pick up.
              </p>
              <div className="mt-3 bg-gray-50 rounded p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">Dial this on your mobile:</p>
                <p className="text-lg font-mono font-bold text-gray-900">**61*{forwardingCode}#</p>
                <p className="text-xs text-gray-600 mt-2">Press the call button after entering</p>
              </div>
            </div>
          </label>

          <label className="flex items-start space-x-3 p-4 border-2 rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="forwarding"
              checked={forwardingMethod === 'all'}
              onChange={() => setForwardingMethod('all')}
              className="mt-1"
            />
            <div className="flex-1">
              <p className="font-semibold text-gray-900">Forward all calls immediately</p>
              <p className="text-sm text-gray-600 mt-1">
                AI answers all business calls 24/7. You never get interrupted.
              </p>
              <div className="mt-3 bg-gray-50 rounded p-3">
                <p className="text-xs font-medium text-gray-700 mb-2">In your phone settings:</p>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Go to Settings → Phone → Call Forwarding</li>
                  <li>Toggle Call Forwarding ON</li>
                  <li>Enter: {aiPhoneNumber}</li>
                </ol>
              </div>
            </div>
          </label>
        </div>

        {/* Instructions for iOS/Android */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Platform-Specific Instructions</h3>

          <div className="grid md:grid-cols-2 gap-6">
            {/* iOS */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl"></span>
                <h4 className="font-medium text-gray-900">iPhone (iOS)</h4>
              </div>
              {forwardingMethod === 'conditional' ? (
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Open Phone app</li>
                  <li>
                    Dial: <span className="font-mono font-bold">**61*{forwardingCode}#</span>
                  </li>
                  <li>Press call button</li>
                  <li>Wait for confirmation message</li>
                </ol>
              ) : (
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Open Settings</li>
                  <li>Tap Phone → Call Forwarding</li>
                  <li>Toggle ON</li>
                  <li>Enter: {aiPhoneNumber}</li>
                </ol>
              )}
            </div>

            {/* Android */}
            <div>
              <div className="flex items-center space-x-2 mb-3">
                <span className="text-2xl">🤖</span>
                <h4 className="font-medium text-gray-900">Android</h4>
              </div>
              {forwardingMethod === 'conditional' ? (
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Open Phone app</li>
                  <li>
                    Dial: <span className="font-mono font-bold">**61*{forwardingCode}#</span>
                  </li>
                  <li>Press call button</li>
                  <li>Wait for confirmation message</li>
                </ol>
              ) : (
                <ol className="text-sm text-gray-700 space-y-2 list-decimal list-inside">
                  <li>Open Phone app</li>
                  <li>Tap ⋮ (menu) → Settings</li>
                  <li>Tap Calls → Call forwarding</li>
                  <li>Choose "Always forward"</li>
                  <li>Enter: {aiPhoneNumber}</li>
                </ol>
              )}
            </div>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded">
            <p className="text-sm font-medium text-yellow-900 mb-1">⚠️ Carrier Confirmation</p>
            <p className="text-sm text-yellow-700">
              You should see a confirmation message from your carrier (Telstra, Optus, Vodafone,
              etc.). If not, contact your carrier's support.
            </p>
          </div>
        </div>

        {/* Turn Off Forwarding */}
        <div className="mt-6 p-4 bg-gray-100 rounded">
          <p className="text-sm font-medium text-gray-900 mb-2">
            To turn off call forwarding anytime:
          </p>
          <p className="text-lg font-mono font-bold text-gray-700">##61#</p>
          <p className="text-sm text-gray-600 mt-1">(Or ##002# to cancel all forwarding)</p>
        </div>
      </div>

      {/* Step 2: Test Your Setup */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Step 2: Test Your Setup</h2>

        <div className="space-y-4">
          <p className="text-gray-700">After enabling call forwarding, test that it's working:</p>

          <ol className="space-y-3 list-decimal list-inside text-gray-700">
            <li>Call your mobile number from a different phone</li>
            <li>Don't answer it (or let it ring)</li>
            <li>Your AI receptionist should answer within 15-30 seconds</li>
            <li>Try asking: "What are your business hours?"</li>
          </ol>

          <div className="bg-green-50 border border-green-200 rounded p-4">
            <p className="text-sm font-medium text-green-900">
              ✅ If your AI receptionist answers, you're all set!
            </p>
            <p className="text-sm text-green-700 mt-1">
              Check your dashboard to see the call log with transcript.
            </p>
          </div>
        </div>
      </div>

      {/* Step 3: Emergency Handling */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Step 3: Configure Emergency Handling
        </h2>

        <p className="text-gray-700 mb-6">
          When customers report emergencies (flooding, no power, etc.), your AI receptionist will:
        </p>

        <div className="space-y-4 mb-6">
          <div className="flex items-start space-x-3">
            <span className="text-2xl">📱</span>
            <div>
              <p className="font-medium text-gray-900">Send you an SMS alert</p>
              <p className="text-sm text-gray-600">
                Instant notification with customer details and issue description
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">📊</span>
            <div>
              <p className="font-medium text-gray-900">Log in dashboard</p>
              <p className="text-sm text-gray-600">
                High-priority alert visible immediately when you open the app
              </p>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <span className="text-2xl">⚡</span>
            <div>
              <p className="font-medium text-gray-900">Optional: Direct transfer</p>
              <p className="text-sm text-gray-600">
                Add a separate emergency number for instant call transfer
              </p>
            </div>
          </div>
        </div>

        <Link
          href="/dashboard/receptionist/settings"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
        >
          Configure Emergency Number →
        </Link>
      </div>

      {/* Complete Setup */}
      <div className="flex justify-center">
        <button
          onClick={() => router.push('/dashboard/receptionist')}
          className="bg-green-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-green-700"
        >
          Complete Setup & Go to Dashboard
        </button>
      </div>
    </div>
  )
}
