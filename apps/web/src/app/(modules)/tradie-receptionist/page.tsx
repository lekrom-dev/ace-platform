import Link from 'next/link';
import { Button } from '@ace/ui';

export default function TradieReceptionistPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-xl font-semibold text-blue-600 hover:text-blue-700">
              ← Back to Dashboard
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Tradie Receptionist</h1>
          <p className="text-gray-600">Automated scheduling and customer management system</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Today's Appointments</h2>
                <Button>New Appointment</Button>
              </div>

              <div className="space-y-3">
                <div className="border-l-4 border-blue-600 bg-blue-50 p-4 rounded">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">9:00 AM - Kitchen Renovation</p>
                      <p className="text-sm text-gray-600">Client: John Smith</p>
                    </div>
                    <span className="text-sm text-blue-600 font-medium">Confirmed</span>
                  </div>
                </div>

                <div className="border-l-4 border-green-600 bg-green-50 p-4 rounded">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">1:30 PM - Bathroom Repair</p>
                      <p className="text-sm text-gray-600">Client: Sarah Johnson</p>
                    </div>
                    <span className="text-sm text-green-600 font-medium">In Progress</span>
                  </div>
                </div>

                <div className="border-l-4 border-orange-600 bg-orange-50 p-4 rounded">
                  <div className="flex justify-between">
                    <div>
                      <p className="font-semibold">4:00 PM - Deck Installation</p>
                      <p className="text-sm text-gray-600">Client: Mike Brown</p>
                    </div>
                    <span className="text-sm text-orange-600 font-medium">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-4">Quick Stats</h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600">Today's Appointments</p>
                  <p className="text-2xl font-bold">5</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Pending Requests</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Active Customers</p>
                  <p className="text-2xl font-bold">48</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
