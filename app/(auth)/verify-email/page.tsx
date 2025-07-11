'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { Button } from '@/components/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { RiMailLine, RiRefreshLine, RiCheckLine, RiErrorWarningLine, RiLogoutBoxLine } from '@remixicon/react';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();
  }, []);

  useEffect(() => {
    // If not authenticated, redirect to login
    if (status === 'unauthenticated') {
      router.push('/login');
    }
    
    // Check if email is already verified
    if (status === 'authenticated' && session?.user?.emailVerified) {
      // Redirect based on onboarding status
      if (session.user.onboardingCompleted) {
        router.push('/dashboard');
      } else {
        router.push('/onboarding');
      }
    }
  }, [status, session, router]);

  const handleCodeChange = (index: number, value: string) => {
    // Clear any existing message
    setMessage(null);
    
    // Only allow digits
    if (value && !/^\d$/.test(value)) return;

    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);
    const digits = pastedData.split('').filter(char => /^\d$/.test(char));
    
    const newCode = [...code];
    digits.forEach((digit, i) => {
      if (i < 6) newCode[i] = digit;
    });
    setCode(newCode);

    // Focus the next empty input or the last one
    const nextEmptyIndex = newCode.findIndex(digit => digit === '');
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    inputRefs.current[focusIndex]?.focus();

    // Auto-submit if complete
    if (newCode.every(digit => digit !== '')) {
      handleVerify(newCode.join(''));
    }
  };

  const handleVerify = async (verificationCode: string) => {
    setIsVerifying(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/auth/verify-email/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: verificationCode }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Email verified successfully! Redirecting...' });
        
        // Update the session to reflect the new email verification status
        await update();
        
        // Force a page refresh to ensure JWT token is updated
        setTimeout(() => {
          window.location.href = '/onboarding';
        }, 1500);
      } else {
        // Handle specific error messages
        if (data.error === 'Email already verified') {
          setMessage({ type: 'success', text: 'Your email is already verified! Redirecting...' });
          
          // Update session to ensure we have the latest data
          await update();
          
          setTimeout(() => {
            if (session?.user?.onboardingCompleted) {
              window.location.href = '/dashboard';
            } else {
              window.location.href = '/onboarding';
            }
          }, 1500);
        } else if (data.error === 'Invalid verification code') {
          setMessage({ type: 'error', text: 'The code you entered is incorrect. Please try again.' });
          // Clear the code on error
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        } else if (data.error === 'Verification code has expired. Please request a new one.') {
          setMessage({ type: 'error', text: 'This code has expired. Please request a new one.' });
          // Clear the code on error
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        } else {
          setMessage({ type: 'error', text: data.error || 'Failed to verify code. Please try again.' });
          // Clear the code on error
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        }
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Something went wrong. Please try again.' });
      // Clear the code on error
      setCode(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendCode = async () => {
    setIsSending(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'A new verification code has been sent to your email.' });
        // Clear the code inputs
        setCode(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to send verification code. Please try again.' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to send verification code. Please try again.' });
    } finally {
      setIsSending(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-neutral-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black p-4 relative">
      {/* Sign out button - absolute positioned */}
      <Button
        variant="secondary"
        size="sm"
        onClick={() => signOut({ callbackUrl: '/login' })}
        className="absolute top-4 right-4 flex items-center gap-2"
      >
        <RiLogoutBoxLine className="h-4 w-4" />
        <span className="hidden sm:inline">Sign out</span>
      </Button>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-neutral-100 dark:bg-neutral-800 rounded-full mb-4">
            <RiMailLine className="w-8 h-8 text-neutral-600 dark:text-neutral-400" />
          </div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-50">
            Verify your email
          </h1>
          <p className="mt-2 text-neutral-600 dark:text-neutral-400">
            We sent a 6-digit code to <strong>{session?.user?.email}</strong>
          </p>
          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-500">
            Make sure to check your spam folder 😉
          </p>
        </div>

        {/* Code Input */}
        <div className="bg-white dark:bg-neutral-900 rounded-xl shadow-lg p-8 border border-neutral-200 dark:border-neutral-800">
          {/* Message Display */}
          <AnimatePresence mode="wait">
            {message && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`mb-6 p-4 rounded-xl flex items-start gap-3 ${
                  message.type === 'success' 
                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200 border border-green-200 dark:border-green-800' 
                    : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200 border border-red-200 dark:border-red-800'
                }`}
              >
                {message.type === 'success' ? (
                  <RiCheckLine className="w-5 h-5 flex-shrink-0 mt-0.5" />
                ) : (
                  <RiErrorWarningLine className="w-5 h-5 flex-shrink-0 mt-0.5" />
                )}
                <span className="text-sm font-medium">{message.text}</span>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center gap-2 mb-6">
            {code.map((digit, index) => (
              <input
                key={index}
                ref={(el) => {
                  if (inputRefs.current) {
                    inputRefs.current[index] = el;
                  }
                }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleCodeChange(index, e.target.value)}
                onKeyDown={(e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`
                  w-12 h-14 text-center text-xl font-semibold
                  border-2 rounded-xl transition-all
                  ${digit ? 'border-neutral-400 bg-neutral-50 dark:bg-neutral-800 dark:border-neutral-600' : 'border-neutral-300 dark:border-neutral-700'}
                  focus:border-neutral-400 focus:outline-none focus:ring-2 focus:ring-neutral-400/20 dark:focus:ring-neutral-600/20
                  dark:bg-neutral-800 dark:text-neutral-50
                  disabled:opacity-50 disabled:cursor-not-allowed
                `}
                disabled={isVerifying}
              />
            ))}
          </div>

          {/* Resend Code */}
          <div className="text-center">
            <button
              onClick={handleResendCode}
              disabled={isSending || isVerifying}
              className="inline-flex items-center gap-2 text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors underline underline-offset-4"
            >
              <RiRefreshLine className={`w-4 h-4 ${isSending ? 'animate-spin' : ''}`} />
              {isSending ? 'Sending...' : 'Resend code'}
            </button>
          </div>
        </div>

        {/* Manual Submit Button (optional, since we auto-submit) */}
        {code.every(digit => digit !== '') && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-4"
          >
            <Button
              onClick={() => handleVerify(code.join(''))}
              disabled={isVerifying}
              className="w-full"
            >
              {isVerifying ? 'Verifying...' : 'Verify Email'}
            </Button>
          </motion.div>
        )}

        {/* Help Text */}
        <p className="text-center text-sm text-neutral-500 dark:text-neutral-500 mt-6">
          Having trouble? Contact{' '}
          <a href="mailto:support@getlinkai.com" className="text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300 underline underline-offset-4">
            support@getlinkai.com
          </a>
        </p>
      </motion.div>
    </div>
  );
} 