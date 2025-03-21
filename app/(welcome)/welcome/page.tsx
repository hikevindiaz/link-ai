'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';

export default function WelcomePage() {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    // If the user is authenticated, redirect to dashboard
    // This ensures we don't need this page anymore, as we're using the modal
    if (status !== 'loading') {
      router.push('/dashboard');
    }
  }, [status, router]);

  // Show a simple loading state while redirecting
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-950">
      <p className="text-gray-500 dark:text-gray-400">Redirecting to dashboard...</p>
    </div>
  );
}