"use client";

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import LoadingDots from "@/components/loading-dots";
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';

// Create a client-only component
const ClientOnlyForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const searchParams = useSearchParams();
  const [SparklesIcon, setSparklesIcon] = useState(null);

  // Load icons only on client side
  useEffect(() => {
    const loadIcons = async () => {
      const { Icons } = await import('@/components/icons');
      setSparklesIcon(() => Icons.sparkles);
    };
    loadIcons();
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { magic } = await import('@/lib/magic');
      
      // First, show the email sent message
      setEmailSent(true);
      
      // Configure Magic link with proper callback
      await magic.auth.loginWithMagicLink({
        email,
        showUI: true, // Show Magic's UI for better user experience
        redirectURI: `${window.location.origin}/api/auth/callback/magic`
      });

      // The user will be redirected to the callback URL after clicking the magic link
      // The callback will handle the authentication with NextAuth
    } catch (error) {
      console.error('Login failed:', error);
      setError('Authentication failed. Please try again.');
      setEmailSent(false);
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <div className="flex flex-col items-center space-y-4 p-6 text-center">
        <h2 className="text-xl font-semibold">Check your email</h2>
        <p className="text-gray-600">
          We've sent a magic link to {email}.<br />
          Click the link in the email to sign in.
        </p>
        <p className="text-sm text-gray-500">
          The email might take a few minutes to arrive.<br />
          Remember to check your spam folder.
        </p>
        <Button
          onClick={() => {
            setEmailSent(false);
            setEmail('');
          }}
          variant="secondary"
          className="mt-4"
        >
          Use a different email
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col space-y-4">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label
            htmlFor="email"
            className="text-sm font-medium text-gray-900 dark:text-gray-50"
          >
            Email
          </Label>
          <Input
            type="email"
            id="email"
            name="email"
            autoComplete="email"
            placeholder="john@company.com"
            className="mt-2"
            required
            aria-required="true"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-500 mt-1">{error}</p>
          )}
        </div>
        <Button
          type="submit"
          disabled={loading}
          variant="primary"
          className="flex items-center justify-center text-white p-2 w-full"
        >
          {loading ? (
            <LoadingDots color="#808080" />
          ) : (
            <>
              {SparklesIcon && (
                <SparklesIcon className="mr-2 h-4 w-4" aria-hidden="true" />
              )}
              Send Magic Link
            </>
          )}
        </Button>
      </div>
    </form>
  );
};

// Main component that handles client-side rendering
export default function MagicLoginForm() {
  const [isMounted, setIsMounted] = useState(false);
  
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Show a simple loading placeholder during SSR and initial render
  if (!isMounted) {
    return (
      <div className="flex flex-col space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="text-sm font-medium text-gray-900 dark:text-gray-50">
              Email
            </div>
            <div className="h-10 bg-gray-100 dark:bg-gray-800 rounded-md mt-2" />
          </div>
          <div className="h-10 bg-primary rounded-md flex items-center justify-center text-white p-2 w-full">
            <span>Loading form...</span>
          </div>
        </div>
      </div>
    );
  }

  return <ClientOnlyForm />;
}
  