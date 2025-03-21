import { getToken } from "next-auth/jwt";
import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
// Add runtime declaration to ensure Node.js runtime
export const runtime = 'nodejs';

// Very simple middleware implementation
export default withAuth(
  async function middleware(req) {
    const token = await getToken({ req });
    const isAuth = Boolean(token);
    
    // Get pathname
    const { pathname } = req.nextUrl;
    
    // Simple redirect logic:
    // 1. If authenticated and on login page, redirect to dashboard
    if (isAuth && pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // 2. For all other cases, let NextAuth handle it
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Update matcher to exclude ALL API routes, not just auth ones
export const config = {
  matcher: [
    /*
     * Match only these paths:
     * - /login (sign-in page)
     * - /welcome (onboarding page)
     * - /dashboard (dashboard routes)
     */
    '/login',
    '/dashboard/:path*',
    '/welcome'
  ],
};