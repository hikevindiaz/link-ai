import { Analytics } from '@vercel/analytics/react';
import "@/styles/globals.css";
import "@/styles/chat-interface.css";
import localFont from "next/font/local";

import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from '@next/third-parties/google';
import { AOSInit } from '@/components/aos-init';
import { TooltipProvider } from '@/components/ui/tooltip';
import { constructMetadata } from '@/lib/construct-metadata';

import { SessionWrapper } from "@/components/providers/SessionWrapper";  // ✅ Import the wrapper

const fontHeading = localFont({
  src: "../assets/fonts/CalSans-SemiBold.woff2",
  variable: "--font-heading",
});

const geistFont = localFont({
  src: [
    {
      path: '../public/fonts/Geist-VariableFont_wght.ttf',
      weight: '100 900',
      style: 'normal',
    }
  ],
  variable: '--font-geist',
});

const geistMonoFont = localFont({
  src: [
    {
      path: '../public/fonts/geist-mono.woff2',
      weight: '100 900',
      style: 'normal',
    }
  ],
  variable: '--font-geist-mono',
});

export const metadata = constructMetadata();

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistFont.variable} ${geistMonoFont.variable}`}>
      <AOSInit />
      <body
        id='root'
        className={cn(
          "min-h-screen w-full bg-white font-sans antialiased",
          geistFont.variable,
          fontHeading.variable
        )}
      >
        {/* ✅ Wrap with SessionWrapper */}
        <SessionWrapper>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              {children}
              <Toaster />
              {process.env.VERCEL_ENV === "production" ? <Analytics /> : null}
            </TooltipProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
      <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_ID || ''} />
    </html>
  );
}
