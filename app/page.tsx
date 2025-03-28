import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  console.log('[ROOT] Accessing root page');
  
  try {
    const session = await getServerSession(authOptions);
    console.log('[ROOT] Session status:', !!session);
    
    if (session?.user) {
      console.log('[ROOT] User authenticated, redirecting to dashboard');
      redirect('/dashboard');
    } else {
      console.log('[ROOT] User not authenticated, redirecting to login');
      redirect('/login');
    }
  } catch (error) {
    console.error('[ROOT] Error in root page redirection:', error);
    // In case of error, redirect to login as fallback
    redirect('/login');
  }
  
  // This is just a fallback and won't be reached
  return null;
} 