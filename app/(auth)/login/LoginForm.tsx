'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Divider } from '../../../components/Divider';
import MagicLoginForm from '../../../components/magic-login-form';
import { signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { cn } from "../../../lib/utils";

// Define the fade-in animation style
const fadeInStyle = {
  '@keyframes fadeInUp': {
    '0%': {
      opacity: 0,
      transform: 'translateY(10px)'
    },
    '100%': {
      opacity: 1,
      transform: 'translateY(0)'
    }
  },
  animation: 'fadeInUp 0.8s ease-out forwards'
};

const AnimatedElement = ({
  children,
  index,
  styles,
}: {
  children: React.ReactNode;
  index: number;
  styles?: React.CSSProperties;
}) => (
  <div
    style={{
      animation: 'slideUpFade 300ms ease-in-out backwards',
      animationDelay: `${index * 75}ms`,
      ...styles,
    }}
  >
    {children}
  </div>
);

interface LoginFormProps {
  error?: string;
}

const LoginForm = ({ error }: LoginFormProps) => {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [isMounted, setIsMounted] = useState(false);
  const [icons, setIcons] = useState<{
    chevronLeft: any;
    moon: any;
    sun: any;
    googleIcon: any;
    LinkAIIcon: any;
  } | null>(null);

  // Load all icons on client-side only
  useEffect(() => {
    const loadIcons = async () => {
      const [iconsModule, remixModule, LinkAIIconModule] = await Promise.all([
        import('../../../components/icons'),
        import('@remixicon/react'),
        import('../../../components/LinkAIIcon')
      ]);
      
      setIcons({
        chevronLeft: iconsModule.Icons.chevronLeft,
        moon: iconsModule.Icons.moon,
        sun: iconsModule.Icons.sun,
        googleIcon: remixModule.RiGoogleFill,
        LinkAIIcon: LinkAIIconModule.default
      });
      
      setIsMounted(true);
    };
    
    loadIcons();
  }, []);

  const handleGoogleLogin = () => {
    signIn('google');
  };

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'light' ? 'dark' : 'light');
  };

  // Consistent class for the wrapper to avoid hydration mismatch
  const wrapperClass = "flex min-h-screen w-full relative";

  // Render a simplified version during SSR
  if (!isMounted) {
    return (
      <div className={wrapperClass}>
        <div className="flex-1">
          <div className="flex h-full flex-col items-center justify-center">
            <div className="w-full px-4 sm:max-w-sm sm:px-0">
              <div className="space-y-1">
                <div className="h-10 w-10 pb-3 -ml-2"></div>
                <div>
                  <h2 className="text-xl font-semibold tracking-tight">
                    Welcome to Link AI
                  </h2>
                  <p className="text-sm pb-6">
                    Enter your credentials to login or sign up
                  </p>
                </div>
              </div>
              <div className="my-4">
                <div className="h-20 bg-neutral-100 dark:bg-neutral-800 rounded-xl"></div>
              </div>
              <div className="my-4">
                <Divider>or</Divider>
              </div>
              <div className="my-4">
                <div className="h-10 bg-neutral-100 dark:bg-neutral-800 rounded-xl w-full"></div>
              </div>
              <div className="mt-4">
                <p className="text-xs">
                  By signing in, you agree to our Terms of Service and Privacy Policy.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(wrapperClass, {
      'bg-white': resolvedTheme === 'light',
      'bg-black': resolvedTheme === 'dark'
    })}>
      <div className="absolute left-4 top-4 md:left-8 md:top-8 flex gap-2">
        <a href="https://www.getlinkai.com/">
          <Button variant="secondary" className="flex items-center bg-white dark:bg-black border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900">
            {icons?.chevronLeft && (
              <icons.chevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </a>
        <Button variant="secondary" className="flex items-center bg-white dark:bg-black border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900" onClick={toggleTheme}>
          {resolvedTheme === 'light' ? (
            icons?.moon && <icons.moon className="h-4 w-4" aria-hidden="true" />
          ) : (
            icons?.sun && <icons.sun className="h-4 w-4" aria-hidden="true" />
          )}
        </Button>
      </div>
      <main className="flex-1" style={{ ...fadeInStyle, animationDelay: '100ms' }}>
        <div className="flex h-full flex-col items-center justify-center">
          <div className="w-full px-4 sm:max-w-sm sm:px-0">
            <AnimatedElement index={0}>
              <div className="space-y-1">
                {icons?.LinkAIIcon && (
                  <icons.LinkAIIcon className={`h-10 w-10 pb-3 -ml-2 ${resolvedTheme === 'light' ? 'text-black' : 'text-white'}`} />
                )}
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-50">
                    Welcome to Link AI
                  </h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 pb-6">
                    Enter your credentials to login or sign up
                  </p>
                </div>
              </div>
            </AnimatedElement>

            {error === 'AccountBlocked' && (
              <AnimatedElement index={1}>
                <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <p className="text-sm text-red-800 dark:text-red-200 text-center">
                    Your account has been locked, please contact{' '}
                    <a 
                      href="mailto:hi@getlinkai.com" 
                      className="underline hover:no-underline font-medium"
                    >
                      hi@getlinkai.com
                    </a>{' '}
                    for support.
                  </p>
                </div>
              </AnimatedElement>
            )}

            <AnimatedElement index={error === 'AccountBlocked' ? 2 : 1}>
              <MagicLoginForm />
            </AnimatedElement>

            <AnimatedElement index={error === 'AccountBlocked' ? 3 : 2}>
              <Divider>or</Divider>
            </AnimatedElement>

            <AnimatedElement index={error === 'AccountBlocked' ? 4 : 3}>
              <Button className="w-full bg-white dark:bg-black border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900 text-neutral-900 dark:text-neutral-100" variant="secondary" onClick={handleGoogleLogin}>
                <span className="inline-flex items-center gap-2">
                  {icons?.googleIcon && (
                    <icons.googleIcon className="size-4" aria-hidden="true" />
                  )}
                  Login with Google
                </span>
              </Button>
            </AnimatedElement>

            <AnimatedElement index={error === 'AccountBlocked' ? 5 : 4}>
              <div className="mt-4">
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  By signing in, you agree to our{' '}
                  <a
                    href="https://www.getlinkai.com/legal"
                    className="text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300 underline underline-offset-4"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://www.getlinkai.com/legal"
                    className="text-neutral-900 dark:text-neutral-100 hover:text-neutral-700 dark:hover:text-neutral-300 underline underline-offset-4"
                  >
                    Privacy Policy
                  </a>.
                </p>
              </div>
            </AnimatedElement>
          </div>
        </div>
      </main>
      <aside
        className="hidden flex-1 overflow-hidden p-6 lg:flex items-center justify-center"
        aria-label="Product showcase"
        style={{ ...fadeInStyle, animationDelay: '300ms' }}
      >
        <div className="relative w-full max-w-[650px] aspect-square overflow-hidden bg-neutral-950 dark:bg-neutral-100 shadow-lg rounded-2xl p-0">
          <img
            src="https://ugnyocjdcpdlneirkfiq.supabase.co/storage/v1/object/public/brand-assets/website-images/IMG_2311.png"
            alt="Link AI Login Animation"
            className="w-full h-full object-cover"
          />
        </div>
      </aside>
    </div>
  );
};

export default LoginForm;