"use client";

import { useState } from 'react';
import { useWallet, useConnection } from '@solana/wallet-adapter-react';
import WalletWithPoints from '@/components/WalletWithPoints';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import Image from 'next/image';
import {
  createStakeSolInstruction,
  prepareTransaction,
} from '@/lib/d2dProgram';

export default function LenderPage() {
  const wallet = useWallet();
  const { publicKey, connected, sendTransaction } = wallet;
  const { connection } = useConnection();
  
  const [stakeAmount, setStakeAmount] = useState('');
  const [isStaking, setIsStaking] = useState(false);
  const [userStake, setUserStake] = useState(0);
  const [totalStaked, setTotalStaked] = useState(1250.75); // Mock data
  const [estimatedAPY, setEstimatedAPY] = useState(15.2);

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

      // Update user stake (in real app, fetch from blockchain)
      setUserStake((prev) => prev + amount);
      setStakeAmount('');

      // Show transaction link
      setTimeout(() => {
        toast.success(
          <div>
            <div className="font-semibold mb-1">Transaction Confirmed!</div>
            <a
              href={`https://explorer.solana.com/tx/${signature}?cluster=devnet`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 underline text-sm"
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
    const amount = parseFloat(stakeAmount);
    return (amount * estimatedAPY) / 100;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white via-blue-50 to-blue-100">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-blue-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-6">
              <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                  <Image src="/favicon.svg" alt="Decentralize Deployment" width={40} height={40} />
                </div>
                <div>
                  <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-blue-600 bg-clip-text text-transparent">
                    Lender Dashboard
                  </h1>
                </div>
              </Link>
              
              <nav className="hidden md:flex space-x-1">
                <Link 
                  href="/developer"
                  className="px-4 py-2 rounded-lg text-gray-600 hover:bg-blue-50 transition font-medium text-sm"
                >
                  Deploy
                </Link>
                <Link 
                  href="/lender"
                  className="px-4 py-2 rounded-lg bg-blue-100 text-blue-700 font-medium text-sm"
                >
                  Stake & Earn
                </Link>
              </nav>
            </div>
            <WalletWithPoints />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!connected ? (
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-400 to-blue-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-600 mb-8 max-w-md mx-auto">
              Please connect your Solana wallet to start staking and earning rewards.
            </p>
            <WalletWithPoints />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Your Stake</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
                      <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{userStake.toFixed(2)} SOL</div>
                <div className="text-xs text-blue-600 mt-1">≈ ${(userStake * 200).toFixed(2)}</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">APY</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{estimatedAPY}%</div>
                <div className="text-xs text-gray-500 mt-1">Current rate</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Rewards Earned</span>
                  <div className="w-8 h-8 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">0.00 SOL</div>
                <div className="text-xs text-gray-500 mt-1">Claimable soon</div>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-lg border border-blue-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600">Total Pool</span>
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <svg className="w-4 h-4 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                    </svg>
                  </div>
                </div>
                <div className="text-3xl font-bold text-gray-900">{totalStaked.toFixed(2)} SOL</div>
                <div className="text-xs text-gray-500 mt-1">TVL in treasury</div>
              </div>
            </div>

            {/* Stake Form */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-blue-100">
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Stake SOL & Earn Rewards
                </h2>
                <p className="text-gray-600">
                  Stake your SOL to help fund program deployments and earn {estimatedAPY}% APY
                </p>
              </div>

              <form onSubmit={handleStake} className="space-y-6">
                <div>
                  <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
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
                      className="w-full px-4 py-4 pr-16 text-lg border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition"
                      disabled={isStaking}
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 font-semibold">
                      SOL
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-gray-500">Minimum: 0.1 SOL</span>
                    <button
                      type="button"
                      className="text-blue-600 hover:text-blue-700 font-medium"
                      onClick={() => setStakeAmount('1')}
                    >
                      Max
                    </button>
                  </div>
                </div>

                {stakeAmount && !isNaN(parseFloat(stakeAmount)) && (
                  <div className="bg-blue-50 rounded-xl p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Estimated Annual Rewards:</span>
                      <span className="font-semibold text-blue-700">
                        {calculateEstimatedRewards().toFixed(4)} SOL
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Monthly Rewards:</span>
                      <span className="font-semibold text-blue-700">
                        {(calculateEstimatedRewards() / 12).toFixed(4)} SOL
                      </span>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 0.1}
                  className={`w-full py-4 rounded-xl font-semibold text-white transition-all duration-200 ${
                    isStaking || !stakeAmount || parseFloat(stakeAmount) < 0.1
                      ? 'bg-gray-300 cursor-not-allowed'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5'
                  }`}
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

              <div className="mt-8 pt-6 border-t border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-4">How It Works</h3>
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">1</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Stake your SOL to the treasury pool
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">2</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Your SOL is used to cover rent for developer deployments
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">3</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Earn {estimatedAPY}% APY as developers pay service fees
                    </p>
                  </div>
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-xs font-bold text-blue-600">4</span>
                    </div>
                    <p className="text-sm text-gray-600">
                      Unstake anytime with a 7-day cooldown period
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

