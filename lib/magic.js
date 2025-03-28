import { Magic } from 'magic-sdk';

// Simple initialization that worked before
let magic;

if (typeof window !== 'undefined') {
  // Initialize Magic just with the publishable key
  magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY);
}

export { magic };