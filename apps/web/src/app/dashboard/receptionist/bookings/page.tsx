'use client'

/**
 * Bookings Page
 * Manage appointments captured by AI receptionist
 */

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface Booking {
  id: string
  caller_phone: string
  call_started_at: string
  booking_data: {
    date: string
    time: string
    service_type: string
    description: string
    customer_name: string
    customer_phone: string
    urgency: string
  }
  google_calendar_event_id: string | null
}

export default function BookingsPage() {
  const { user, loading: userLoading } = useUser()
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'upcoming' | 'past' | 'all'>('upcoming')

  useEffect(() => {
    if (!userLoading && user) {
      loadBookings()
    }
  }, [user, userLoading, filter])

  async function loadBookings() {
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
        .eq('outcome_type', 'booking_created')
        .not('booking_data', 'is', null)
        .order('call_started_at', { ascending: false })

      const { data } = await query

      // Filter by date
      const now = new Date()
      let filtered = data || []

      if (filter === 'upcoming') {
        filtered = filtered.filter((b) => {
          const bookingDate = new Date(b.booking_data.date)
          return bookingDate >= now
        })
      } else if (filter === 'past') {
        filtered = filtered.filter((b) => {
          const bookingDate = new Date(b.booking_data.date)
          return bookingDate < now
        })
      }

      setBookings(filtered)
    } catch (error) {
      console.error('Error loading bookings:', error)
    } finally {
      setLoading(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading bookings...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Bookings</h1>
          <p className="mt-1 text-sm text-gray-500">
            Appointments captured by your AI receptionist
          </p>
        </div>
        <Link href="/dashboard/receptionist" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700">Show:</span>
          <button
            onClick={() => setFilter('upcoming')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'upcoming'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => setFilter('past')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'past'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Past
          </button>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'all'
                ? 'bg-gray-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
        </div>
      </div>

      {/* Bookings Grid */}
      {bookings.length === 0 ? (
        <div className="bg-white shadow rounded-lg px-6 py-12 text-center">
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
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No bookings yet</h3>
          <p className="mt-1 text-sm text-gray-500">
            When customers book appointments through your AI receptionist, they'll appear here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bookings.map((booking) => {
            const bookingDate = new Date(booking.booking_data.date)
            const isPast = bookingDate < new Date()

            return (
              <div
                key={booking.id}
                className={`bg-white rounded-lg shadow p-6 ${isPast ? 'opacity-60' : ''}`}
              >
                {/* Date & Time */}
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{bookingDate.getDate()}</p>
                    <p className="text-sm text-gray-500">
                      {bookingDate.toLocaleDateString('en-AU', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      booking.booking_data.urgency === 'emergency'
                        ? 'bg-red-100 text-red-800'
                        : booking.booking_data.urgency === 'urgent'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-green-100 text-green-800'
                    }`}
                  >
                    {booking.booking_data.urgency}
                  </span>
                </div>

                {/* Time */}
                <div className="mt-4 flex items-center text-sm text-gray-500">
                  <svg
                    className="mr-1.5 h-4 w-4 text-gray-400"
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
                  {booking.booking_data.time}
                </div>

                {/* Customer */}
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-900">
                    {booking.booking_data.customer_name}
                  </p>
                  <p className="text-sm text-gray-500">{booking.booking_data.customer_phone}</p>
                </div>

                {/* Service */}
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700">
                    {booking.booking_data.service_type}
                  </p>
                  <p className="mt-1 text-sm text-gray-500 line-clamp-2">
                    {booking.booking_data.description}
                  </p>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center space-x-3">
                  <Link
                    href={`/dashboard/receptionist/calls/${booking.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700"
                  >
                    View Call
                  </Link>
                  {booking.google_calendar_event_id ? (
                    <span className="text-sm text-green-600">✓ In Calendar</span>
                  ) : (
                    <button className="text-sm text-gray-600 hover:text-gray-700">
                      Add to Calendar
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
