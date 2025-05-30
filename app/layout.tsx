import { Analytics } from '@vercel/analytics/react';
import "@/styles/globals.css";
import "@/styles/chat-interface.css";
import localFont from "next/font/local";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "remixicon/fonts/remixicon.css";

import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { GoogleAnalytics } from '@next/third-parties/google';
import { AOSInit } from '@/components/aos-init';
import { TooltipProvider } from '@/components/ui/tooltip';
import { constructMetadata } from '@/lib/construct-metadata';
import { SpeedInsights } from "@vercel/speed-insights/next"
import { disableDebugLogging, enableProductionLogging, applyLogFilters } from "@/lib/log-config";

import { SessionWrapper } from "@/components/providers/SessionWrapper";  // ✅ Import the wrapper

// Configure logging based on environment
if (process.env.NODE_ENV === 'production') {
  enableProductionLogging();
} else {
  // In development, apply filters for noisy logs
  applyLogFilters();
}

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

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Link AI",
  description: "Human First, AI Powered",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${geistFont.variable} ${geistMonoFont.variable}`}>
      <head>
        {/* Removed Remix Icon CDN Link */}
      </head>
      <AOSInit />
      <body
        id='root'
        className={cn(
          "min-h-screen w-full bg-white font-sans antialiased",
          geistFont.variable,
          fontHeading.variable
        )}
      >
        <SessionWrapper>
          <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
            <TooltipProvider>
              {children}
              <Toaster />
              {process.env.VERCEL_ENV === "production" ? <Analytics /> : null}
              <SpeedInsights/>
            </TooltipProvider>
          </ThemeProvider>
        </SessionWrapper>
      </body>
      <GoogleAnalytics gaId={process.env.GOOGLE_ANALYTICS_ID || ''} />
    </html>
  );
}
