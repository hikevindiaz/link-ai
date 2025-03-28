'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/Button';
import { Divider } from '../../../components/Divider';
import MagicLoginForm from '../../../components/magic-login-form';
import { signIn } from 'next-auth/react';
import { useTheme } from 'next-themes';
import { cn } from "../../../lib/utils";
import { Card } from '../../../components/ui/card';

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

const LoginForm = () => {
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
                <div className="h-20 bg-gray-100 rounded-md"></div>
              </div>
              <div className="my-4">
                <Divider>or</Divider>
              </div>
              <div className="my-4">
                <div className="h-10 bg-gray-100 rounded-md w-full"></div>
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
      'bg-gray-950': resolvedTheme === 'dark'
    })}>
      <div className="absolute left-4 top-4 md:left-8 md:top-8 flex gap-2">
        <a href="https://www.getlinkai.com/">
          <Button variant="secondary" className="flex items-center">
            {icons?.chevronLeft && (
              <icons.chevronLeft className="h-4 w-4" aria-hidden="true" />
            )}
          </Button>
        </a>
        <Button variant="secondary" className="flex items-center" onClick={toggleTheme}>
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
                  <h2 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-50">
                    Welcome to Link AI
                  </h2>
                  <p className="text-sm text-gray-700 dark:text-gray-400 pb-6">
                    Enter your credentials to login or sign up
                  </p>
                </div>
              </div>
            </AnimatedElement>

            <AnimatedElement index={1}>
              <MagicLoginForm />
            </AnimatedElement>

            <AnimatedElement index={2}>
              <Divider>or</Divider>
            </AnimatedElement>

            <AnimatedElement index={3}>
              <Button className="w-full" variant="secondary" onClick={handleGoogleLogin}>
                <span className="inline-flex items-center gap-2">
                  {icons?.googleIcon && (
                    <icons.googleIcon className="size-4" aria-hidden="true" />
                  )}
                  Login with Google
                </span>
              </Button>
            </AnimatedElement>

            <AnimatedElement index={4}>
              <div className="mt-4">
                <p className="text-xs text-gray-700 dark:text-gray-400">
                  By signing in, you agree to our{' '}
                  <a
                    href="https://www.getlinkai.com/legal"
                    className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-500 hover:dark:text-indigo-600"
                  >
                    Terms of Service
                  </a>{' '}
                  and{' '}
                  <a
                    href="https://www.getlinkai.com/legal"
                    className="text-indigo-500 hover:text-indigo-600 dark:text-indigo-500 hover:dark:text-indigo-600"
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
        <Card className="relative w-full max-w-[650px] aspect-square overflow-hidden bg-gray-950 shadow-lg rounded-2xl p-0">
          <img 
            src="/LINK LOGIN.png" 
            alt="Link AI Login Animation"
            className="w-full h-full object-cover"
          />
        </Card>
      </aside>
    </div>
  );
};

export default LoginForm;