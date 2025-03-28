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
  const [statusChecking, setStatusChecking] = useState(false);
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [SparklesIcon, setSparklesIcon] = useState(null);
  const [magic, setMagic] = useState(null);

  // Load icons only on client side
  useEffect(() => {
    const loadIcons = async () => {
      const { Icons } = await import('@/components/icons');
      setSparklesIcon(() => Icons.sparkles);
    };
    loadIcons();
  }, []);

  // Initialize Magic
  useEffect(() => {
    const initMagic = async () => {
      const { magic } = await import('@/lib/magic');
      setMagic(magic);
    };
    initMagic();
  }, []);

  // If already authenticated, redirect to dashboard
  useEffect(() => {
    if (status === 'authenticated') {
      router.push(searchParams?.get("from") || "/dashboard");
    }
  }, [router, searchParams, status]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (!magic) {
        throw new Error('Magic SDK not initialized');
      }

      // Use Magic SDK to send the user a magic link
      const didToken = await magic.auth.loginWithMagicLink({ 
        email,
        showUI: true,
        redirectURI: `${window.location.origin}/api/auth/callback/magic`
      });
      
      if (didToken) {
        // Store the DID token in a cookie
        Cookies.set('auth_token', didToken, { expires: 1 });
        
        // Sign in with NextAuth
        const result = await signIn('credentials', {
          redirect: false,
          didToken,
          callbackUrl: searchParams?.get("from") || "/dashboard",
        });

        if (result?.error) {
          setError('Authentication failed. Please try again.');
          Cookies.remove('auth_token');
        } else {
          router.push(searchParams?.get("from") || "/dashboard");
        }
      }
    } catch (error) {
      console.error('Login failed:', error);
      setError(error.message || 'Failed to send magic link. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
  