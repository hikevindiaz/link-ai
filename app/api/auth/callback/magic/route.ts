import { NextResponse } from 'next/server';
import { signIn } from 'next-auth/react';
import { authOptions } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const didToken = url.searchParams.get('didToken');

    if (!didToken) {
      return NextResponse.redirect(new URL('/login?error=no_token', request.url));
    }

    // Sign in with NextAuth using the DID token
    const result = await signIn('credentials', {
      didToken,
      redirect: false,
    });

    if (result?.error) {
      return NextResponse.redirect(new URL(`/login?error=${result.error}`, request.url));
    }

    // Redirect to dashboard on success
    return NextResponse.redirect(new URL('/dashboard', request.url));
  } catch (error) {
    console.error('Magic callback error:', error);
    return NextResponse.redirect(new URL('/login?error=callback_error', request.url));
  }
} 