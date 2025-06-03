import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

// Pages that don't require authentication
const publicPages = ["/login", "/register", "/"];

// Pages that require authentication but not email verification
const authOnlyPages = ["/verify-email"];

// Pages that require email verification but not onboarding
const verifiedOnlyPages = ["/onboarding"];

// API routes that are allowed during onboarding
const onboardingApiRoutes = [
  "/api/billing/create-setup-intent",
  "/api/billing/calculate-proration",
  "/api/billing/payment-methods",
  "/api/billing/confirm-subscription",
  "/api/onboarding",
];

// Very simple middleware implementation
export default withAuth(
  async function middleware(req) {
    const token = await getToken({ req });
    const isAuth = Boolean(token);
    const pathname = req.nextUrl.pathname;

    // Public pages
    if (publicPages.includes(pathname)) {
      return null;
    }

    // If not authenticated, redirect to login
    if (!isAuth) {
      let from = pathname;
      if (req.nextUrl.search) {
        from += req.nextUrl.search;
      }
      return NextResponse.redirect(
        new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
      );
    }

    // For authenticated users, check email verification and onboarding status
    if (isAuth && token) {
      // Get status from token (set in auth.ts JWT callback)
      const emailVerified = token.emailVerified as boolean ?? false;
      const onboardingCompleted = token.onboardingCompleted as boolean ?? false;

      // Check if this is an API route allowed during onboarding
      const isOnboardingApi = onboardingApiRoutes.some(route => pathname.startsWith(route));

      // Check if trying to access dashboard or protected routes
      const isProtectedRoute = pathname.startsWith("/dashboard") || 
                             (pathname.startsWith("/api/") && 
                             !pathname.startsWith("/api/auth/") &&
                             !isOnboardingApi);

      // If user is on login page but authenticated, redirect based on their status
      if (pathname === "/login") {
        if (!emailVerified) {
          return NextResponse.redirect(new URL("/verify-email", req.url));
        } else if (!onboardingCompleted) {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        } else {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }

      // Email not verified - redirect to verify-email for all pages except verify-email itself
      if (!emailVerified && pathname !== "/verify-email") {
        return NextResponse.redirect(new URL("/verify-email", req.url));
      }

      // Email verified but onboarding not completed
      if (emailVerified && !onboardingCompleted) {
        if (pathname === "/verify-email") {
          // If email is verified but they're on verify-email page, redirect to onboarding
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
        if (isProtectedRoute && pathname !== "/onboarding") {
          return NextResponse.redirect(new URL("/onboarding", req.url));
        }
      }

      // Redirect to dashboard if trying to access auth pages when already verified/onboarded
      if (emailVerified && onboardingCompleted) {
        if (pathname === "/verify-email" || pathname === "/onboarding") {
          return NextResponse.redirect(new URL("/dashboard", req.url));
        }
      }
    }

    return null;
  },
  {
    callbacks: {
      authorized: ({ token }) => true, // We handle auth in the middleware function
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Update matcher to include all routes
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/login",
    "/register", 
    "/verify-email",
    "/onboarding",
    "/api/:path*",
  ],
};