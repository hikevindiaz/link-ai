import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';

export default async function HomePage() {
  const session = await getServerSession(authOptions);
  
  if (session?.user) {
    redirect('/dashboard');
  } else {
    redirect('/login');
  }
  
  // This is just a fallback and won't be reached
  return null;
} 