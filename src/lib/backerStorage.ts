// Utility for managing backer pool data in localStorage

export interface BackerData {
  userStake: number;
  totalPoolStaked: number;
  programsDeployed: number;
  programsDeployedAtStake: number; // Programs count when user staked
  stakeTimestamp: number;
  userWallet: string;
}

const STORAGE_KEY = 'd2d_backer_data';

export const getBackerData = (walletAddress?: string): BackerData | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    
    const data: BackerData = JSON.parse(stored);
    
    // If wallet address provided, check if it matches
    if (walletAddress && data.userWallet !== walletAddress) {
      return null;
    }
    
    return data;
  } catch (error) {
    console.error('Error reading backer data:', error);
    return null;
  }
};

export const saveBackerData = (data: Partial<BackerData>): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getBackerData();
    const updated: BackerData = {
      userStake: data.userStake ?? existing?.userStake ?? 0,
      totalPoolStaked: data.totalPoolStaked ?? existing?.totalPoolStaked ?? 32,
      programsDeployed: data.programsDeployed ?? existing?.programsDeployed ?? 13,
      programsDeployedAtStake: data.programsDeployedAtStake ?? existing?.programsDeployedAtStake ?? 13,
      stakeTimestamp: data.stakeTimestamp ?? existing?.stakeTimestamp ?? Date.now(),
      userWallet: data.userWallet ?? existing?.userWallet ?? '',
    };
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving backer data:', error);
  }
};

export const incrementProgramsDeployed = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getBackerData();
    if (!existing) return;
    
    saveBackerData({
      ...existing,
      programsDeployed: existing.programsDeployed + 1,
    });
  } catch (error) {
    console.error('Error incrementing programs deployed:', error);
  }
};

export const claimRewards = (walletAddress: string): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getBackerData(walletAddress);
    if (!existing) return;
    
    // Reset rewards by setting programsDeployedAtStake to current
    saveBackerData({
      ...existing,
      programsDeployedAtStake: existing.programsDeployed,
    });
  } catch (error) {
    console.error('Error claiming rewards:', error);
  }
};

export const updateUserStake = (amount: number, walletAddress: string, currentProgramsDeployed: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const existing = getBackerData(walletAddress);
    
    saveBackerData({
      userStake: (existing?.userStake ?? 0) + amount,
      totalPoolStaked: (existing?.totalPoolStaked ?? 32) + amount,
      programsDeployed: currentProgramsDeployed,
      programsDeployedAtStake: existing?.programsDeployedAtStake ?? currentProgramsDeployed, // Save snapshot at first stake
      stakeTimestamp: existing?.stakeTimestamp ?? Date.now(), // Keep original timestamp
      userWallet: walletAddress,
    });
  } catch (error) {
    console.error('Error updating user stake:', error);
  }
};

export const calculateUserRewards = (
  userStake: number,
  totalPool: number,
  currentProgramsDeployed: number,
  programsDeployedAtStake: number | undefined,
  profitPerProgram: number,
  solPrice: number
): number => {
  if (totalPool === 0 || userStake === 0) return 0;
  
  // Handle undefined or invalid programsDeployedAtStake (for backwards compatibility)
  const stakeBaseline = programsDeployedAtStake ?? currentProgramsDeployed;
  
  // Calculate programs deployed AFTER user staked
  const newProgramsSinceStake = Math.max(0, currentProgramsDeployed - stakeBaseline);
  
  // If no new programs, no rewards yet
  if (newProgramsSinceStake === 0) return 0;
  
  // User's share of the pool
  const userShare = userStake / totalPool;
  
  // Total profit from NEW programs in USD
  const profitFromNewProgramsUSD = newProgramsSinceStake * profitPerProgram;
  
  // User's share of profit from new programs in USD
  const userProfitUSD = profitFromNewProgramsUSD * userShare;
  
  // Convert to SOL
  const userProfitSOL = userProfitUSD / solPrice;
  
  return userProfitSOL;
};

export const calculateAPY = (
  totalPool: number,
  programsDeployed: number,
  profitPerProgram: number,
  solPrice: number
): number => {
  if (totalPool === 0) return 0;
  
  const monthlyProfitUSD = programsDeployed * profitPerProgram;
  const annualProfitUSD = monthlyProfitUSD * 12;
  const poolValueUSD = totalPool * solPrice;
  
  return parseFloat(((annualProfitUSD / poolValueUSD) * 100).toFixed(2));
};

