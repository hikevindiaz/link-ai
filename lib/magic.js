import { Magic } from 'magic-sdk';

let magic;

if (typeof window !== 'undefined') {
  magic = new Magic(process.env.NEXT_PUBLIC_MAGIC_PUBLISHABLE_KEY, {
    network: {
      rpcUrl: process.env.NEXT_PUBLIC_APP_URL,
      chainId: 1,
    },
    testMode: process.env.NODE_ENV === 'development',
    extensions: [],
  });
}

export { magic };