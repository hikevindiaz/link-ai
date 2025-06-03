import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Pages that don't require authentication
const publicPages = ["/login", "/register"];

// API routes that are allowed during onboarding
const onboardingApiRoutes = [
  "/api/billing/create-setup-intent",
  "/api/billing/calculate-proration",
  "/api/billing/payment-methods",
  "/api/billing/confirm-subscription",
  "/api/onboarding",
];

export async function middleware(req: NextRequest) {
  const token = await getToken({ req });
  const pathname = req.nextUrl.pathname;
  
  // Debug logging for production
  if (process.env.NODE_ENV === 'production') {
    console.log('[Middleware] Request:', {
      pathname,
      hasToken: !!token,
      tokenData: token ? {
        email: token.email,
        emailVerified: token.emailVerified,
        onboardingCompleted: token.onboardingCompleted
      } : null,
      cookies: req.cookies.getAll().map(c => ({ name: c.name, hasValue: !!c.value })),
      nextAuthUrl: process.env.NEXTAUTH_URL,
      hasSecret: !!process.env.NEXTAUTH_SECRET,
      nodeEnv: process.env.NODE_ENV
    });
  }
  
  // Allow public pages
  if (publicPages.includes(pathname)) {
    // If authenticated user tries to access login, redirect them appropriately
    if (pathname === "/login" && token) {
      const emailVerified = token.emailVerified as boolean ?? false;
      const onboardingCompleted = token.onboardingCompleted as boolean ?? false;
      
      if (!emailVerified) {
        return NextResponse.redirect(new URL("/verify-email", req.url));
      } else if (!onboardingCompleted) {
        return NextResponse.redirect(new URL("/onboarding", req.url));
      } else {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
    }
    return NextResponse.next();
  }
  
  // Allow auth API routes
  if (pathname.startsWith("/api/auth/")) {
    return NextResponse.next();
  }
  
  // Check if user is authenticated
  if (!token) {
    // Not authenticated - redirect to login
    let from = pathname;
    if (req.nextUrl.search) {
      from += req.nextUrl.search;
    }
    return NextResponse.redirect(
      new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
    );
  }
  
  // User is authenticated - check email verification and onboarding
  const emailVerified = token.emailVerified as boolean ?? false;
  const onboardingCompleted = token.onboardingCompleted as boolean ?? false;
  
  // Allow onboarding API routes during onboarding
  if (onboardingApiRoutes.some(route => pathname.startsWith(route))) {
    return NextResponse.next();
  }
  
  // Handle email verification flow
  if (!emailVerified) {
    if (pathname === "/verify-email") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/verify-email", req.url));
  }
  
  // Handle onboarding flow
  if (!onboardingCompleted) {
    // If email is verified but on verify-email page, redirect to onboarding
    if (pathname === "/verify-email") {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    // Allow onboarding page
    if (pathname === "/onboarding") {
      return NextResponse.next();
    }
    // Redirect everything else to onboarding
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  
  // User is fully authenticated and onboarded
  if (pathname === "/verify-email" || pathname === "/onboarding") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }
  
  return NextResponse.next();
}

// Update matcher to include all routes except static files
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};