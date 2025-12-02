'use client';

import { useEffect, useState } from 'react';
import { poolApi, LeaderboardEntry, LeaderboardResponse, pointsApi } from '@/lib/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { useWallet } from '@solana/wallet-adapter-react';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

interface LeaderboardWithPoints extends LeaderboardEntry {
  points: number;
}

export default function LeaderboardPage() {
  const { publicKey } = useWallet();
  const [leaderboard, setLeaderboard] = useState<LeaderboardWithPoints[]>([]);
  const [rewardPoolBalance, setRewardPoolBalance] = useState<number>(0);
  const [rewardPoolAddress, setRewardPoolAddress] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchLeaderboard = async () => {
    setIsLoading(true);
    try {
      const data: LeaderboardResponse = await poolApi.getLeaderboard();
      
      // Fetch points for each wallet
      const leaderboardWithPoints = await Promise.all(
        data.leaderboard.map(async (entry) => {
          try {
            const pointsData = await pointsApi.getPoints(entry.wallet);
            return {
              ...entry,
              points: pointsData.totalPoints,
            };
          } catch (error) {
            return {
              ...entry,
              points: 0,
            };
          }
        })
      );
      
      setLeaderboard(leaderboardWithPoints);
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
    const interval = setInterval(fetchLeaderboard, 30000);
    return () => clearInterval(interval);
  }, []);

  const formatSOL = (lamports: number): string => {
    return (lamports / LAMPORTS_PER_SOL).toFixed(9);
  };

  const formatWallet = (wallet: string): string => {
    return `${wallet.slice(0, 4)}...${wallet.slice(-4)}`;
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <span className="text-2xl">🥇</span>;
    if (rank === 2) return <span className="text-2xl">🥈</span>;
    if (rank === 3) return <span className="text-2xl">🥉</span>;
    return <span className="font-mono text-slate-500">#{rank}</span>;
  };

  const isCurrentUser = (wallet: string): boolean => {
    return publicKey?.toString() === wallet;
  };

  return (
    <div className="min-h-screen bg-[#0B0E14]">
      <main className="container-main py-8">
        
        {/* Page Header */}
        <div className="mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-200 font-mono flex items-center gap-3">
              <span className="text-emerald-500">&gt;</span> LEADERBOARD
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm">Top backers ranked by performance</p>
          </div>
          
          <div className="flex items-center gap-4">
            {lastUpdated && (
              <div className="text-xs font-mono text-slate-600 hidden md:block">
                LAST_SYNC: {lastUpdated.toLocaleTimeString()}
              </div>
            )}
            <button
              onClick={fetchLeaderboard}
              disabled={isLoading}
              className="btn-secondary text-xs px-3 py-2 flex items-center gap-2 whitespace-nowrap"
            >
              <svg className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              REFRESH
            </button>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 bg-gradient-to-br from-emerald-900/20 to-black border-emerald-500/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition">
              <svg className="w-24 h-24 text-emerald-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="relative z-10">
              <div className="text-xs font-mono text-emerald-400 uppercase mb-2 tracking-wider">Reward Pool Balance</div>
              <div className="text-3xl font-bold text-white font-mono mb-1">
                {isLoading ? '...' : formatSOL(rewardPoolBalance)} <span className="text-lg text-emerald-500">SOL</span>
              </div>
              <div className="text-[10px] font-mono text-emerald-500/50 truncate">
                ADDR: {rewardPoolAddress || 'LOADING...'}
              </div>
            </div>
          </div>

          <div className="card p-6 bg-[#151b28] border-slate-800">
            <div className="text-xs font-mono text-slate-500 uppercase mb-2 tracking-wider">Total Backers</div>
            <div className="text-3xl font-bold text-slate-200 font-mono">
              {isLoading ? '...' : leaderboard.length}
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-1">Active Participants</div>
          </div>

          <div className="card p-6 bg-[#151b28] border-slate-800">
            <div className="text-xs font-mono text-slate-500 uppercase mb-2 tracking-wider">Total Rewards Distributed</div>
            <div className="text-3xl font-bold text-blue-400 font-mono">
              {isLoading ? '...' : formatSOL(leaderboard.reduce((sum, entry) => sum + entry.claimableRewards + entry.claimedTotal, 0))} <span className="text-lg text-blue-500/50">SOL</span>
            </div>
            <div className="text-[10px] font-mono text-slate-600 mt-1">Lifetime Protocol Value</div>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="card bg-[#151b28] border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-black/40 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-mono font-medium text-slate-500 uppercase tracking-wider w-20">Rank</th>
                  <th className="px-6 py-4 text-left text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">Wallet</th>
                  <th className="px-6 py-4 text-right text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">Total Rewards</th>
                  <th className="px-6 py-4 text-right text-xs font-mono font-medium text-slate-500 uppercase tracking-wider">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {isLoading && leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <svg className="animate-spin h-8 w-8 text-emerald-500 mb-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span className="text-slate-500 font-mono text-sm">LOADING_DATA...</span>
                      </div>
                    </td>
                  </tr>
                ) : leaderboard.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 border border-slate-700">
                          <svg className="w-6 h-6 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                          </svg>
                        </div>
                        <span className="text-slate-500 font-mono text-sm">NO_DATA_FOUND</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  leaderboard.map((entry, index) => {
                    const rank = index + 1;
                    const isUser = isCurrentUser(entry.wallet);
                    return (
                      <tr 
                        key={entry.wallet} 
                        className={`group transition-colors hover:bg-white/5 ${isUser ? 'bg-emerald-900/10 border-l-2 border-emerald-500' : ''}`}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            {getRankIcon(rank)}
                            {isUser && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500 text-black">YOU</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className={`font-mono text-sm ${isUser ? 'text-emerald-400' : 'text-slate-300'}`}>
                              {formatWallet(entry.wallet)}
                            </span>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(entry.wallet);
                                toast.success('Address copied');
                              }}
                              className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-slate-300"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                            <a
                              href={`https://explorer.solana.com/address/${entry.wallet}?cluster=devnet`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="opacity-0 group-hover:opacity-100 transition text-slate-500 hover:text-emerald-400"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="font-mono text-sm text-blue-400 font-bold">
                            {formatSOL(entry.claimableRewards + entry.claimedTotal)} SOL
                          </div>
                          <div className="text-[10px] text-slate-600 font-mono">
                            (Claimable + Claimed)
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1 font-mono text-sm font-bold text-purple-400">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                            {entry.points.toFixed(3)}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
