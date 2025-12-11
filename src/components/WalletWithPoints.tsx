'use client';

import { WalletMultiButton } from './WalletButton';
import PointsDisplay from './PointsDisplay';

interface WalletWithPointsProps {
  className?: string;
}

export default function WalletWithPoints({ className = "flex items-center space-x-3" }: WalletWithPointsProps) {
  return (
    <div className={className}>
      <PointsDisplay />
      <WalletMultiButton />
    </div>
  );
}

