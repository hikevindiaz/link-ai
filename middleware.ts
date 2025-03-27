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
    
    // Handle root path
    if (pathname === "/") {
      if (isAuth) {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Handle login page
    if (pathname === "/login") {
      if (isAuth) {
        const from = req.nextUrl.searchParams.get("from") || "/dashboard";
        return NextResponse.redirect(new URL(from, req.url));
      }
      return NextResponse.next();
    }

    // Handle dashboard and protected routes
    if (pathname.startsWith("/dashboard")) {
      if (!isAuth) {
        const from = pathname + req.nextUrl.search;
        return NextResponse.redirect(
          new URL(`/login?from=${encodeURIComponent(from)}`, req.url)
        );
      }
      return NextResponse.next();
    }

    // For all other routes, let NextAuth handle it
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl;
        
        // Allow access to login page
        if (pathname === "/login") {
          return true;
        }

        // Require authentication for dashboard and protected routes
        if (pathname.startsWith("/dashboard")) {
          return !!token;
        }

        // For all other routes, require authentication
        return !!token;
      },
    },
    pages: {
      signIn: "/login",
    },
  }
);

// Update matcher to include all protected routes
export const config = {
  matcher: [
    '/',
    '/login',
    '/dashboard/:path*',
    '/api/:path*'
  ],
};