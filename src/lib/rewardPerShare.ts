/**
 * Frontend helper functions for reward-per-share calculations
 */

import { BN } from '@coral-xyz/anchor';

// Precision constant (1e12)
export const PRECISION = new BN('1000000000000');

/**
 * Calculate claimable rewards using reward-per-share formula
 * 
 * Formula: (deposited_amount * reward_per_share - reward_debt) / PRECISION
 * 
 * @param depositedAmount - Backer's deposited amount (in lamports)
 * @param rewardPerShare - Current reward_per_share (as string or BN)
 * @param rewardDebt - Backer's reward_debt (as string or BN)
 * @returns Claimable rewards in lamports
 */
export function calculateClaimableRewards(
  depositedAmount: number | BN,
  rewardPerShare: string | BN,
  rewardDebt: string | BN
): number {
  const deposited = typeof depositedAmount === 'number' 
    ? new BN(depositedAmount) 
    : depositedAmount;
  
  const rewardPerShareBN = typeof rewardPerShare === 'string'
    ? new BN(rewardPerShare)
    : rewardPerShare;
  
  const rewardDebtBN = typeof rewardDebt === 'string'
    ? new BN(rewardDebt)
    : rewardDebt;

  // Calculate: (deposited_amount * reward_per_share - reward_debt) / PRECISION
  const accumulated = deposited.mul(rewardPerShareBN);
  const claimable = accumulated.sub(rewardDebtBN).div(PRECISION);

  return claimable.toNumber();
}

/**
 * Format lamports to SOL
 */
export function lamportsToSol(lamports: number): number {
  return lamports / 1_000_000_000;
}

/**
 * Format SOL to lamports
 */
export function solToLamports(sol: number): number {
  return Math.floor(sol * 1_000_000_000);
}

/**
 * Get claimable rewards display string
 */
export function formatClaimableRewards(lamports: number): string {
  const sol = lamportsToSol(lamports);
  if (sol < 0.001) {
    return `${lamports} lamports`;
  }
  return `${sol.toFixed(4)} SOL`;
}

