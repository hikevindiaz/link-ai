import { Resend } from 'resend';

// Only initialize Resend if we have an API key and are on the server
const RESEND_API_KEY = typeof window === 'undefined' ? process.env.RESEND_API_KEY : undefined;

// Create a dummy Resend instance for client-side or when API key is missing
export const email = RESEND_API_KEY && RESEND_API_KEY !== 're_123' 
  ? new Resend(RESEND_API_KEY)
  : null as any; // Type as any to avoid type errors when email features are disabled

// Helper to check if email is available
export const isEmailEnabled = () => !!email && typeof window === 'undefined' && !!RESEND_API_KEY;

