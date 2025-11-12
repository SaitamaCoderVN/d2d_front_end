'use client';

import dynamic from 'next/dynamic';

// Dynamically import WalletMultiButton with no SSR to avoid hydration issues
export const WalletMultiButton = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

