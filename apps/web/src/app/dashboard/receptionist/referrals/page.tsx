'use client'

/**
 * Referral Program Page
 * Share referral code, track referrals, see discount
 */

import { useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'
import Link from 'next/link'

interface ReferralStats {
  referralCode: string
  activeReferrals: number
  totalReferrals: number
  discountPercentage: number
  monthlySavings: number
}

interface Referral {
  id: string
  referredCustomerName: string
  referredCustomerEmail: string
  status: string
  referredAt: string
  activatedAt: string | null
}

export default function ReferralsPage() {
  const { user, loading: userLoading } = useUser()
  const [stats, setStats] = useState<ReferralStats | null>(null)
  const [referrals, setReferrals] = useState<Referral[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [invitePhones, setInvitePhones] = useState<string[]>([''])
  const [inviteMessage, setInviteMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [customerName, setCustomerName] = useState('')

  useEffect(() => {
    if (!userLoading && user) {
      loadReferralData()
    }
  }, [user, userLoading])

  async function loadReferralData() {
    const supabase = createBrowserClient()

    try {
      // Get customer with referral stats
      const { data: customer } = await supabase
        .from('customers')
        .select(
          'id, name, referral_code, active_referrals_count, total_referrals_count, referral_discount_percentage',
        )
        .eq('auth_user_id', user!.id)
        .single()

      if (!customer) {
        setLoading(false)
        return
      }

      // Calculate monthly savings (assuming $139 Professional plan)
      const planPrice = 139
      const monthlySavings = Math.round((planPrice * customer.referral_discount_percentage) / 100)

      setStats({
        referralCode: customer.referral_code,
        activeReferrals: customer.active_referrals_count || 0,
        totalReferrals: customer.total_referrals_count || 0,
        discountPercentage: customer.referral_discount_percentage || 0,
        monthlySavings,
      })

      // Set customer name and pre-fill invite message
      const name = customer.name || 'Your mate'
      setCustomerName(name)
      const referralLink = `https://yeahmate.ai/signup?ref=${customer.referral_code}`
      setInviteMessage(
        `G'day! ${name} here - I'm using Yeahmate.ai as my AI receptionist and it's a game changer! Never miss a call again. ` +
          `I thought you'd love it too. Sign up with my link and we both save 10%: ${referralLink}`,
      )

      // Get referral list
      const { data: referralsList } = await supabase
        .from('referrals')
        .select(
          `
          id,
          status,
          referred_at,
          activated_at,
          referred_customer:referred_customer_id (
            name,
            email
          )
        `,
        )
        .eq('referrer_customer_id', customer.id)
        .order('referred_at', { ascending: false })

      const formatted =
        referralsList?.map((r: any) => ({
          id: r.id,
          referredCustomerName: r.referred_customer?.name || 'Unknown',
          referredCustomerEmail: r.referred_customer?.email || '',
          status: r.status,
          referredAt: r.referred_at,
          activatedAt: r.activated_at,
        })) || []

      setReferrals(formatted)
    } catch (error) {
      console.error('Error loading referral data:', error)
    } finally {
      setLoading(false)
    }
  }

  function copyReferralLink() {
    const link = `https://yeahmate.ai/signup?ref=${stats?.referralCode}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function addPhoneField() {
    setInvitePhones([...invitePhones, ''])
  }

  function removePhoneField(index: number) {
    setInvitePhones(invitePhones.filter((_, i) => i !== index))
  }

  function updatePhoneField(index: number, value: string) {
    const updated = [...invitePhones]
    updated[index] = value
    setInvitePhones(updated)
  }

  async function sendInvites() {
    // Filter out empty phone numbers
    const phones = invitePhones.filter((p) => p.trim().length > 0)

    if (phones.length === 0) {
      alert('Please add at least one phone number')
      return
    }

    setSending(true)
    try {
      const response = await fetch('/api/referrals/send-invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          referralCode: stats?.referralCode,
          phones,
          message: inviteMessage,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send invites')
      }

      alert(
        `Invites scheduled! ${phones.length} mate${phones.length > 1 ? 's' : ''} will receive an SMS tomorrow.`,
      )

      // Reset form
      setInvitePhones([''])
    } catch (error) {
      console.error('Error sending invites:', error)
      alert('Failed to send invites. Please try again.')
    } finally {
      setSending(false)
    }
  }

  if (userLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-gray-600">Loading referrals...</div>
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="text-lg font-medium text-yellow-900 mb-2">Referral Program Not Available</h3>
        <p className="text-yellow-700">Your account doesn't have referral tracking enabled yet.</p>
      </div>
    )
  }

  const referralLink = `https://yeahmate.ai/signup?ref=${stats.referralCode}`
  const progressPercentage = Math.min((stats.activeReferrals / 10) * 100, 100)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Referral Program</h1>
          <p className="mt-1 text-sm text-gray-500">Get 10% off for every mate you refer!</p>
        </div>
        <Link href="/dashboard/receptionist" className="text-sm text-blue-600 hover:text-blue-700">
          ← Back to Dashboard
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Discount */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 overflow-hidden shadow rounded-lg text-white">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">🎉</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-green-100 truncate">Current Discount</dt>
                  <dd className="text-3xl font-bold">{stats.discountPercentage}%</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Savings */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">💰</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Monthly Savings</dt>
                  <dd className="text-3xl font-bold text-gray-900">${stats.monthlySavings}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Active Referrals */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">✅</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Active Referrals</dt>
                  <dd className="text-3xl font-bold text-gray-900">{stats.activeReferrals}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        {/* Total Referrals */}
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <span className="text-3xl">📊</span>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">Total Referred</dt>
                  <dd className="text-3xl font-bold text-gray-900">{stats.totalReferrals}</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Progress to Free */}
      <div className="bg-white shadow rounded-lg p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Progress to Free Service</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">{stats.activeReferrals} of 10 active referrals</span>
            <span className="font-semibold text-gray-900">{stats.discountPercentage}% off</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-4">
            <div
              className="bg-gradient-to-r from-blue-500 to-green-500 h-4 rounded-full transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {stats.activeReferrals >= 10 ? (
            <p className="text-green-600 font-medium">🎉 Congratulations! Your service is FREE!</p>
          ) : (
            <p className="text-gray-600 text-sm">
              Refer {10 - stats.activeReferrals} more{' '}
              {10 - stats.activeReferrals === 1 ? 'mate' : 'mates'} to get your service completely
              free!
            </p>
          )}
        </div>
      </div>

      {/* Share Referral Link */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-4">Share Your Referral Link</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Your Referral Code
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={stats.referralCode}
                readOnly
                className="flex-1 px-4 py-3 text-lg font-mono font-bold text-gray-900 bg-white border-2 border-blue-300 rounded-lg"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(stats.referralCode)
                  setCopied(true)
                  setTimeout(() => setCopied(false), 2000)
                }}
                className="px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                {copied ? '✓ Copied!' : 'Copy Code'}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-blue-900 mb-2">
              Full Referral Link
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="text"
                value={referralLink}
                readOnly
                className="flex-1 px-4 py-2 text-sm font-mono text-gray-700 bg-white border-2 border-blue-300 rounded-lg"
              />
              <button
                onClick={copyReferralLink}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 whitespace-nowrap"
              >
                {copied ? '✓ Copied!' : 'Copy Link'}
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4">
            <p className="text-sm font-medium text-gray-900 mb-2">How it works:</p>
            <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
              <li>Share your code or link with other tradies</li>
              <li>They sign up and become paying customers</li>
              <li>You get 10% off your subscription</li>
              <li>Discount stays as long as they stay subscribed</li>
              <li>Refer 10 mates = FREE service! 🎉</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Invite Mates via SMS */}
      <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-300 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-green-900 mb-2">📱 Invite Mates via SMS</h3>
        <p className="text-sm text-green-700 mb-4">
          Add your mate's mobile and we'll send them an SMS tomorrow with a follow-up call. Let them
          know to expect our outreach!
        </p>

        <div className="space-y-4">
          {/* Phone Numbers */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              Mobile Numbers (Australian format)
            </label>
            <div className="space-y-2">
              {invitePhones.map((phone, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => updatePhoneField(index, e.target.value)}
                    placeholder="+61 412 345 678 or 0412 345 678"
                    className="flex-1 px-4 py-2 text-gray-900 bg-white border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {invitePhones.length > 1 && (
                    <button
                      onClick={() => removePhoneField(index)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={addPhoneField}
              className="mt-2 text-sm text-green-700 hover:text-green-800 font-medium"
            >
              + Add another mate
            </button>
          </div>

          {/* Message Preview */}
          <div>
            <label className="block text-sm font-medium text-green-900 mb-2">
              SMS Message (edit if you like)
            </label>
            <textarea
              value={inviteMessage}
              onChange={(e) => setInviteMessage(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 text-gray-900 bg-white border-2 border-green-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
            <p className="mt-1 text-xs text-green-600">{inviteMessage.length} characters</p>
          </div>

          {/* Send Button */}
          <div className="bg-white rounded-lg p-4">
            <button
              onClick={sendInvites}
              disabled={sending}
              className="w-full px-6 py-3 bg-gradient-to-r from-green-600 to-emerald-600 text-white font-semibold rounded-lg hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending
                ? 'Scheduling Invites...'
                : '📤 Send Invites (SMS Tomorrow + Follow-up Call)'}
            </button>
            <p className="mt-2 text-xs text-gray-600 text-center">
              Your mates will receive an SMS tomorrow and a friendly follow-up call from Yeahmate.ai
            </p>
          </div>
        </div>
      </div>

      {/* Referral List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-5 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Your Referrals ({stats.totalReferrals})
          </h3>
        </div>

        {referrals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <span className="text-6xl">👥</span>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No referrals yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              Start sharing your referral code to earn discounts!
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {referrals.map((referral) => (
              <li key={referral.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {referral.referredCustomerName}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {referral.referredCustomerEmail}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Referred: {new Date(referral.referredAt).toLocaleDateString()}
                      {referral.activatedAt && (
                        <> • Activated: {new Date(referral.activatedAt).toLocaleDateString()}</>
                      )}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      referral.status === 'active'
                        ? 'bg-green-100 text-green-800'
                        : referral.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {referral.status}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
