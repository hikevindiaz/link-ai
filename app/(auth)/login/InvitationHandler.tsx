'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { RiUserAddLine, RiCheckLine, RiErrorWarningLine, RiLoader2Fill } from '@remixicon/react';
import { Button } from '@/components/Button';
import { Card } from '@/components/ui/card';
import Link from 'next/link';

interface InvitationData {
  email: string;
  role: string;
  invitedByName?: string;
  expiresAt: string;
}

interface InvitationHandlerProps {
  token: string;
}

export default function InvitationHandler({ token }: InvitationHandlerProps) {
  const router = useRouter();
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Validate and display invitation details on component mount
  useEffect(() => {
    const validateInvitation = async () => {
      try {
        const response = await fetch(`/api/invitations/accept?token=${token}`, {
          method: 'GET'
        });
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || 'Invalid invitation');
        }

        setInvitation(data.invitation);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to validate invitation');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      validateInvitation();
    } else {
      setError('Invalid invitation link. No token provided.');
      setLoading(false);
    }
  }, [token]);

  const handleAcceptInvitation = async () => {
    if (!token) return;

    setAccepting(true);
    setError(null);

    try {
      const response = await fetch('/api/invitations/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to accept invitation');
      }

      setSuccess(true);
      
      // Show success message briefly, then redirect to normal login
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to accept invitation');
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <RiLoader2Fill className="size-8 text-indigo-600 dark:text-indigo-400 animate-spin mb-4" />
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Validating invitation...
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            Please wait while we verify your invitation.
          </p>
        </div>
      </Card>
    );
  }

  if (success) {
    return (
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="size-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-6">
            <RiCheckLine className="size-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Welcome to Link AI!
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            Your invitation has been accepted successfully. You can now sign in to complete your profile setup.
          </p>
          <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400 mb-4">
            <RiLoader2Fill className="size-4 animate-spin" />
            Redirecting to sign in...
          </div>
          <Button
            onClick={() => router.push('/login')}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
          >
            Continue to Sign In
          </Button>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="w-full max-w-md p-8">
        <div className="flex flex-col items-center text-center">
          <div className="size-16 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-6">
            <RiErrorWarningLine className="size-8 text-red-600 dark:text-red-400" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
            Invalid Invitation
          </h1>
          <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
            {error}
          </p>
          <Link href="/login">
            <Button variant="secondary" className="w-full">
              Go to Sign In
            </Button>
          </Link>
        </div>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md p-8">
      <div className="flex flex-col items-center text-center">
        <div className="size-16 bg-indigo-100 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
          <RiUserAddLine className="size-8 text-indigo-600 dark:text-indigo-400" />
        </div>
        
        <h1 className="text-xl font-semibold text-neutral-900 dark:text-neutral-50 mb-2">
          You're invited to Link AI!
        </h1>
        
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mb-6">
          {invitation?.invitedByName && (
            <>
              <strong>{invitation.invitedByName}</strong> has invited you to join Link AI
            </>
          )}
          {!invitation?.invitedByName && 'You have been invited to join Link AI'}
          {invitation && ` as a ${invitation.role.toLowerCase()}.`}
        </p>

        {invitation && (
          <div className="w-full space-y-4 mb-6">
            <div className="bg-neutral-50 dark:bg-neutral-800 rounded-lg p-4 text-left">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Email:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-50">
                    {invitation.email}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Role:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-50">
                    {invitation.role === 'ADMIN' ? 'Administrator' : 'User'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-neutral-600 dark:text-neutral-400">Expires:</span>
                  <span className="font-medium text-neutral-900 dark:text-neutral-50">
                    {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="w-full space-y-3">
          <Button
            onClick={handleAcceptInvitation}
            className="w-full bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-700"
            isLoading={accepting}
            loadingText="Accepting invitation..."
            disabled={accepting}
          >
            Accept Invitation
          </Button>
          
          <Link href="/login" className="block">
            <Button variant="secondary" className="w-full">
              I already have an account
            </Button>
          </Link>
        </div>

        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-6 text-center">
          By accepting this invitation, you agree to Link AI's{' '}
          <Link href="/docs/legal/terms" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Terms of Service
          </Link>{' '}
          and{' '}
          <Link href="/docs/legal/privacy" className="text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </Card>
  );
} 