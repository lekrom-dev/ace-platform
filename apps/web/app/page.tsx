import { Button } from '@ace/ui';
import { engineVersion } from '@ace/engine-sdk';
import { dbVersion } from '@ace/db';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-8">Welcome to ACE Platform</h1>
      <div className="mb-4">
        <p>Engine SDK Version: {engineVersion}</p>
        <p>DB Version: {dbVersion}</p>
      </div>
      <Button onClick={() => console.log('Button clicked!')}>
        Get Started
      </Button>
    </main>
  );
}
