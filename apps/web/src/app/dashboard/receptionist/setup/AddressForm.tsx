'use client'

/**
 * Address Collection Form
 * Captures business address required for Twilio phone number provisioning
 */

import { useState } from 'react'

interface AddressFormProps {
  businessName: string
  currentCity?: string
  currentState?: string
  onSubmit: (address: AddressData) => void
  onCancel: () => void
  loading?: boolean
}

export interface AddressData {
  streetAddress: string
  city: string
  state: string
  postcode: string
}

const australianStates = [
  { code: 'NSW', name: 'New South Wales' },
  { code: 'VIC', name: 'Victoria' },
  { code: 'QLD', name: 'Queensland' },
  { code: 'WA', name: 'Western Australia' },
  { code: 'SA', name: 'South Australia' },
  { code: 'TAS', name: 'Tasmania' },
  { code: 'ACT', name: 'Australian Capital Territory' },
  { code: 'NT', name: 'Northern Territory' },
]

export function AddressForm({
  businessName,
  currentCity = '',
  currentState = '',
  onSubmit,
  onCancel,
  loading = false,
}: AddressFormProps) {
  const [streetAddress, setStreetAddress] = useState('')
  const [city, setCity] = useState(currentCity)
  const [state, setState] = useState(currentState)
  const [postcode, setPostcode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSubmit({
      streetAddress,
      city,
      state,
      postcode,
    })
  }

  return (
    <div className="bg-white shadow rounded-lg p-6">
      <div className="mb-6">
        <h3 className="text-xl font-bold text-gray-900 mb-2">Business Address Required</h3>
        <p className="text-sm text-gray-600">
          Australian phone numbers require a registered business address for regulatory compliance.
          This information is required by Twilio and will be kept secure.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="business-name" className="block text-sm font-medium text-gray-700 mb-1">
            Business Name
          </label>
          <input
            type="text"
            id="business-name"
            value={businessName}
            disabled
            className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
          />
        </div>

        <div>
          <label htmlFor="street-address" className="block text-sm font-medium text-gray-700 mb-1">
            Street Address *
          </label>
          <input
            type="text"
            id="street-address"
            required
            value={streetAddress}
            onChange={(e) => setStreetAddress(e.target.value)}
            placeholder="123 Main Street"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              id="city"
              required
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Sydney"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
              Postcode *
            </label>
            <input
              type="text"
              id="postcode"
              required
              value={postcode}
              onChange={(e) => setPostcode(e.target.value)}
              placeholder="2000"
              pattern="[0-9]{4}"
              maxLength={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-1">
            State *
          </label>
          <select
            id="state"
            required
            value={state}
            onChange={(e) => setState(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select state</option>
            {australianStates.map((s) => (
              <option key={s.code} value={s.code}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
          <p className="text-sm text-blue-800">
            <strong>Privacy:</strong> This address is only used for Twilio regulatory compliance and
            is not shared publicly.
          </p>
        </div>

        <div className="flex gap-3 pt-4">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
          >
            {loading ? 'Saving...' : 'Continue to Provisioning'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  )
}
