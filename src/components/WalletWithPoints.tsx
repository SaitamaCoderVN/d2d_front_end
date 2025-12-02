'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from './WalletButton';
import PointsDisplay from './PointsDisplay';

interface WalletWithPointsProps {
  className?: string;
}

export default function WalletWithPoints({ className = "flex items-center space-x-3" }: WalletWithPointsProps) {
  const { connected } = useWallet();

  return (
    <div className={className}>
      {connected && <PointsDisplay />}
      <WalletMultiButton />
    </div>
  );
}

