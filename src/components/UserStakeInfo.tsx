'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { poolApi, UserStakeInfo } from '@/lib/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

export default function UserStakeInfo() {
  const { publicKey } = useWallet();
  const [stakeInfo, setStakeInfo] = useState<UserStakeInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStakeInfo = async () => {
    if (!publicKey) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const data = await poolApi.getUserStakeInfo(publicKey.toString());
      setStakeInfo(data);
    } catch (error: any) {
      console.error('Failed to fetch stake info:', error);
      // Don't show error toast for 404 or 500 (user hasn't staked yet or server error)
      if (error.response) {
        const status = error.response.status;
        if (status === 404 || status === 500) {
          // User hasn't staked yet or server returned empty data - this is OK
          setStakeInfo(null);
          return;
        }
      }
      // Only show error for unexpected errors
      if (error.response?.status !== 404 && error.response?.status !== 500) {
        toast.error('Failed to load stake information');
      }
      setStakeInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStakeInfo();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchStakeInfo, 30000);
    return () => clearInterval(interval);
  }, [publicKey]);

  const formatSOL = (lamports: number): string => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(9);
  };

  if (!publicKey) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="card p-6">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-[#0066FF]" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-gray-600">Loading stake information...</span>
        </div>
      </div>
    );
  }

  if (!stakeInfo || stakeInfo.depositedAmount === 0) {
    return (
      <div className="card p-6 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Your Stake & Rewards</h3>
            <p className="text-sm text-gray-600">Start staking to earn rewards</p>
          </div>
        </div>
        <div className="text-center py-4">
          <p className="text-gray-600 mb-4">You haven't staked any SOL yet.</p>
          <a
            href="/backer"
            className="inline-flex items-center px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] text-white rounded-lg font-medium transition"
          >
            Go to Stake & Earn
            <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="card p-6 bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Your Stake & Rewards</h3>
            <p className="text-sm text-gray-600">Track your staking performance</p>
          </div>
        </div>
        <button
          onClick={fetchStakeInfo}
          className="p-2 text-gray-400 hover:text-gray-600 transition rounded-lg hover:bg-white"
          title="Refresh"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Deposited Amount */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Staked</div>
          <div className="text-xl font-bold text-gray-900">
            {formatSOL(stakeInfo.depositedAmount)} SOL
          </div>
        </div>

        {/* Claimable Rewards */}
        <div className="bg-white rounded-lg p-4 border border-green-200">
          <div className="text-xs text-gray-500 mb-1">Claimable</div>
          <div className={`text-xl font-bold ${stakeInfo.claimableRewards > 0 ? 'text-green-600' : 'text-gray-500'}`}>
            {formatSOL(stakeInfo.claimableRewards)} SOL
          </div>
        </div>

        {/* Claimed Total */}
        <div className="bg-white rounded-lg p-4 border border-gray-200">
          <div className="text-xs text-gray-500 mb-1">Claimed</div>
          <div className="text-xl font-bold text-gray-700">
            {formatSOL(stakeInfo.claimedTotal)} SOL
          </div>
        </div>

        {/* Total Rewards */}
        <div className="bg-white rounded-lg p-4 border border-blue-200">
          <div className="text-xs text-gray-500 mb-1">Total Rewards</div>
          <div className="text-xl font-bold text-blue-600">
            {formatSOL(stakeInfo.totalRewards)} SOL
          </div>
        </div>
      </div>

      {stakeInfo.claimableRewards > 0 && (
        <div className="mt-4 p-4 bg-green-100 rounded-lg border border-green-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-800">
                You have {formatSOL(stakeInfo.claimableRewards)} SOL available to claim!
              </p>
              <p className="text-xs text-green-600 mt-1">
                Visit the Stake & Earn page to claim your rewards
              </p>
            </div>
            <a
              href="/backer"
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm transition whitespace-nowrap"
            >
              Claim Now
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

