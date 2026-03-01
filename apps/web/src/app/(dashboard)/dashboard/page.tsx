import Link from 'next/link'
import { engineVersion } from '@ace/engine-sdk'
import { dbVersion } from '@ace/db'

export default function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <h1 className="text-xl font-semibold">ACE Dashboard</h1>
            <div className="flex gap-4">
              <Link href="/contract-analysis" className="text-gray-600 hover:text-gray-900">
                Contract Analysis
              </Link>
              <Link href="/tradie-receptionist" className="text-gray-600 hover:text-gray-900">
                Tradie Receptionist
              </Link>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold mb-2">Welcome to your Dashboard</h2>
          <p className="text-gray-600">Protected route - user authenticated</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Active Contracts</h3>
            <p className="text-3xl font-bold text-blue-600">24</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Pending Reviews</h3>
            <p className="text-3xl font-bold text-orange-600">8</p>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-2">Appointments Today</h3>
            <p className="text-3xl font-bold text-green-600">5</p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">System Information</h3>
          <div className="space-y-2 text-sm">
            <p>
              <span className="font-medium">Engine SDK:</span> v{engineVersion}
            </p>
            <p>
              <span className="font-medium">Database:</span> v{dbVersion}
            </p>
            <p>
              <span className="font-medium">Status:</span>{' '}
              <span className="text-green-600">All systems operational</span>
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
