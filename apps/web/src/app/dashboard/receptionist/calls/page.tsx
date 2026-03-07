'use client'

/**
 * Call History Page
 * Shows all calls with filtering and search
 */

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface Call {
  id: string
  caller_phone: string
  caller_name: string | null
  call_started_at: string
  call_ended_at: string | null
  duration_seconds: number | null
  outcome_type: string
  transcript: string | null
  sentiment: string | null
}

export default function CallHistoryPage() {
  const { user, loading: userLoading } = useUser()
  const [calls, setCalls] = useState<Call[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')

  useEffect(() => {
    if (!userLoading && user) {
      loadCalls()
    }
  }, [user, userLoading, filter])

  async function loadCalls() {
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

      let query = supabase
        .from('call_logs')
        .select('*')
        .eq('customer_id', customer.id)
        .order('call_started_at', { ascending: false })

      // Apply filter
      if (filter !== 'all') {
        query = query.eq('outcome_type', filter)
      }

      const { data } = await query

      setCalls(data || [])
    } catch (error) {
      console.error('Error loading calls:', error)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading calls...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Call History</h1>
          <p className="mt-1 text-sm text-gray-500">All calls handled by your AI receptionist</p>
        </div>
        <Link href="/dashboard/receptionist" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Filter by outcome:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('booking_created')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'booking_created'
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Bookings
          </button>
          <button
            onClick={() => setFilter('callback_requested')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'callback_requested'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Callbacks
          </button>
          <button
            onClick={() => setFilter('emergency_transfer')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'emergency_transfer'
                ? 'bg-red-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Emergencies
          </button>
        </div>
      </div>

      {/* Call List */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        {calls.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No calls yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Your AI receptionist is ready to answer calls 24/7!
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {calls.map((call) => (
              <li key={call.id}>
                <Link
                  href={`/dashboard/receptionist/calls/${call.id}`}
                  className="block hover:bg-gray-50 transition-colors"
                >
                  <div className="px-6 py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {call.caller_name || call.caller_phone}
                          </p>
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              call.outcome_type === 'booking_created'
                                ? 'bg-green-100 text-green-800'
                                : call.outcome_type === 'callback_requested'
                                  ? 'bg-blue-100 text-blue-800'
                                  : call.outcome_type === 'emergency_transfer'
                                    ? 'bg-red-100 text-red-800'
                                    : 'bg-gray-100 text-gray-800'
                            }`}
                          >
                            {call.outcome_type.replace(/_/g, ' ')}
                          </span>
                          {call.sentiment && (
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                                call.sentiment === 'Positive'
                                  ? 'bg-green-50 text-green-700'
                                  : call.sentiment === 'Negative'
                                    ? 'bg-red-50 text-red-700'
                                    : 'bg-gray-50 text-gray-700'
                              }`}
                            >
                              {call.sentiment}
                            </span>
                          )}
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <svg
                            className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                          </svg>
                          <span>{new Date(call.call_started_at).toLocaleString()}</span>
                          {call.duration_seconds && (
                            <>
                              <span className="mx-2">•</span>
                              <span>
                                {Math.floor(call.duration_seconds / 60)}m{' '}
                                {call.duration_seconds % 60}s
                              </span>
                            </>
                          )}
                        </div>
                        {call.transcript && (
                          <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                            {call.transcript.substring(0, 150)}...
                          </p>
                        )}
                      </div>
                      <div className="ml-4 flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
