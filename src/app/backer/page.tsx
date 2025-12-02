'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import WalletWithPoints from '@/components/WalletWithPoints';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { claimRewardsAnchor, stakeSolAnchor } from '@/lib/d2dProgramAnchor';
import { fetchBackerDataOnChain, OnChainBackerData } from '@/lib/backerOnChain';
import { checkStakeAccountExists } from '@/lib/d2dProgram';
import { debugClaimRewards } from '@/lib/debugUtils';

export default function BackerPage() {
  const wallet = useWallet();
  const { publicKey, connected } = wallet;
  const { connection } = useConnection();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [onChainData, setOnChainData] = useState<OnChainBackerData | null>(null);
  
  // Constants
  const SOL_PRICE = 200;
  
  // Ref to track if we're currently fetching to prevent duplicate calls
  const isFetchingRef = useRef(false);
  
  // Fetch data from on-chain with debounce and duplicate prevention
  const refreshOnChainData = useCallback(async () => {
    if (!publicKey || !connected) {
      setIsLoading(false);
      return;
    }

    // Prevent duplicate concurrent fetches
    if (isFetchingRef.current) {
      return;
    }

    try {
      isFetchingRef.current = true;
      setIsLoading(true);
      const data = await fetchBackerDataOnChain(connection, wallet);
      setOnChainData(data);
    } catch (error) {
      console.error('Error fetching on-chain data:', error);
    } finally {
      setIsLoading(false);
      isFetchingRef.current = false;
    }
  }, [publicKey, connected, connection, wallet]);

  // Load from on-chain on mount and when wallet changes (with debounce)
  useEffect(() => {
    // Debounce: wait 300ms before fetching to avoid rapid re-renders
    const timeoutId = setTimeout(() => {
      refreshOnChainData();
    }, 300);
    
    return () => clearTimeout(timeoutId);
  }, [publicKey, connected, refreshOnChainData]);

  // Extract values from on-chain data
  const userStake = onChainData?.userStake ?? 0;
  // const totalStaked = onChainData?.totalStaked ?? 0; // Unused
  const totalDeposited = onChainData?.totalDeposited ?? 0;
  const liquidBalance = onChainData?.liquidBalance ?? 0;
  const lockedBalance = onChainData?.lockedBalance ?? 0;
  const userRewards = onChainData?.userRewards ?? 0;
  // const daysStaked = onChainData?.daysStaked ?? 0; // Unused
  const currentApy = onChainData?.currentApy ?? 0;
  const availableRewards = onChainData?.availableRewards ?? 0;
  const deploymentsSupported = onChainData?.deploymentsSupported ?? 0;

  const handleStake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (isNaN(amount) || amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (amount < 0.1) {
      toast.error('Minimum stake amount is 0.1 SOL');
      return;
    }

    setIsStaking(true);

    try {
      toast.loading('Preparing stake transaction...', { id: 'stake' });

      // Check wallet balance before staking
      const balance = await connection.getBalance(publicKey);
      const balanceSOL = balance / LAMPORTS_PER_SOL;
      
      // Estimate required balance: deposit + rent exemption (~1.4M) + transaction fee (~10k)
      const RENT_EXEMPTION_ESTIMATE = 1_400_000; // ~1.4M lamports for new account
      const TRANSACTION_FEE_ESTIMATE = 10_000;
      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);
      const estimatedRequired = amountLamports + RENT_EXEMPTION_ESTIMATE + TRANSACTION_FEE_ESTIMATE;
      
      if (balance < estimatedRequired) {
        const needed = (estimatedRequired - balance) / LAMPORTS_PER_SOL;
        toast.error(`Insufficient balance. Need ${(estimatedRequired / LAMPORTS_PER_SOL).toFixed(4)} SOL, have ${balanceSOL.toFixed(4)} SOL.`, { id: 'stake' });
        return;
      }

      // Use Anchor client for better error handling
      toast.loading('Please approve stake transaction...', { id: 'stake' });
      let signature: string;
      try {
        signature = await stakeSolAnchor(connection, wallet, amountLamports, 0);
      } catch (stakeError: any) {
        console.error('Staking error:', stakeError);
        
        // Handle AccountDiscriminatorMismatch - account exists but with old format
        if (
          stakeError?.message?.includes('AccountDiscriminatorMismatch') ||
          stakeError?.code === 3002 ||
          stakeError?.errorCode === 3002
        ) {
          toast.error(
            'Account exists with old format. Please contact admin to migrate your account.',
            { id: 'stake', duration: 10000 }
          );
          throw new Error(
            'AccountDiscriminatorMismatch: Your stake account exists but has an old format.'
          );
        }
        
        throw stakeError;
      }

      toast.loading('Confirming transaction...', { id: 'stake' });
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`✅ Successfully staked ${amount} SOL!`, { id: 'stake', duration: 5000 });

      setStakeAmount('');
      
      // Refresh on-chain data
      await refreshOnChainData();

      setTimeout(() => {
        toast.success(
          <div>
            <div className="font-semibold mb-1">Transaction Confirmed!</div>
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0066FF] hover:underline text-sm"
            >
              View on Explorer ↗
            </a>
          </div>,
          { duration: 10000 }
        );
      }, 1000);
    } catch (error: any) {
      console.error('Staking error:', error);
      if (error.message?.includes('User rejected')) {
        toast.error('Transaction cancelled', { id: 'stake' });
      } else {
        toast.error(`Error: ${error.message || 'Failed to stake'}`, { id: 'stake' });
      }
    } finally {
      setIsStaking(false);
    }
  };

  const calculateEstimatedRewards = () => {
    if (!stakeAmount || isNaN(parseFloat(stakeAmount))) return 0;
    return (parseFloat(stakeAmount) * currentApy) / 100;
  };

  const handleDebug = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }
    await debugClaimRewards(connection, publicKey);
    toast.success('Debug info logged to console (F12)');
  };

  const handleClaimRewards = async () => {
    if (!publicKey || !connected) {
      toast.error('Please connect your wallet');
      return;
    }

    if (!onChainData || userRewards <= 0) {
      toast.error('No rewards to claim.');
      return;
    }
    
    if (!onChainData.isActive) {
      toast.error('Your stake is inactive.');
      return;
    }

    setIsClaiming(true);

    try {
      toast.loading('Checking stake account...', { id: 'claim' });

      // Check if stake account exists
      const accountExists = await checkStakeAccountExists(connection, publicKey);
      if (!accountExists) {
        toast.error('Stake account not found.', { id: 'claim' });
        setIsClaiming(false);
        return;
      }

      toast.loading('Claiming rewards...', { id: 'claim' });

      // Use Anchor client method
      const signature = await claimRewardsAnchor(connection, wallet);

      toast.loading('Confirming transaction...', { id: 'claim' });
      await connection.confirmTransaction(signature, 'confirmed');

      const claimedAmount = userRewards;

      // Refresh on-chain data to get updated rewards
      await refreshOnChainData();

      toast.success(`✅ Claimed ${claimedAmount.toFixed(4)} SOL!`, { id: 'claim', duration: 5000 });

      setTimeout(() => {
        toast.success(
          <div>
            <div className="font-semibold mb-1">Rewards Claimed!</div>
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#0066FF] hover:underline text-sm"
            >
              View on Explorer ↗
            </a>
          </div>,
          { duration: 10000 }
        );
      }, 1000);
    } catch (error: any) {
      console.error('Claim error:', error);
      
      let errorMessage = 'Failed to claim rewards';
      
      if (error.message?.includes('User rejected')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message?.includes('NoRewardsToClaim')) {
        errorMessage = 'No rewards available to claim yet.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage, { id: 'claim', duration: 5000 });
    } finally {
      setIsClaiming(false);
    }
  };

  const stats = [
    {
      label: 'Your Stake',
      value: isLoading ? 'Loading...' : `${userStake.toFixed(2)} SOL`,
      subtitle: isLoading ? '' : `≈ $${(userStake * SOL_PRICE).toFixed(2)}`
    },
    {
      label: 'APY',
      value: isLoading ? 'Loading...' : `${currentApy.toFixed(2)}%`,
      subtitle: isLoading ? '' : `Current on-chain APY`
    },
    {
      label: 'Rewards Earned',
      value: isLoading ? 'Loading...' : `${userRewards.toFixed(4)} SOL`,
      subtitle: isLoading ? '' : (userRewards > 0 ? `≈ $${(userRewards * SOL_PRICE).toFixed(2)}` : 'Stake to earn rewards')
    },
    {
      label: 'Total Pool',
      value: isLoading ? 'Loading...' : `${totalDeposited.toFixed(2)} SOL`,
      subtitle: isLoading ? '' : 'TVL in treasury'
    },
    {
      label: 'Locked for Deployments',
      value: isLoading ? 'Loading...' : `${lockedBalance.toFixed(2)} SOL`,
      subtitle: isLoading ? '' : 'SOL currently locked in active deployments'
    },
    {
      label: 'Available for Deploy',
      value: isLoading ? 'Loading...' : `${liquidBalance.toFixed(2)} SOL`,
      subtitle: isLoading ? '' : 'SOL available for developers to borrow'
    },
    {
      label: 'Available Rewards',
      value: isLoading ? 'Loading...' : `${availableRewards.toFixed(2)} SOL`,
      subtitle: isLoading ? '' : 'Fees collected - rewards distributed'
    },
    {
      label: 'Deployments Supported',
      value: isLoading ? 'Loading...' : deploymentsSupported.toString(),
      subtitle: isLoading ? '' : 'Your stake helped fund'
    }
  ];

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      {/* Header Removed - Handled by Sidebar */}
      
      <main className="container-main py-8">
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 font-mono flex items-center gap-3">
              <span className="text-emerald-500">&gt;</span> LIQUIDITY_POOL
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">Stake & earn rewards</p>
          </div>
          <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-mono text-emerald-400">POOL ACTIVE</span>
          </div>
        </div>

        {!connected ? (
          <div className="text-center py-20 bg-slate-900/30 rounded-md border border-slate-800 border-dashed">
            <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-700">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-200 mb-2 font-mono">WALLET_DISCONNECTED</h2>
            <p className="text-slate-500 mb-8 font-mono text-sm">Please connect your wallet to access the staking pool.</p>
            <div className="inline-block">
              <WalletWithPoints />
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {stats.map((stat, index) => (
                <div key={index} className="bg-[#151b28] p-4 rounded-md border border-slate-800">
                  <div className="text-xs font-mono text-slate-500 uppercase mb-2">{stat.label}</div>
                  <div className="text-xl font-bold text-slate-200 font-mono truncate">{stat.value}</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-1">{stat.subtitle}</div>
                </div>
              ))}
            </div>

            {/* Claim Rewards Section */}
            {userRewards > 0 && (
              <div className="bg-emerald-900/10 border border-emerald-500/30 rounded-md p-6">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-emerald-400 font-mono">REWARDS_AVAILABLE</h3>
                        <p className="text-xs text-emerald-500/70 font-mono">You have earned rewards from program deployments</p>
                      </div>
                    </div>
                    <div className="mt-2 p-3 bg-emerald-500/5 rounded border border-emerald-500/10 inline-block">
                      <div className="flex items-baseline space-x-2 font-mono">
                        <span className="text-2xl font-bold text-emerald-400">{userRewards.toFixed(4)}</span>
                        <span className="text-sm text-emerald-600">SOL</span>
                        <span className="text-xs text-emerald-700">≈ ${(userRewards * SOL_PRICE).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleClaimRewards}
                      disabled={isClaiming}
                      className="btn-primary"
                    >
                      {isClaiming ? 'CLAIMING...' : 'CLAIM REWARDS'}
                    </button>
                    <button
                      onClick={handleDebug}
                      className="btn-ghost text-xs"
                    >
                      [DEBUG_INFO]
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stake Form */}
            <div className="card p-8 bg-[#151b28] border-slate-800">
              <div className="mb-8">
                <h2 className="text-lg font-bold text-slate-200 font-mono mb-2">STAKE & EARN</h2>
                <p className="text-sm text-slate-400 font-mono">
                  Stake SOL to support deployments. Current APY: <span className="text-emerald-400">{isLoading ? '...' : `${currentApy.toFixed(2)}%`}</span>
                </p>
              </div>

              <form onSubmit={handleStake} className="space-y-6 max-w-xl">
                <div>
                  <label htmlFor="amount" className="text-label block mb-2">
                    Amount to Stake
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      id="amount"
                      value={stakeAmount}
                      onChange={(e) => setStakeAmount(e.target.value)}
                      placeholder="0.00"
                      step="0.01"
                      min="0.1"
                      className="input-field pr-16"
                      disabled={isStaking}
                    />
                    <button
                      type="button"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-emerald-400 hover:text-emerald-300 font-mono px-2 py-1"
                      onClick={() => setStakeAmount('1')}
                    >
                      MAX
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-slate-500 font-mono text-right">
                    Min: 0.1 SOL
                  </div>
                </div>

                {stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) >= 0.1 && (
                  <div className="bg-slate-900 rounded p-4 border border-slate-800 space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Annual Rewards</span>
                      <span className="text-emerald-400">{calculateEstimatedRewards().toFixed(4)} SOL</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Est. Monthly Rewards</span>
                      <span className="text-emerald-400">{(calculateEstimatedRewards() / 12).toFixed(4)} SOL</span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 0.1}
                  className="btn-primary w-full"
                >
                  {isStaking ? 'PROCESSING...' : 'STAKE SOL'}
                </button>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
