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
      } else {
        return NextResponse.redirect(new URL("/login", req.url));
      }
    }

    // Handle login page
    if (pathname === "/login" && isAuth) {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    
    // For all other protected routes, let NextAuth handle it
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

// Update matcher to include root path
export const config = {
  matcher: [
    '/',  // Add root path
    '/login',
    '/dashboard/:path*'
  ],
};