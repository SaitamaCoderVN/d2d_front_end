'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from './WalletButton';
import PointsDisplay from './PointsDisplay';

export default function WalletWithPoints() {
  const { connected } = useWallet();

  return (
    <div className="flex items-center space-x-3">
      {connected && <PointsDisplay />}
      <WalletMultiButton />
    </div>
  );
}

