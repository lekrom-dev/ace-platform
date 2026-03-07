'use client'

/**
 * Receptionist Settings Page
 * Configure business hours, greeting, phone number, etc.
 */

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface TradieConfig {
  id: string
  business_name: string
  trade_type: string
  service_area: string | null
  phone_number: string | null
  forwarding_number: string | null
  emergency_number: string | null
  greeting_script: string
  business_hours: BusinessHours[]
  is_active: boolean
  google_calendar_connected: boolean
}

interface BusinessHours {
  day: string
  open: string
  close: string
  enabled: boolean
}

export default function SettingsPage() {
  const { user, loading: userLoading } = useUser()
  const [config, setConfig] = useState<TradieConfig | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingGreeting, setEditingGreeting] = useState(false)
  const [greetingText, setGreetingText] = useState('')

  useEffect(() => {
    if (!userLoading && user) {
      loadConfig()
    }
  }, [user, userLoading])

  async function loadConfig() {
    const supabase = createBrowserClient()

    try {
      // Get customer record
      const { data: customer } = await supabase
        .from('customers')
        .select('id')
        .eq('auth_user_id', user!.id)
        .single()

      if (!customer) {
        setLoading(false)
        return
      }

      // Get tradie config
      const { data: tradieConfig } = await supabase
        .from('tradie_configs')
        .select('*')
        .eq('customer_id', customer.id)
        .single()

      if (tradieConfig) {
        setConfig(tradieConfig)
        setGreetingText(tradieConfig.greeting_script)
      }
    } catch (error) {
      console.error('Error loading config:', error)
    } finally {
      setLoading(false)
    }
  }

  async function updateGreeting() {
    if (!config) return

    setSaving(true)
    const supabase = createBrowserClient()

    try {
      const { error } = await supabase
        .from('tradie_configs')
        .update({ greeting_script: greetingText })
        .eq('id', config.id)

      if (!error) {
        setConfig({ ...config, greeting_script: greetingText })
        setEditingGreeting(false)
      }
    } catch (error) {
      console.error('Error updating greeting:', error)
    } finally {
      setSaving(false)
    }
  }

  async function updateBusinessHours(updatedHours: BusinessHours[]) {
    if (!config) return

    const supabase = createBrowserClient()

    try {
      const { error } = await supabase
        .from('tradie_configs')
        .update({ business_hours: updatedHours })
        .eq('id', config.id)

      if (!error) {
        setConfig({ ...config, business_hours: updatedHours })
      }
    } catch (error) {
      console.error('Error updating hours:', error)
    }
  }

  async function toggleReceptionist() {
    if (!config) return

    const supabase = createBrowserClient()

    try {
      const { error } = await supabase
        .from('tradie_configs')
        .update({ is_active: !config.is_active })
        .eq('id', config.id)

      if (!error) {
        setConfig({ ...config, is_active: !config.is_active })
      }
    } catch (error) {
      console.error('Error toggling receptionist:', error)
    }
  }

  async function updateEmergencyNumber(number: string | null) {
    if (!config) return

    const supabase = createBrowserClient()

    try {
      const { error } = await supabase
        .from('tradie_configs')
        .update({ emergency_number: number })
        .eq('id', config.id)

      if (!error) {
        setConfig({ ...config, emergency_number: number })
        alert(number ? 'Emergency number updated!' : 'Emergency number removed')
      }
    } catch (error) {
      console.error('Error updating emergency number:', error)
      alert('Failed to update emergency number')
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading settings...</div>
      </div>
    )
  }

  if (!config) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">AI Receptionist Not Set Up</h3>
        <p className="text-yellow-700 mb-4">You haven't set up your AI receptionist yet.</p>
        <Link
          href="/dashboard/receptionist/setup"
          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
        >
          Set Up Now
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="mt-1 text-sm text-gray-500">Configure your AI receptionist</p>
        </div>
        <Link href="/dashboard/receptionist" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Status Toggle */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">AI Receptionist Status</h3>
            <p className="mt-1 text-sm text-gray-500">
              {config.is_active
                ? 'Your receptionist is active and answering calls'
                : 'Your receptionist is currently paused'}
            </p>
          </div>
          <button
            onClick={toggleReceptionist}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 ${
              config.is_active ? 'bg-blue-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                config.is_active ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Business Info */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
        <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">Business Name</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.business_name}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Trade Type</dt>
            <dd className="mt-1 text-sm text-gray-900 capitalize">{config.trade_type}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Service Area</dt>
            <dd className="mt-1 text-sm text-gray-900">{config.service_area || 'Not set'}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">AI Phone Number</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">{config.phone_number}</dd>
          </div>
          <div>
            <dt className="text-sm font-medium text-gray-500">Forwarding Number</dt>
            <dd className="mt-1 text-sm text-gray-900 font-mono">
              {config.forwarding_number || 'Not set'}
            </dd>
          </div>
        </dl>
      </div>

      {/* Emergency Handling */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Call Handling</h3>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            When customers report emergencies (flooding, power outage, etc.), your AI will:
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-3">
              <span className="text-xl">✅</span>
              <div>
                <p className="text-sm font-medium text-blue-900">Always enabled:</p>
                <p className="text-sm text-blue-700 mt-1">
                  SMS alert sent to {config.forwarding_number || 'your mobile'}
                </p>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div className="flex items-start space-x-3 flex-1">
                <span className="text-xl">⚡</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">
                    Optional: Direct Call Transfer
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Add a separate emergency number to enable instant call transfer for critical
                    situations
                  </p>
                  {config.emergency_number && (
                    <p className="text-sm font-mono text-green-600 mt-2">
                      Currently: {config.emergency_number}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => {
                  const number = prompt(
                    config.emergency_number
                      ? `Current emergency number: ${config.emergency_number}\n\nEnter new number or leave blank to remove:`
                      : 'Enter emergency number for direct transfer (e.g., +61 412 345 678):',
                  )

                  if (number !== null) {
                    updateEmergencyNumber(number.trim() || null)
                  }
                }}
                className="text-sm text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                {config.emergency_number ? 'Change' : 'Add Number'}
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm font-medium text-yellow-900 mb-2">
              ⚠️ Important: Avoid Call Loops
            </p>
            <p className="text-sm text-yellow-700">
              Your emergency number should be DIFFERENT from the mobile you're forwarding to the AI.
              Otherwise, emergency transfers will create a loop.
            </p>
          </div>
        </div>
      </div>

      {/* Greeting Script */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Greeting Script</h3>
          {!editingGreeting && (
            <button
              onClick={() => setEditingGreeting(true)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Edit
            </button>
          )}
        </div>

        {editingGreeting ? (
          <div>
            <textarea
              value={greetingText}
              onChange={(e) => setGreetingText(e.target.value)}
              rows={4}
              className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            />
            <div className="mt-3 flex items-center space-x-3">
              <button
                onClick={updateGreeting}
                disabled={saving}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditingGreeting(false)
                  setGreetingText(config.greeting_script)
                }}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md text-sm hover:bg-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700">{config.greeting_script}</p>
        )}
      </div>

      {/* Business Hours */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Hours</h3>
        <div className="space-y-4">
          {config.business_hours.map((day, index) => (
            <div key={day.day} className="flex items-center justify-between">
              <div className="flex items-center space-x-4 flex-1">
                <input
                  type="checkbox"
                  checked={day.enabled}
                  onChange={(e) => {
                    const updated = [...config.business_hours]
                    updated[index].enabled = e.target.checked
                    updateBusinessHours(updated)
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                />
                <span className="text-sm font-medium text-gray-700 w-24 capitalize">{day.day}</span>
                {day.enabled && (
                  <div className="flex items-center space-x-2">
                    <input
                      type="time"
                      value={day.open}
                      onChange={(e) => {
                        const updated = [...config.business_hours]
                        updated[index].open = e.target.value
                        updateBusinessHours(updated)
                      }}
                      className="text-sm border-gray-300 rounded-md"
                    />
                    <span className="text-gray-500">to</span>
                    <input
                      type="time"
                      value={day.close}
                      onChange={(e) => {
                        const updated = [...config.business_hours]
                        updated[index].close = e.target.value
                        updateBusinessHours(updated)
                      }}
                      className="text-sm border-gray-300 rounded-md"
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Google Calendar */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Google Calendar Integration</h3>
            <p className="mt-1 text-sm text-gray-500">
              {config.google_calendar_connected
                ? 'Calendar connected - bookings will be synced automatically'
                : 'Connect your Google Calendar to sync bookings'}
            </p>
          </div>
          <button
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              config.google_calendar_connected
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-blue-600 text-white hover:bg-blue-700'
            }`}
          >
            {config.google_calendar_connected ? 'Disconnect' : 'Connect Calendar'}
          </button>
        </div>
      </div>
    </div>
  )
}
