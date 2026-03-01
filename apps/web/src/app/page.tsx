import Link from 'next/link';
import { Button } from '@ace/ui';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto text-center">
        <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          ACE Platform
        </h1>
        <p className="text-xl text-gray-600 mb-12">
          Advanced Contract Engine & Tradie Management System
        </p>

        <div className="flex gap-4 justify-center mb-16">
          <Link href="/login">
            <Button>Login</Button>
          </Link>
          <Link href="/signup">
            <Button>Sign Up</Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Contract Analysis</h3>
            <p className="text-gray-600">AI-powered contract review and analysis</p>
          </div>
          <div className="p-6 bg-white rounded-lg shadow-md">
            <h3 className="text-xl font-semibold mb-2">Tradie Receptionist</h3>
            <p className="text-gray-600">Automated scheduling and customer management</p>
          </div>
        </div>
      </div>
    </main>
  );
}
