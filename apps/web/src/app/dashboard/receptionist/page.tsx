'use client'

/**
 * Tradie Receptionist Dashboard - Overview
 * Shows stats, recent calls, and quick actions
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface DashboardStats {
  totalCalls: number
  callsToday: number
  bookingsToday: number
  activeReceptionist: boolean
  phoneNumber: string | null
}

interface RecentCall {
  id: string
  caller_phone: string
  caller_name: string | null
  call_started_at: string
  duration_seconds: number | null
  outcome_type: string
}

export default function ReceptionistDashboard() {
  const router = useRouter()
  const { user, loading: userLoading } = useUser()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userLoading && user) {
      loadDashboardData()
    }
  }, [user, userLoading])

  async function loadDashboardData() {
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

      // Get call stats
      const { data: allCalls, count: totalCalls } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact' })
        .eq('customer_id', customer.id)

      // Get today's calls
      const today = new Date()
      today.setHours(0, 0, 0, 0)

      const { count: callsToday } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .gte('call_started_at', today.toISOString())

      // Get today's bookings
      const { count: bookingsToday } = await supabase
        .from('call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('customer_id', customer.id)
        .eq('outcome_type', 'booking_created')
        .gte('call_started_at', today.toISOString())

      // Get recent calls
      const { data: recent } = await supabase
        .from('call_logs')
        .select('*')
        .eq('customer_id', customer.id)
        .order('call_started_at', { ascending: false })
        .limit(5)

      setStats({
        totalCalls: totalCalls || 0,
        callsToday: callsToday || 0,
        bookingsToday: bookingsToday || 0,
        activeReceptionist: tradieConfig?.is_active || false,
        phoneNumber: tradieConfig?.phone_number || null,
      })

      setRecentCalls(recent || [])
    } catch (error) {
      console.error('Error loading dashboard:', error)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading dashboard...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">AI Receptionist Not Set Up</h3>
        <p className="text-yellow-700 mb-4">
          You haven't set up your AI receptionist yet. Get started to never miss a call!
        </p>
        <button
          onClick={() => router.push('/dashboard/receptionist/setup')}
          className="bg-yellow-600 text-white px-4 py-2 rounded-md hover:bg-yellow-700"
        >
          Set Up Now
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">AI Receptionist</h1>
        <p className="mt-1 text-sm text-gray-500">Manage your 24/7 AI-powered phone assistant</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Status */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div
                  className={`h-3 w-3 rounded-full ${stats.activeReceptionist ? 'bg-green-500' : 'bg-red-500'}`}
                />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Status</dt>
                  <dd className="text-lg font-semibold text-gray-900">
                    {stats.activeReceptionist ? 'Active' : 'Inactive'}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Calls Today */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-blue-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Calls Today</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.callsToday}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Bookings Today */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-green-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Bookings Today</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.bookingsToday}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Calls */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <svg
                  className="h-6 w-6 text-purple-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"
                  />
                </svg>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Calls</dt>
                  <dd className="text-lg font-semibold text-gray-900">{stats.totalCalls}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Phone Number Display */}
      {stats.phoneNumber && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-blue-900">Your AI Receptionist Number</h3>
              <p className="mt-1 text-2xl font-bold text-blue-700">{stats.phoneNumber}</p>
            </div>
            <Link
              href="/dashboard/receptionist/settings"
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              Configure →
            </Link>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/dashboard/receptionist/calls"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900">Call History</h3>
          <p className="mt-2 text-sm text-gray-500">View all calls with transcripts</p>
        </Link>

        <Link
          href="/dashboard/receptionist/bookings"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900">Bookings</h3>
          <p className="mt-2 text-sm text-gray-500">Manage appointments captured by AI</p>
        </Link>

        <Link
          href="/dashboard/receptionist/settings"
          className="bg-white p-6 rounded-lg shadow hover:shadow-md transition-shadow"
        >
          <h3 className="text-lg font-medium text-gray-900">Settings</h3>
          <p className="mt-2 text-sm text-gray-500">Configure hours, greeting, and more</p>
        </Link>

        <Link
          href="/dashboard/receptionist/referrals"
          className="bg-gradient-to-br from-green-50 to-blue-50 p-6 rounded-lg shadow hover:shadow-md transition-shadow border-2 border-green-200"
        >
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-medium text-gray-900">Referrals</h3>
            <span className="text-xl">🎁</span>
          </div>
          <p className="text-sm text-gray-600">Refer mates, get 10% off each!</p>
        </Link>
      </div>

      {/* Recent Calls */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-5 sm:p-6">
          <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Recent Calls</h3>

          {recentCalls.length === 0 ? (
            <p className="text-sm text-gray-500">
              No calls yet. Your AI receptionist is ready to answer!
            </p>
          ) : (
            <div className="space-y-3">
              {recentCalls.map((call) => (
                <Link
                  key={call.id}
                  href={`/dashboard/receptionist/calls/${call.id}`}
                  className="block border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {call.caller_name || call.caller_phone}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(call.call_started_at).toLocaleString()}
                        {call.duration_seconds &&
                          ` • ${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`}
                      </p>
                    </div>
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
                      {call.outcome_type.replace('_', ' ')}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
