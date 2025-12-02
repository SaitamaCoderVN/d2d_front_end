'use client';

import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { poolApi, UserStakeInfo as UserStakeInfoType } from '@/lib/api';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import toast from 'react-hot-toast';

export default function UserStakeInfo() {
  const { publicKey } = useWallet();
  const [stakeInfo, setStakeInfo] = useState<UserStakeInfoType | null>(null);
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
      if (error.response) {
        const status = error.response.status;
        if (status === 404 || status === 500) {
          setStakeInfo(null);
          return;
        }
      }
      setStakeInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStakeInfo();
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
      <div className="card p-6 bg-slate-900 border-slate-800">
        <div className="flex items-center space-x-3">
          <svg className="animate-spin h-5 w-5 text-emerald-500" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          <span className="text-slate-400 font-mono text-sm">SYNCING_STAKE_DATA...</span>
        </div>
      </div>
    );
  }

  if (!stakeInfo || stakeInfo.depositedAmount === 0) {
    return (
      <div className="card p-6 bg-slate-900 border-slate-800 border-dashed">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center border border-slate-700">
            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-300 font-mono">NO_ACTIVE_STAKE</h3>
            <p className="text-xs text-slate-500 font-mono">Start staking to earn rewards</p>
          </div>
        </div>
        <div className="text-center py-2">
          <a
            href="/backer"
            className="text-xs text-emerald-400 hover:text-emerald-300 font-mono underline"
          >
            {'>'}{'>'}{'>'} INITIALIZE_STAKE_ACCOUNT
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#111620] border border-slate-800/60 rounded-md overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-slate-800/60 bg-slate-900/20">
        <div className="flex items-center space-x-3">
          <div className="w-6 h-6 bg-emerald-500/10 rounded flex items-center justify-center border border-emerald-500/20">
            <svg className="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h3 className="text-xs font-bold text-slate-300 font-mono tracking-wider">ACTIVE_STAKE</h3>
        </div>
        <button
          onClick={fetchStakeInfo}
          className="text-slate-500 hover:text-emerald-400 transition"
          title="Refresh"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      <div className="p-4 grid grid-cols-2 gap-px bg-slate-800/30">
        <div className="bg-[#111620] p-3">
          <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Deposited</div>
          <div className="text-sm font-bold text-slate-200 font-mono">
            {formatSOL(stakeInfo.depositedAmount)}
          </div>
        </div>

        <div className="bg-[#111620] p-3">
          <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Rewards</div>
          <div className={`text-sm font-bold font-mono ${stakeInfo.claimableRewards > 0 ? 'text-emerald-400' : 'text-slate-500'}`}>
            {formatSOL(stakeInfo.claimableRewards)}
          </div>
        </div>

        <div className="bg-[#111620] p-3">
          <div className="text-[9px] text-slate-500 font-mono uppercase mb-1">Lifetime</div>
          <div className="text-sm font-bold text-purple-400 font-mono">
            {formatSOL(stakeInfo.totalRewards)}
          </div>
        </div>
        
        <div className="bg-[#111620] p-3 flex items-center justify-center">
           <div className="text-[9px] text-slate-600 font-mono">APY: Variable</div>
        </div>
      </div>

      {stakeInfo.claimableRewards > 0 && (
        <div className="p-2 bg-emerald-900/10 border-t border-emerald-500/10">
          <a
            href="/backer"
            className="block w-full py-2 text-center bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-bold font-mono rounded transition border border-emerald-500/20"
          >
            CLAIM REWARDS
          </a>
        </div>
      )}
    </div>
  );
}
