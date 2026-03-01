import Link from 'next/link'
import { Button } from '@ace/ui'

export default function ContractAnalysisPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link
              href="/dashboard"
              className="text-xl font-semibold text-blue-600 hover:text-blue-700"
            >
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Contract Analysis</h1>
          <p className="text-gray-600">AI-powered contract review and risk assessment</p>
        </div>

        <div className="bg-white rounded-lg shadow p-8">
          <h2 className="text-2xl font-semibold mb-6">Upload Contract for Analysis</h2>

          <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center mb-6">
            <svg
              className="mx-auto h-12 w-12 text-gray-400 mb-4"
              stroke="currentColor"
              fill="none"
              viewBox="0 0 48 48"
              aria-hidden="true"
            >
              <path
                d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <p className="text-gray-600 mb-2">Drag and drop your contract here, or</p>
            <Button>Select File</Button>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Recent Analyses</h3>
            <div className="border rounded-lg p-4">
              <p className="text-gray-500 text-center">No contracts analyzed yet</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
