/**
 * Fetch backer data from on-chain accounts
 * This replaces localStorage-based calculations with real on-chain data
 */

import { Connection, PublicKey } from '@solana/web3.js';
import { WalletContextState } from '@solana/wallet-adapter-react';
import { fetchTreasuryPool, fetchStakeAccount } from './d2dProgramAnchor';

export interface OnChainBackerData {
  // Treasury Pool data
  totalStaked: number; // SOL
  totalDeposited: number; // SOL (total deposited by backers)
  liquidBalance: number; // SOL (available for deployments)
  lockedBalance: number; // SOL (locked in active deployments) = totalDeposited - liquidBalance
  totalFeesCollected: number; // SOL
  totalRewardsDistributed: number; // SOL
  currentApy: number; // Percentage (e.g., 10.5 for 10.5%)
  availableRewards: number; // SOL available for distribution
  
  // Backer Deposit data
  userStake: number; // SOL
  userRewards: number; // SOL (calculated from on-chain)
  totalClaimed: number; // SOL
  depositTime: number; // Unix timestamp
  lastClaimTime: number; // Unix timestamp
  isActive: boolean;
  deploymentsSupported: number;
  
  // Calculated values
  userShare: number; // Percentage of pool (0-100)
  daysStaked: number;
}

/**
 * Fetch all backer data from on-chain
 */
export const fetchBackerDataOnChain = async (
  connection: Connection,
  wallet: WalletContextState,
): Promise<OnChainBackerData | null> => {
  if (!wallet.publicKey) {
    return null;
  }

  try {
    // Use the exact treasury pool address
    const TREASURY_POOL_ADDRESS = 'D6h9mgXL5enPyiG2M1W7Jn9yjXh8md1fCAcP5zBJH6ma';
    const treasuryPoolPDA = new PublicKey(TREASURY_POOL_ADDRESS);
    
    // Fetch Treasury Pool struct and account balance
    const treasuryResult = await fetchTreasuryPool(connection, wallet);
    const accountInfo = await connection.getAccountInfo(treasuryPoolPDA, 'confirmed');
    
    if (!accountInfo) {
      console.warn('Treasury Pool account not found at', TREASURY_POOL_ADDRESS);
      return null;
    }

    // Get actual account balance (total SOL in the account)
    const actualAccountBalanceLamports = accountInfo.lamports;
    const actualAccountBalanceSOL = actualAccountBalanceLamports / 1_000_000_000;
    
    // Calculate rent exemption
    const accountDataSize = accountInfo.data.length;
    const rentExemption = await connection.getMinimumBalanceForRentExemption(accountDataSize);
    const rentExemptionSOL = rentExemption / 1_000_000_000;
    
    // Available SOL = actual balance - rent exemption
    const availableBalanceLamports = Math.max(0, actualAccountBalanceLamports - rentExemption);
    const availableBalanceSOL = availableBalanceLamports / 1_000_000_000;
    
    // Use account balance as source of truth (total SOL in account)
    // This is what the user wants to see
    const liquidBalanceSOL = actualAccountBalanceSOL;
    
    const treasury = treasuryResult.exists && treasuryResult.data ? treasuryResult.data : null;
    
    // Use new reward-per-share model fields
    // Convert from lamports to SOL (divide by 1e9)
    const LAMPORTS_PER_SOL = 1_000_000_000;
    const totalDepositedLamports = treasury?.totalDeposited?.toNumber() || 0;
    // Use actual account balance instead of struct field
    const liquidBalanceLamports = actualAccountBalanceLamports;
    const rewardPoolBalanceLamports = treasury?.rewardPoolBalance?.toNumber() || 0;
    const platformPoolBalanceLamports = treasury?.platformPoolBalance?.toNumber() || 0;
    // rewardPerShare is u128, use toBigInt() to avoid precision loss
    const rewardPerShare = treasury?.rewardPerShare ? 
      (typeof treasury.rewardPerShare === 'bigint' ? treasury.rewardPerShare : 
       treasury.rewardPerShare.toBigInt ? treasury.rewardPerShare.toBigInt() : 
       BigInt(treasury.rewardPerShare.toString())) : 
      BigInt(0);
    
    // Convert to SOL
    const totalDeposited = totalDepositedLamports / LAMPORTS_PER_SOL;
    // Use actual account balance (total SOL in account D6h9mgXL5enPyiG2M1W7Jn9yjXh8md1fCAcP5zBJH6ma)
    const liquidBalance = liquidBalanceSOL; // This is the total account balance
    const lockedBalance = Math.max(0, totalDeposited - availableBalanceSOL); // SOL locked in active deployments (if struct is available)
    const rewardPoolBalance = rewardPoolBalanceLamports / LAMPORTS_PER_SOL;
    const platformPoolBalance = platformPoolBalanceLamports / LAMPORTS_PER_SOL;
    
    // Legacy fields (for backward compatibility, may be 0)
    const totalStakedLamports = treasury?.totalStaked?.toNumber() || totalDepositedLamports;
    const totalFeesCollectedLamports = treasury?.totalFeesCollected?.toNumber() || rewardPoolBalanceLamports;
    const totalRewardsDistributedLamports = treasury?.totalRewardsDistributed?.toNumber() || 0;
    
    // Convert to SOL
    const totalStaked = totalStakedLamports / LAMPORTS_PER_SOL;
    const totalFeesCollected = totalFeesCollectedLamports / LAMPORTS_PER_SOL;
    const totalRewardsDistributed = totalRewardsDistributedLamports / LAMPORTS_PER_SOL;
    
    // APY is no longer used in fee-based model, but calculate from fees if available
    const currentApy = treasury?.currentApy?.toNumber() || 0;
    const availableRewards = rewardPoolBalance; // Direct from reward pool (already in SOL)
    
    // Log for debugging
    console.log('[fetchBackerDataOnChain] Treasury Pool:', TREASURY_POOL_ADDRESS);
    console.log('  Account balance (total):', actualAccountBalanceSOL.toFixed(9), 'SOL');
    console.log('  Rent exemption:', rentExemptionSOL.toFixed(9), 'SOL');
    console.log('  Available (after rent):', availableBalanceSOL.toFixed(9), 'SOL');
    console.log('  Using liquidBalance:', liquidBalanceSOL.toFixed(9), 'SOL (total account balance)');

    // Fetch Backer Deposit
    const stakeResult = await fetchStakeAccount(connection, wallet);
    if (!stakeResult.exists || !stakeResult.data) {
      // User hasn't staked yet
      return {
        totalStaked,
        totalDeposited,
        liquidBalance,
        lockedBalance,
        totalFeesCollected,
        totalRewardsDistributed,
        currentApy,
        availableRewards,
        userStake: 0,
        userRewards: 0,
        totalClaimed: 0,
        depositTime: 0,
        lastClaimTime: 0,
        isActive: false,
        deploymentsSupported: 0,
        userShare: 0,
        daysStaked: 0,
      };
    }

    const stake = stakeResult.data;
    // Convert from lamports to SOL (LAMPORTS_PER_SOL already defined above)
    const userStakeLamports = stake.depositedAmount?.toNumber() || 0;
    const totalClaimedLamports = stake.claimedTotal?.toNumber() || 0; // Fixed: use claimedTotal not totalClaimed
    // rewardDebt is u128, must use toBigInt() to avoid precision loss
    const rewardDebt = stake.rewardDebt ? 
      (typeof stake.rewardDebt === 'bigint' ? stake.rewardDebt : 
       stake.rewardDebt.toBigInt ? stake.rewardDebt.toBigInt() : 
       BigInt(stake.rewardDebt.toString())) : 
      BigInt(0);
    const isActive = stake.isActive || false;
    
    // Convert to SOL
    const userStake = userStakeLamports / LAMPORTS_PER_SOL;
    const totalClaimed = totalClaimedLamports / LAMPORTS_PER_SOL;
    
    // Note: depositTime, lastClaimTime, deploymentsSupported no longer exist in new struct
    // These are set to 0 for backward compatibility
    const depositTime = 0;
    const lastClaimTime = 0;
    const deploymentsSupported = 0;

    // Calculate user share based on total deposited
    const userShare = totalDeposited > 0 ? (userStake / totalDeposited) * 100 : 0;

    // Calculate days staked (not available in new struct, return 0)
    const daysStaked = 0;

    // Calculate user rewards using reward-per-share model
    // Formula: (deposited_amount * reward_per_share - reward_debt) / PRECISION
    // Note: Calculation must use lamports and BigInt for precision
    const PRECISION = BigInt(1_000_000_000_000); // 1e12
    const userStakeBigInt = BigInt(userStakeLamports);
    const rewardDebtBigInt = rewardDebt; // Already BigInt
    const accumulated = (userStakeBigInt * rewardPerShare) - rewardDebtBigInt;
    const userRewardsLamports = accumulated > 0 ? Number(accumulated / PRECISION) : 0;
    const userRewards = userRewardsLamports / LAMPORTS_PER_SOL; // Convert to SOL

    return {
      totalStaked,
      totalDeposited,
      liquidBalance,
      lockedBalance,
      totalFeesCollected,
      totalRewardsDistributed,
      currentApy,
      availableRewards,
      userStake,
      userRewards,
      totalClaimed,
      depositTime,
      lastClaimTime,
      isActive,
      deploymentsSupported,
      userShare,
      daysStaked,
    };
  } catch (error) {
    console.error('Error fetching backer data from on-chain:', error);
    return null;
  }
};

/**
 * Estimate rewards based on on-chain calculation logic
 * This matches the Rust implementation in lender_stake.rs
 */
function calculateEstimatedRewards(
  depositedAmount: number,
  apy: number,
  timeElapsed: number,
  depositTime: number,
  deploymentsSupported: number,
): number {
  if (depositedAmount === 0 || timeElapsed <= 0) {
    return 0;
  }

  // Base reward calculation (matches Rust calculate_base_reward)
  // Formula: (deposited_amount * APY * time_elapsed) / (100 * 86400 * 365)
  const baseReward = (depositedAmount * apy * timeElapsed) / (100 * 86400 * 365);

  // Duration bonus multiplier (matches Rust logic)
  const totalDuration = Math.floor(Date.now() / 1000) - depositTime;
  let durationMultiplier = 1.0;
  
  if (totalDuration < 7 * 86400) {
    durationMultiplier = 0.5; // < 7 days: 0.5x
  } else if (totalDuration < 30 * 86400) {
    durationMultiplier = 1.0; // 7-30 days: 1.0x
  } else if (totalDuration < 90 * 86400) {
    durationMultiplier = 1.5; // 30-90 days: 1.5x
  } else if (totalDuration < 180 * 86400) {
    durationMultiplier = 2.0; // 90-180 days: 2.0x
  } else {
    durationMultiplier = 3.0; // > 180 days: 3.0x
  }

  // Deployment support bonus: +10% per deployment (capped at 50%)
  const deploymentBonus = Math.min(deploymentsSupported, 5) * 0.1; // Max +50%
  const totalMultiplier = durationMultiplier + deploymentBonus;

  return baseReward * totalMultiplier;
}

/**
 * Calculate APY based on actual fees collected
 * This is more accurate than the frontend calculation
 */
export const calculateRealAPY = (
  totalFeesCollected: number,
  totalStaked: number,
  timeElapsedDays: number = 30, // Default to 30 days
): number => {
  if (totalStaked === 0 || timeElapsedDays === 0) {
    return 0;
  }

  // Annualize the fees collected
  const dailyFees = totalFeesCollected / timeElapsedDays;
  const annualFees = dailyFees * 365;
  
  // APY = (annual fees / total staked) * 100
  return (annualFees / totalStaked) * 100;
};

