"use client";

import { useState, useEffect } from 'react';
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import LoadingDots from "@/components/loading-dots";
import { Input } from '@/components/Input';
import { Button } from '@/components/Button';
import { Label } from '@/components/Label';

// Create a client-only component
const ClientOnlyForm = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [SparklesIcon, setSparklesIcon] = useState(null);

  // Load icons only on client side
  useEffect(() => {
    const loadIcons = async () => {
      const { Icons } = await import('@/components/icons');
      setSparklesIcon(() => Icons.sparkles);
    };
    loadIcons();
  }, []);

  // Check for auth token on mount and after email verification
  useEffect(() => {
    const checkAuth = async () => {
      const authToken = Cookies.get('auth_token');
      if (authToken) {
        try {
          const result = await signIn('credentials', {
            redirect: false,
            callbackUrl: searchParams?.get("from") || "/dashboard",
            didToken: authToken,
          });

          if (result?.error) {
            console.error('Auth error:', result.error);
            setError('Authentication failed. Please try again.');
            Cookies.remove('auth_token');
          } else {
            router.push(searchParams?.get("from") || "/dashboard");
          }
        } catch (error) {
          console.error('Auth check error:', error);
          setError('Authentication failed. Please try again.');
          Cookies.remove('auth_token');
        }
      }
    };

    checkAuth();
  }, [router, searchParams]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Dynamically import magic to ensure it only loads on the client
      const { magic } = await import('@/lib/magic');
      
      if (!magic) {
        throw new Error('Magic SDK not initialized');
      }

      await magic.auth.loginWithMagicLink({ 
        email,
        redirectURI: `${window.location.origin}/api/auth/callback/magic`,
        showUI: true,
      });
      
      // Show success message
      alert('Please check your email for the magic link. Click the link to complete your login.');
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // If already authenticated, redirect to dashboard
  if (status === 'authenticated') {
    router.push(searchParams?.get("from") || "/dashboard");
    return null;
  }

  return (
    <form onSubmit={handleLogin} className="flex flex-col space-y-4">
      <div className="space-y-4">
        {error && (
          <div className="text-red-500 text-sm">
            {error}
          </div>
        )}
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
  