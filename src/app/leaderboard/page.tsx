'use client';

import { useEffect, useState } from 'react';
import { poolApi, LeaderboardEntry, LeaderboardResponse } from '@/lib/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton } from '@/components/WalletButton';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [rewardPoolBalance, setRewardPoolBalance] = useState<number>(0);
  const [rewardPoolAddress, setRewardPoolAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const data: LeaderboardResponse = await poolApi.getLeaderboard();
      setLeaderboard(data.leaderboard);
      setRewardPoolBalance(data.rewardPoolBalance);
      setRewardPoolAddress(data.rewardPoolAddress);
      setLastUpdated(new Date());
    } catch (error: any) {
      console.error('Failed to fetch leaderboard:', error);
      toast.error('Failed to load leaderboard');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatSOL = (lamports: number): string => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(9);
  };

  const formatWallet = (wallet: string): string => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const getRankIcon = (rank: number): string => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return `#${rank}`;
  };

  const isCurrentUser = (wallet: string): boolean => {
    return publicKey?.toString() === wallet;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="header-sticky bg-white border-b border-gray-200">
        <div className="container-main">
          <div className="flex justify-between items-center h-20">
            <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition">
              <Image src="/favicon.svg" alt="D2D" width={32} height={32} />
              <div>
                <h1 className="text-xl font-bold text-gray-900">Decentralize Deployment</h1>
                <p className="text-xs text-gray-500">Solana Program Deployment</p>
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
                className="px-4 py-2 rounded-lg text-gray-600 hover:bg-gray-100 transition font-medium text-sm"
              >
                Stake & Earn
              </Link>
              <Link
                href="/leaderboard"
                className="px-4 py-2 rounded-lg bg-[#0066FF] text-white font-medium text-sm"
              >
                🏆 Leaderboard
              </Link>
            </nav>
            
            <WalletMultiButton />
          </div>
        </div>
      </header>

      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">
                🏆 Rewards Leaderboard
              </h1>
              <p className="text-gray-600">
                Top backers ranked by claimable rewards
              </p>
            </div>
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="px-4 py-2 bg-[#0066FF] hover:bg-[#0052CC] disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg font-medium transition flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Loading...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </>
              )}
            </button>
          </div>
          {lastUpdated && (
            <p className="text-sm text-gray-500">
              Last updated: {lastUpdated.toLocaleTimeString()}
            </p>
          )}
        </div>

        {/* Leaderboard Table */}
        {isLoading && leaderboard.length === 0 ? (
          <div className="card p-8 text-center">
            <svg className="animate-spin h-12 w-12 text-[#0066FF] mx-auto mb-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-gray-600">Loading leaderboard...</p>
          </div>
        ) : leaderboard.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-gray-600">No backers found</p>
          </div>
        ) : (
          <div className="card p-0 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Rank
                    </th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Deposited
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Claimable Rewards
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Claimed
                    </th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      Total Rewards
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const isUser = isCurrentUser(entry.wallet);
                    return (
                      <tr
                        key={entry.wallet}
                        className={`hover:bg-gray-50 transition ${
                          isUser ? 'bg-blue-50 border-l-4 border-[#0066FF]' : ''
                        }`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="text-lg font-bold text-gray-900">
                              {getRankIcon(rank)}
                            </span>
                            {isUser && (
                              <span className="text-xs bg-[#0066FF] text-white px-2 py-1 rounded">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-gray-900">
                              {formatWallet(entry.wallet)}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(entry.wallet);
                                toast.success('Wallet address copied!');
                              }}
                              className="text-gray-400 hover:text-gray-600 transition"
                              title="Copy wallet address"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a
                              href={`https://explorer.solana.com/address/${entry.wallet}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#0066FF] hover:text-[#0052CC] transition"
                              title="View on Solana Explorer"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-900">
                            {formatSOL(entry.depositedAmount)} SOL
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className={`text-sm font-bold ${
                            entry.claimableRewards > 0 ? 'text-green-600' : 'text-gray-500'
                          }`}>
                            {formatSOL(entry.claimableRewards)} SOL
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-medium text-gray-600">
                            {formatSOL(entry.claimedTotal)} SOL
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <span className="text-sm font-bold text-blue-600">
                            {formatSOL(entry.claimableRewards + entry.claimedTotal)} SOL
                          </span>
                          <div className="text-xs text-gray-500 mt-1">
                            (Claimable + Claimed)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary Stats */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Reward Pool Balance - Prominent Display */}
          <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 border-2 border-green-200">
            <div className="flex items-center space-x-2 mb-2">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="text-sm font-semibold text-green-700">Reward Pool Balance</div>
            </div>
            {isLoading ? (
              <div className="text-2xl font-bold text-gray-500">Loading...</div>
            ) : (
              <div className="text-3xl font-bold text-green-700">
                {formatSOL(rewardPoolBalance)} SOL
              </div>
            )}
            {rewardPoolAddress && (
              <div className="mt-2 text-xs text-green-600 font-mono">
                {rewardPoolAddress.slice(0, 8)}...{rewardPoolAddress.slice(-8)}
              </div>
            )}
          </div>

          {leaderboard.length > 0 && (
            <>
              <div className="card p-6">
                <div className="text-sm text-gray-600 mb-1">Total Backers</div>
                <div className="text-2xl font-bold text-gray-900">{leaderboard.length}</div>
              </div>
              <div className="card p-6">
                <div className="text-sm text-gray-600 mb-1">Total Claimable</div>
                <div className="text-2xl font-bold text-green-600">
                  {formatSOL(
                    leaderboard.reduce((sum, entry) => sum + entry.claimableRewards, 0)
                  )} SOL
                </div>
              </div>
              <div className="card p-6">
                <div className="text-sm text-gray-600 mb-1">Total Deposited</div>
                <div className="text-2xl font-bold text-gray-900">
                  {formatSOL(
                    leaderboard.reduce((sum, entry) => sum + entry.depositedAmount, 0)
                  )} SOL
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
}

