import { compare } from 'bcrypt-ts';
import NextAuth, { type User, type Session } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { NextRequest, NextResponse } from 'next/server';

import { getUser } from '@/lib/chat-interface/db/queries';

import { authConfig } from './auth.config';

interface ExtendedSession extends Session {
  user: User;
}

// Dummy handlers that just return a 200 response
export const handlers = {
  GET: async (req: NextRequest) => {
    return NextResponse.json({ status: 'ok' });
  },
  POST: async (req: NextRequest) => {
    return NextResponse.json({ status: 'ok' });
  }
};

// Export the handlers individually for destructuring
export const { GET, POST } = handlers;

// Dummy auth function that always returns the current session
export const auth = async () => {
  return {
    user: null,
    session: null
  };
};

// Dummy sign in function
export const signIn = async () => {
  return { error: null };
};

// Dummy sign out function
export const signOut = async () => {
  return { error: null };
};
