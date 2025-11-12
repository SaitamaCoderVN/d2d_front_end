'use client';

import { useState, useEffect } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@/components/WalletButton';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import Image from 'next/image';
import {
  getBackerData,
  updateUserStake,
  calculateUserRewards,
  calculateAPY,
  claimRewards,
} from '@/lib/backerStorage';
import {
  createClaimRewardsInstruction,
  createStakeSolInstruction,
  prepareTransaction,
  checkStakeAccountExists,
} from '@/lib/d2dProgram';
import { debugClaimRewards } from '@/lib/debugUtils';
import { claimRewardsAnchor } from '@/lib/d2dProgramAnchor';

export default function BackerPage() {
  const wallet = useWallet();
  const { publicKey, connected, sendTransaction } = wallet;
  const { connection } = useConnection();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [userStake, setUserStake] = useState(0);
  const [totalStaked, setTotalStaked] = useState(32);
  const [programsDeployed, setProgramsDeployed] = useState(13);
  const [userRewards, setUserRewards] = useState(0);
  const [daysStaked, setDaysStaked] = useState(0);
  
  // Constants
  const PROFIT_PER_PROGRAM_MONTHLY = 5;
  const SOL_PRICE = 200;
  
  // Load from localStorage on mount
  useEffect(() => {
    if (publicKey) {
      const data = getBackerData(publicKey.toString());
      if (data) {
        setUserStake(data.userStake);
        setTotalStaked(data.totalPoolStaked);
        setProgramsDeployed(data.programsDeployed);
        
        // Calculate days staked
        const days = Math.floor((Date.now() - data.stakeTimestamp) / (1000 * 60 * 60 * 24));
        setDaysStaked(days);
        
        // Calculate rewards based on programs deployed AFTER staking
        const rewards = calculateUserRewards(
          data.userStake,
          data.totalPoolStaked,
          data.programsDeployed,
          data.programsDeployedAtStake ?? data.programsDeployed, // Fallback for old data
          PROFIT_PER_PROGRAM_MONTHLY,
          SOL_PRICE
        );
        setUserRewards(rewards);
      }
    }
  }, [publicKey]);
  
  // Refresh programs deployed from localStorage every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      if (publicKey) {
        const data = getBackerData(publicKey.toString());
        if (data && data.programsDeployed !== programsDeployed) {
          setProgramsDeployed(data.programsDeployed);
          
          // Recalculate rewards based on NEW programs since stake
          const days = Math.floor((Date.now() - data.stakeTimestamp) / (1000 * 60 * 60 * 24));
          setDaysStaked(days);
          const rewards = calculateUserRewards(
            data.userStake,
            data.totalPoolStaked,
            data.programsDeployed,
            data.programsDeployedAtStake ?? data.programsDeployed, // Fallback for old data
            PROFIT_PER_PROGRAM_MONTHLY,
            SOL_PRICE
          );
          setUserRewards(rewards);
        }
      }
    }, 5000);
    
    return () => clearInterval(interval);
  }, [publicKey, programsDeployed]);
  
  const SOL_LOCKED = programsDeployed * 1.2; // programs × 1.2 SOL each
  
  const estimatedAPY = calculateAPY(
    totalStaked,
    programsDeployed,
    PROFIT_PER_PROGRAM_MONTHLY,
    SOL_PRICE
  );

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

      const amountLamports = Math.floor(amount * LAMPORTS_PER_SOL);

      const instruction = createStakeSolInstruction(amountLamports, 0, publicKey);
      const transaction = await prepareTransaction(connection, publicKey, instruction);

      toast.loading('Please approve stake transaction...', { id: 'stake' });
      const signature = await sendTransaction(transaction, connection);

      toast.loading('Confirming transaction...', { id: 'stake' });
      await connection.confirmTransaction(signature, 'confirmed');

      toast.success(`✅ Successfully staked ${amount} SOL!`, { id: 'stake', duration: 5000 });

      // Update state
      const newUserStake = userStake + amount;
      const newTotalStaked = totalStaked + amount;
      setUserStake(newUserStake);
      setTotalStaked(newTotalStaked);
      setStakeAmount('');
      
      // Save to localStorage
      if (publicKey) {
        updateUserStake(amount, publicKey.toString(), programsDeployed);
        
        // Recalculate rewards (will be 0 since no new programs deployed yet)
        const rewards = calculateUserRewards(
          newUserStake,
          newTotalStaked,
          programsDeployed,
          programsDeployed, // Same as current, so 0 new programs
          PROFIT_PER_PROGRAM_MONTHLY,
          SOL_PRICE
        );
        setUserRewards(rewards);
        setDaysStaked(0);
      }

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
    return (parseFloat(stakeAmount) * estimatedAPY) / 100;
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

    if (userRewards === 0) {
      toast.error('No rewards to claim');
      return;
    }

    setIsClaiming(true);

    try {
      toast.loading('Checking stake account...', { id: 'claim' });

      // Check if stake account exists
      const accountExists = await checkStakeAccountExists(connection, publicKey);
      if (!accountExists) {
        toast.error('Stake account not found. Please stake SOL first.', { id: 'claim' });
        setIsClaiming(false);
        return;
      }

      toast.loading('Claiming rewards with Anchor client...', { id: 'claim' });

      // Use Anchor client method (more reliable)
      const signature = await claimRewardsAnchor(connection, wallet);

      toast.loading('Confirming transaction...', { id: 'claim' });
      await connection.confirmTransaction(signature, 'confirmed');

      const claimedAmount = userRewards;

      // Update local storage & state
      claimRewards(publicKey.toString());
      setUserRewards(0);

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
      
      // Enhanced error messages
      let errorMessage = 'Failed to claim rewards';
      
      if (error.message?.includes('User rejected') || error.message?.includes('User declined')) {
        errorMessage = 'Transaction cancelled';
      } else if (error.message?.includes('AccountNotFound') || error.message?.includes('could not find account')) {
        errorMessage = 'Stake account not found. Please stake SOL first.';
      } else if (error.message?.includes('NoRewardsToClaim') || error.message?.includes('0x1775')) {
        errorMessage = 'No rewards available to claim yet. Please wait for rewards to accumulate.';
      } else if (error.message?.includes('InsufficientTreasuryFunds') || error.message?.includes('0x1776')) {
        errorMessage = 'Treasury has insufficient funds. Please contact support.';
      } else if (error.message?.includes('InactiveStake') || error.message?.includes('0x1772')) {
        errorMessage = 'Your stake is inactive. Please stake SOL first.';
      } else if (error.logs) {
        console.error('Transaction logs:', error.logs);
        // Try to parse program error from logs
        const errorLog = error.logs.find((log: string) => log.includes('Error:'));
        if (errorLog) {
          errorMessage = `Program error: ${errorLog}`;
        } else {
          errorMessage = `Transaction failed: ${error.message}`;
        }
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
      value: `${userStake.toFixed(2)} SOL`,
      subtitle: `≈ $${(userStake * SOL_PRICE).toFixed(2)}`
    },
    {
      label: 'APY',
      value: `${estimatedAPY}%`,
      subtitle: `Based on $${programsDeployed * PROFIT_PER_PROGRAM_MONTHLY}/mo`
    },
    {
      label: 'Rewards Earned',
      value: `${userRewards.toFixed(4)} SOL`,
      subtitle: userRewards > 0 ? `≈ $${(userRewards * SOL_PRICE).toFixed(2)}` : 'Stake to earn rewards'
    },
    {
      label: 'Total Pool',
      value: `${totalStaked.toFixed(2)} SOL`,
      subtitle: 'TVL in treasury'
    },
    {
      label: 'SOL Locked',
      value: `${SOL_LOCKED.toFixed(2)} SOL`,
      subtitle: 'For rent coverage'
    },
    {
      label: 'Programs Deployed',
      value: programsDeployed.toString(),
      subtitle: 'Total deployed'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="header-sticky">
        <div className="container-main">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-8">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
                  <Image src="/favicon.svg" alt="D2D" width={32} height={32} />
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Backer Dashboard</h1>
                  <p className="text-xs text-gray-500">Stake & earn rewards</p>
                </div>
              </Link>
              
              <nav className="hidden md:flex space-x-2">
                <Link 
                  href="/developer"
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition font-medium text-sm"
                >
                  Deploy
                </Link>
                <Link 
                  href="/backer"
                  className="px-4 py-2 rounded-lg bg-[#0066FF] text-white font-medium text-sm"
                >
                  Stake & Earn
                </Link>
              </nav>
            </div>
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <main className="container-main py-12">
        {!connected ? (
          <div className="text-center py-32">
            <div className="w-24 h-24 bg-[#0066FF] rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-blue">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-heading-2 text-gray-900 mb-6">
              Connect Your Wallet
            </h2>
            <p className="text-body-large max-w-md mx-auto mb-8">
              Please connect your Solana wallet to start staking and earning rewards.
            </p>
            <WalletMultiButton />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {stats.map((stat, index) => (
                <div key={index} className="stat-card">
                  <div className="stat-label">{stat.label}</div>
                  <div className="stat-value">{stat.value}</div>
                  <div className="stat-subtitle">{stat.subtitle}</div>
                </div>
              ))}
            </div>

            {/* Claim Rewards Section */}
            {userRewards > 0 && (
              <div className="card p-8 border-2 border-[#0066FF]">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center">
                        <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-gray-900">Rewards Available!</h3>
                        <p className="text-sm text-gray-600">You have earned rewards from program deployments</p>
                      </div>
                    </div>
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-baseline space-x-2">
                        <span className="text-3xl font-bold text-green-600">{userRewards.toFixed(4)}</span>
                        <span className="text-lg text-gray-600">SOL</span>
                        <span className="text-sm text-gray-500">≈ ${(userRewards * SOL_PRICE).toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3">
                    <button
                      onClick={handleClaimRewards}
                      disabled={isClaiming}
                      className="btn-primary px-8 py-4 text-lg font-semibold whitespace-nowrap"
                    >
                      {isClaiming ? (
                        <span className="flex items-center justify-center space-x-2">
                          <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                          </svg>
                          <span>Claiming...</span>
                        </span>
                      ) : (
                        <span className="flex items-center space-x-2">
                          <span>Claim Rewards</span>
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                        </span>
                      )}
                    </button>
                    <button
                      onClick={handleDebug}
                      className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition"
                    >
                      🔍 Debug Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Stake Form */}
            <div className="card p-8">
              <div className="mb-8">
                <h2 className="section-header">Become a Backer & Earn Rewards</h2>
                <p className="section-subtitle">
                  Stake your SOL to support program deployments and earn {estimatedAPY}% APY
                </p>
              </div>

              <form onSubmit={handleStake} className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                    Amount to Stake
                  </label>
                  <input
                    type="number"
                    id="amount"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0.1"
                    className="input-field"
                    disabled={isStaking}
                  />
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Minimum: 0.1 SOL</span>
                    <button
                      type="button"
                      className="text-[#0066FF] hover:text-[#0052CC] font-medium"
                      onClick={() => setStakeAmount('1')}
                    >
                      Max
                    </button>
                  </div>
                </div>

                {stakeAmount && !isNaN(parseFloat(stakeAmount)) && parseFloat(stakeAmount) >= 0.1 && (
                  <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Estimated Annual Rewards:</span>
                      <span className="font-bold text-gray-900">
                        {calculateEstimatedRewards().toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-700">Monthly Rewards:</span>
                      <span className="font-bold text-gray-900">
                        {(calculateEstimatedRewards() / 12).toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="pt-3 border-t border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-700">APY:</span>
                        <span className="font-bold text-[#0066FF] text-xl">{estimatedAPY}%</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 0.1}
                  className="btn-primary w-full"
                >
                  {isStaking ? (
                    <span className="flex items-center justify-center space-x-2">
                      <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Staking...</span>
                    </span>
                  ) : (
                    'Stake Now'
                  )}
                </button>
              </form>

              <div className="mt-8 pt-8 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-6">How It Works</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {[
                    { num: '1', text: 'Stake your SOL to the treasury pool' },
                    { num: '2', text: 'Your SOL is used to cover rent for developer deployments' },
                    { num: '3', text: `Earn ${estimatedAPY}% APY as developers pay service fees` },
                    { num: '4', text: 'Unstake anytime with a 7-day cooldown period' }
                  ].map((step, index) => (
                    <div key={index} className="flex items-start space-x-3">
                      <div className="w-8 h-8 bg-[#0066FF] text-white rounded-lg flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {step.num}
                      </div>
                      <p className="text-sm text-gray-600 leading-relaxed pt-1">{step.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
